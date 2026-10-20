// Banco de pruebas sintético del rastreador LK del mástil (sin navegador).
// Renderiza una guitarra procedural (trastes, cuerdas, incrustaciones, clavijero, cuerpo) sobre un fondo
// texturizado, con pose de referencia exacta, y mide el error de anchorA (cejuela) y anchorB (traste 12).
//
//   npx tsx scripts/guitar-tracker-lk-bench.ts                 # escenarios horizontal y vertical, recuperación
//                                                               # tras sacudida 3x y calibración por trastes
//   npx tsx scripts/guitar-tracker-lk-bench.ts --y4m out.y4m   # exporta el escenario como cámara falsa
//                                                               # (chrome --use-file-for-fake-video-capture)
//        [--portrait] [--truth verdad.json]                     # 480x960 vertical + pose real por fotograma
//   --ladder-only  solo la calibración por escalera de trastes
//   --seed N    otra textura de fondo/guitarra
//   --shake K   multiplica la amplitud de la sacudida (prueba de estrés; K=1 es la línea de tiempo normal)

import { closeSync, openSync, writeFileSync, writeSync } from 'node:fs';
import { LucasKanadeNeckTracker, estimateNeckAxis, fitVerticalFretLadder } from '../src/lib/guitarTracker/visionArEngine';

interface Pose {
  ax: number;
  ay: number;
  theta: number;
  s: number; // px por unidad |cejuela→traste 12| a la altura de la cejuela
  k: number; // perspectiva a lo largo del mástil (profundidad = 1 + k·u)
}

interface Frame {
  pose: Pose;
  handU: number; // < -1 => sin mano
  handPhase: number;
  gain: number;
  bias: number;
  torsoDx: number;
  torsoDy: number;
}

const END_U = 1.5; // traste 24 en unidades |AB|
const TEX_PX_PER_UNIT = 420;
const TEX_U0 = -0.5;
const TEX_U1 = 1.8;
const TEX_V = 0.38;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function smoothNoise(w: number, h: number, cell: number, rand: () => number): Float32Array {
  const gw = Math.ceil(w / cell) + 2;
  const gh = Math.ceil(h / cell) + 2;
  const grid = new Float32Array(gw * gh);
  for (let i = 0; i < grid.length; i++) grid[i] = rand();
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const gy = y / cell;
    const iy = Math.floor(gy);
    const fy = gy - iy;
    const sy = fy * fy * (3 - 2 * fy);
    for (let x = 0; x < w; x++) {
      const gx = x / cell;
      const ix = Math.floor(gx);
      const fx = gx - ix;
      const sx = fx * fx * (3 - 2 * fx);
      const a = grid[iy * gw + ix];
      const b = grid[iy * gw + ix + 1];
      const c = grid[(iy + 1) * gw + ix];
      const d = grid[(iy + 1) * gw + ix + 1];
      out[y * w + x] = (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
    }
  }
  return out;
}

class GuitarTexture {
  readonly w: number;
  readonly h: number;
  readonly rgba: Float32Array;

  constructor(seed: number) {
    const rand = mulberry32(seed);
    this.w = Math.round((TEX_U1 - TEX_U0) * TEX_PX_PER_UNIT);
    this.h = Math.round(2 * TEX_V * TEX_PX_PER_UNIT);
    this.rgba = new Float32Array(this.w * this.h * 4);
    const grainFine = smoothNoise(this.w, this.h, 3, rand);
    const grainLong = smoothNoise(this.w, this.h, 14, rand);
    const fretU: number[] = [];
    for (let f = 1; f <= 24; f++) fretU.push(2 * (1 - Math.pow(2, -f / 12)));
    const inlays = [3, 5, 7, 9, 12, 15, 17, 19, 21, 24];

    for (let ty = 0; ty < this.h; ty++) {
      const v = (ty + 0.5) / TEX_PX_PER_UNIT - TEX_V;
      for (let tx = 0; tx < this.w; tx++) {
        const u = (tx + 0.5) / TEX_PX_PER_UNIT + TEX_U0;
        const k = ty * this.w + tx;
        const gFine = grainFine[k] - 0.5;
        const gLong = grainLong[Math.min(this.h - 1, Math.floor(ty * 0.25)) * this.w + tx] - 0.5;
        let r = 0, g = 0, b = 0, a = 0;
        const hw = 0.072 + (0.092 - 0.072) * Math.min(1, Math.max(0, u / END_U));

        if (u >= -0.45 && u < -0.035 && Math.abs(v) <= 0.085 + 0.05 * Math.min(1, -u / 0.3)) {
          const tone = 150 + 30 * gLong + 12 * gFine;
          r = tone; g = tone * 0.72; b = tone * 0.45; a = 1;
          for (const pu of [-0.13, -0.23, -0.33]) {
            for (const pv of [-0.075, 0.075]) {
              const dist = Math.hypot(u - pu, v - pv);
              if (dist < 0.024) {
                const metal = dist < 0.01 ? 70 : 215 - dist * 1500;
                r = g = b = metal; a = 1;
              }
            }
          }
        } else if (u >= -0.035 && u < 0 && Math.abs(v) <= hw + 0.004) {
          r = 236; g = 230; b = 214; a = 1;
        } else if (u >= 0 && u <= END_U + 0.02 && Math.abs(v) <= hw) {
          const tone = 68 + 26 * gLong + 18 * gFine;
          r = tone; g = tone * 0.66; b = tone * 0.45; a = 1;
          if (Math.abs(v) > hw - 0.006) {
            r = 205; g = 195; b = 165;
          }
          for (const f of inlays) {
            const uc = 0.5 * (fretU[f - 1] + (f > 1 ? fretU[f - 2] : 0));
            const offsets = f === 12 || f === 24 ? [-0.038, 0.038] : [0];
            for (const vo of offsets) {
              if (Math.hypot(u - uc, v - vo) < 0.017) {
                r = 232; g = 232; b = 222;
              }
            }
          }
          for (const fu of fretU) {
            const du = Math.abs(u - fu);
            if (du < 0.0055) {
              const shine = 215 - (du / 0.0055) * 50;
              r = shine; g = shine; b = shine * 0.95;
            }
          }
        } else if (u > END_U && Math.abs(v) <= Math.min(TEX_V, 0.13 + 0.7 * (u - END_U))) {
          const tone = 150 + 30 * gLong + 8 * gFine;
          r = tone * 1.1; g = tone * 0.22; b = tone * 0.2; a = 1;
          if (u > 1.6 && u < 1.69 && Math.abs(v) < 0.085) {
            r = g = b = 22;
            for (let p = 0; p < 6; p++) {
              const pv = -0.065 + p * 0.026;
              if (Math.hypot(u - 1.645, v - pv) < 0.008) r = g = b = 190;
            }
          }
        }

        if (a > 0 && u >= -0.33 && u <= 1.75) {
          const span = (u < 0 ? 0.072 : hw) * 0.84;
          for (let s = 0; s < 6; s++) {
            const sv = -span + (s * 2 * span) / 5;
            const thick = 0.0028 + (5 - s) * 0.0006;
            if (Math.abs(v - sv) < thick) {
              const shine = 205 - (Math.abs(v - sv) / thick) * 60;
              r = shine; g = shine * 0.97; b = shine * 0.9;
            }
          }
        }

        const o = k * 4;
        this.rgba[o] = r;
        this.rgba[o + 1] = g;
        this.rgba[o + 2] = b;
        this.rgba[o + 3] = a;
      }
    }
  }

  sample(u: number, v: number, out: Float32Array): boolean {
    const fx = (u - TEX_U0) * TEX_PX_PER_UNIT - 0.5;
    const fy = (v + TEX_V) * TEX_PX_PER_UNIT - 0.5;
    if (fx < 0 || fy < 0 || fx >= this.w - 1 || fy >= this.h - 1) return false;
    const ix = Math.floor(fx);
    const iy = Math.floor(fy);
    const ax = fx - ix;
    const ay = fy - iy;
    const i00 = (iy * this.w + ix) * 4;
    const i10 = i00 + 4;
    const i01 = i00 + this.w * 4;
    const i11 = i01 + 4;
    const t = this.rgba;
    const w00 = (1 - ax) * (1 - ay), w10 = ax * (1 - ay), w01 = (1 - ax) * ay, w11 = ax * ay;
    for (let c = 0; c < 4; c++) {
      out[c] = t[i00 + c] * w00 + t[i10 + c] * w10 + t[i01 + c] * w01 + t[i11 + c] * w11;
    }
    return out[3] > 0.001;
  }
}

class SyntheticScene {
  readonly width: number;
  readonly height: number;
  private readonly tex: GuitarTexture;
  private readonly bg: Float32Array;
  private readonly torso: Float32Array;
  private readonly noiseRand: () => number;
  private readonly sampleBuf = new Float32Array(4);

  constructor(width: number, height: number, seed: number) {
    this.width = width;
    this.height = height;
    this.tex = new GuitarTexture(seed);
    const rand = mulberry32(seed * 7 + 1);
    this.noiseRand = mulberry32(seed * 13 + 5);
    const big = smoothNoise(width, height, Math.max(8, Math.round(width / 9)), rand);
    const mid = smoothNoise(width, height, Math.max(3, Math.round(width / 45)), rand);
    this.bg = new Float32Array(width * height * 3);
    for (let i = 0; i < width * height; i++) {
      const base = 95 + 80 * big[i] + 25 * (mid[i] - 0.5);
      this.bg[i * 3] = base * 1.02;
      this.bg[i * 3 + 1] = base * 0.98;
      this.bg[i * 3 + 2] = base * 0.92;
    }
    for (let p = 0; p < 7; p++) {
      const x0 = Math.floor(rand() * width * 0.9);
      const y0 = Math.floor(rand() * height * 0.9);
      const pw = Math.floor(width * (0.06 + rand() * 0.12));
      const ph = Math.floor(height * (0.08 + rand() * 0.15));
      const col = [60 + rand() * 170, 60 + rand() * 170, 60 + rand() * 170];
      for (let y = y0; y < Math.min(height, y0 + ph); y++) {
        for (let x = x0; x < Math.min(width, x0 + pw); x++) {
          const i = (y * width + x) * 3;
          const edge = x === x0 || y === y0 || x === x0 + pw - 1 || y === y0 + ph - 1;
          this.bg[i] = edge ? 240 : col[0];
          this.bg[i + 1] = edge ? 240 : col[1];
          this.bg[i + 2] = edge ? 240 : col[2];
        }
      }
    }
    this.torso = smoothNoise(width, height, Math.max(4, Math.round(width / 30)), rand);
  }

  /** Renderiza RGB (o luma si rgbOut es null) con supermuestreo ss×ss */
  render(frame: Frame, ss: number, lumaOut: Float32Array | null, rgbOut: Uint8Array | null) {
    const { width: W, height: H } = this;
    const { pose, handU, handPhase, gain, bias, torsoDx, torsoDy } = frame;
    const cosT = Math.cos(pose.theta);
    const sinT = Math.sin(pose.theta);
    const samp = this.sampleBuf;
    const torsoCx = W * 0.55 + torsoDx;
    const torsoCy = H * 0.75 + torsoDy;
    const torsoRx = W * 0.32;
    const torsoRy = H * 0.55;
    const inv = 1 / (ss * ss);

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        let r = 0, g = 0, b = 0;
        for (let sy = 0; sy < ss; sy++) {
          for (let sx = 0; sx < ss; sx++) {
            const px = x + (sx + 0.5) / ss;
            const py = y + (sy + 0.5) / ss;
            const bi = (y * W + x) * 3;
            let cr = this.bg[bi], cg = this.bg[bi + 1], cb = this.bg[bi + 2];

            const tx = (px - torsoCx) / torsoRx;
            const ty = (py - torsoCy) / torsoRy;
            if (tx * tx + ty * ty < 1) {
              const tIdx = Math.min(H - 1, Math.max(0, Math.floor(py - torsoDy))) * W +
                Math.min(W - 1, Math.max(0, Math.floor(px - torsoDx)));
              const fold = this.torso[tIdx];
              cr = 35 + 40 * fold; cg = 50 + 45 * fold; cb = 80 + 50 * fold;
            }

            const qx = cosT * (px - pose.ax) + sinT * (py - pose.ay);
            const qy = -sinT * (px - pose.ax) + cosT * (py - pose.ay);
            const den = pose.s - pose.k * qx;
            if (den > 1e-3) {
              const u = qx / den;
              const v = (qy * (1 + pose.k * u)) / pose.s;
              let handHit = false;
              if (handU > -1) {
                const hu = (u - handU) / 0.11;
                const hv = (v + 0.02) / 0.15;
                if (hu * hu + hv * hv < 1) {
                  handHit = true;
                  const stripe = Math.sin((u - handU + handPhase) * 2 * Math.PI / 0.034);
                  const tone = stripe > 0.75 ? 120 : 200 + 15 * stripe;
                  cr = tone; cg = tone * 0.74; cb = tone * 0.6;
                }
              }
              if (!handHit && this.tex.sample(u, v, samp)) {
                const a = samp[3];
                cr = cr * (1 - a) + samp[0] * a;
                cg = cg * (1 - a) + samp[1] * a;
                cb = cb * (1 - a) + samp[2] * a;
              }
            }
            r += cr; g += cg; b += cb;
          }
        }
        r = r * inv * gain + bias;
        g = g * inv * gain + bias;
        b = b * inv * gain + bias;
        const n = (this.noiseRand() + this.noiseRand() + this.noiseRand() - 1.5) * 3.2;
        if (lumaOut) {
          const l = (77 * r + 150 * g + 29 * b) / 256 + n;
          lumaOut[y * W + x] = Math.round(Math.max(0, Math.min(255, l)));
        }
        if (rgbOut) {
          const o = (y * W + x) * 3;
          rgbOut[o] = Math.max(0, Math.min(255, r + n));
          rgbOut[o + 1] = Math.max(0, Math.min(255, g + n));
          rgbOut[o + 2] = Math.max(0, Math.min(255, b + n));
        }
      }
    }
  }
}

function ease(t: number) {
  return t <= 0 ? 0 : t >= 1 ? 1 : 0.5 - 0.5 * Math.cos(Math.PI * t);
}

/** Línea de tiempo: estático → rotación → escala/perspectiva → mano tapando la cejuela → sacudida → exposición */
function buildTimeline(
  width: number, height: number, vertical: boolean, frames: number, nutY = 0.13, shake = SHAKE
): Frame[] {
  const unit = Math.min(width, height) / 225;
  const base: Pose = vertical
    ? { ax: width * 0.5, ay: height * nutY, theta: Math.PI / 2, s: 165 * unit * (225 / 300), k: 0 }
    : { ax: width * 0.17, ay: height * 0.58, theta: -0.14, s: 165 * unit, k: 0 };
  const key = (f: number, dx: number, dy: number, dDeg: number, sMul: number, k: number) => ({
    f,
    pose: { ax: base.ax + dx * unit, ay: base.ay + dy * unit, theta: base.theta + (dDeg * Math.PI) / 180, s: base.s * sMul, k },
  });
  const keys = [
    key(0, 0, 0, 0, 1, 0),
    key(50, 0, 0, 0, 1, 0),
    key(110, 25, -12, 34, 0.97, 0),
    key(170, -10, 10, -14, 0.92, 0),
    key(240, 10, -6, 4, 0.76, 0.25),
    key(300, -8, 6, -6, 1.12, -0.12),
    key(350, 0, 0, 0, 1, 0),
    key(450, 14, -8, 10, 0.95, 0.1),
    key(540, 0, 0, 0, 1, 0),
    key(frames, 0, 0, 0, 1, 0),
  ];

  const out: Frame[] = [];
  const rand = mulberry32(99);
  let handPhase = 0;
  for (let f = 0; f < frames; f++) {
    let i = 0;
    while (i < keys.length - 2 && f >= keys[i + 1].f) i++;
    const k0 = keys[i];
    const k1 = keys[i + 1];
    const t = ease((f - k0.f) / Math.max(1, k1.f - k0.f));
    const lerp = (a: number, b: number) => a + (b - a) * t;
    const pose: Pose = {
      ax: lerp(k0.pose.ax, k1.pose.ax),
      ay: lerp(k0.pose.ay, k1.pose.ay),
      theta: lerp(k0.pose.theta, k1.pose.theta),
      s: lerp(k0.pose.s, k1.pose.s),
      k: lerp(k0.pose.k, k1.pose.k),
    };

    if (f >= 455 && f < 515) {
      const ts = (f - 455) / 30;
      const env = shake * Math.sin((Math.PI * (f - 455)) / 60);
      pose.ax += 18 * unit * env * Math.sin(2 * Math.PI * 2.5 * ts);
      pose.ay += 9 * unit * env * Math.sin(2 * Math.PI * 1.7 * ts + 0.6);
      pose.theta += ((6 * Math.PI) / 180) * env * Math.sin(2 * Math.PI * 2.0 * ts);
    }

    let handU = -2;
    if (f >= 355 && f < 455) {
      handU = 0.24 + 0.1 * Math.sin((2 * Math.PI * (f - 355)) / 45);
      handPhase += (rand() - 0.5) * 0.012;
    }

    let gain = 1;
    let bias = 0;
    if (f >= 520) {
      const e = Math.sin((Math.PI * (f - 520)) / Math.max(1, frames - 520));
      gain = 1 + 0.3 * e;
      bias = -18 * e;
    }

    const torsoDx = (pose.ax - base.ax) * 0.35;
    const torsoDy = (pose.ay - base.ay) * 0.35;
    out.push({ pose, handU, handPhase, gain, bias, torsoDx, torsoDy });
  }
  return out;
}

function anchorsOf(p: Pose) {
  const c = Math.cos(p.theta);
  const s = Math.sin(p.theta);
  const proj = (u: number) => {
    const along = (p.s * u) / (1 + p.k * u);
    return { x: p.ax + c * along, y: p.ay + s * along };
  };
  return { a: proj(0), b: proj(1), end: proj(END_U) };
}

function percentile(values: number[], q: number) {
  const sorted = [...values].sort((x, y) => x - y);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
}

function runScenario(name: string, width: number, height: number, vertical: boolean, shake = SHAKE) {
  const frames = 600;
  const scene = new SyntheticScene(width, height, SEED);
  const timeline = buildTimeline(width, height, vertical, frames, undefined, shake);
  const tracker = new LucasKanadeNeckTracker();
  tracker.resize(width, height);
  tracker.endU = END_U;

  const errA: number[] = [];
  const errB: number[] = [];
  const errEnd: number[] = [];
  const segments: Record<string, number[]> = {};
  let lostFrames = 0;
  let trackMs = 0;

  for (let f = 0; f < frames; f++) {
    const frame = timeline[f];
    const gray = tracker.beginFrame();
    scene.render(frame, 2, gray, null);
    const t0 = performance.now();
    tracker.commitFrame();
    const truth = anchorsOf(frame.pose);
    if (f === 0) {
      tracker.setPose(truth.a, truth.b);
      tracker.lock();
    } else {
      const relocBefore = tracker.relocalizations;
      if (!tracker.track()) lostFrames++;
      if (TRACE && tracker.relocalizations !== relocBefore) {
        console.log(`  f${f} relocalizado: eA ${Math.hypot(tracker.anchorA.x - truth.a.x, tracker.anchorA.y - truth.a.y).toFixed(2)} ` +
          `eB ${Math.hypot(tracker.anchorB.x - truth.b.x, tracker.anchorB.y - truth.b.y).toFixed(2)}`);
      }
    }
    trackMs += performance.now() - t0;

    const A = tracker.anchorA;
    const B = tracker.anchorB;
    const eA = Math.hypot(A.x - truth.a.x, A.y - truth.a.y);
    const eB = Math.hypot(B.x - truth.b.x, B.y - truth.b.y);
    const endX = A.x + (B.x - A.x) * END_U;
    const endY = A.y + (B.y - A.y) * END_U;
    const eEnd = Math.hypot(endX - truth.end.x, endY - truth.end.y);
    errA.push(eA);
    errB.push(eB);
    errEnd.push(eEnd);
    const seg =
      f < 50 ? 'estático' : f < 170 ? 'rotación' : f < 350 ? 'escala+persp' :
      f < 455 ? 'mano/cejuela' : f < 515 ? 'sacudida' : 'exposición';
    (segments[seg] ??= []).push(Math.max(eA, eB));
    if (TRACE && (f % 10 === 0 || (f >= 455 && f < 520))) {
      console.log(
        `  f${String(f).padStart(3)} ${seg.padEnd(13)} eA ${eA.toFixed(2)} eB ${eB.toFixed(2)} ` +
        `inl ${tracker.inliersA}/${tracker.inliersB} conf ${tracker.confidence.toFixed(2)}`
      );
    }
  }

  const dAB = Math.hypot(anchorsOf(timeline[0].pose).b.x - anchorsOf(timeline[0].pose).a.x,
    anchorsOf(timeline[0].pose).b.y - anchorsOf(timeline[0].pose).a.y);
  const fmt = (v: number) => v.toFixed(2).padStart(6);
  console.log(`\n=== ${name} (${width}x${height}, |AB|≈${dAB.toFixed(0)} px) ===`);
  console.log(`  anchorA  media ${fmt(errA.reduce((s, v) => s + v, 0) / frames)}  p95 ${fmt(percentile(errA, 0.95))}  máx ${fmt(Math.max(...errA))} px`);
  console.log(`  anchorB  media ${fmt(errB.reduce((s, v) => s + v, 0) / frames)}  p95 ${fmt(percentile(errB, 0.95))}  máx ${fmt(Math.max(...errB))} px`);
  console.log(`  traste24 media ${fmt(errEnd.reduce((s, v) => s + v, 0) / frames)}  p95 ${fmt(percentile(errEnd, 0.95))}  máx ${fmt(Math.max(...errEnd))} px`);
  for (const [seg, vals] of Object.entries(segments)) {
    console.log(`  ${seg.padEnd(13)} máx(A,B) media ${fmt(vals.reduce((s, v) => s + v, 0) / vals.length)}  máx ${fmt(Math.max(...vals))} px`);
  }
  console.log(
    `  fotogramas sin consenso: ${lostFrames}/${frames - 1}   relocalizaciones: ${tracker.relocalizations}   ` +
    `correcciones de pose: ${tracker.poseCorrections}   ` +
    `coste medio pirámide+LK: ${(trackMs / frames).toFixed(2)} ms/fotograma`
  );
  // Tras la sacudida (que termina en el fotograma 515) el mástil debe estar recuperado
  const settledMax = Math.max(...errA.slice(540).map((v, i) => Math.max(v, errB[540 + i])));
  return { maxA: Math.max(...errA), maxB: Math.max(...errB), dAB, lostFrames, settledMax };
}

/** Calibración vertical: la escalera de trastes debe dar la cejuela y el traste 12 reales */
function runLadderCheck(width: number, height: number) {
  const scene = new SyntheticScene(width, height, SEED);
  const gray = new Float32Array(width * height);
  const unit = Math.min(width, height) / 225;
  const baseS = 165 * unit * (225 / 300);
  const cases: { name: string; pose: Pose; handU: number }[] = [];
  for (const sMul of [0.7, 1, 1.2]) {
    for (const nutY of [0.06, 0.13, 0.22]) {
      cases.push({
        name: `escala ${sMul.toFixed(2)} cejuela ${Math.round(nutY * 100)}%`,
        pose: { ax: width * 0.5, ay: height * nutY, theta: Math.PI / 2, s: baseS * sMul, k: 0 },
        handU: -2,
      });
    }
  }
  cases.push({ name: 'mano en trastes 2-5', pose: { ax: width * 0.5, ay: height * 0.13, theta: Math.PI / 2, s: baseS, k: 0 }, handU: 0.3 });
  cases.push({ name: 'mano en traste 7', pose: { ax: width * 0.5, ay: height * 0.13, theta: Math.PI / 2, s: baseS, k: 0 }, handU: 0.62 });
  cases.push({ name: 'cejuela abajo', pose: { ax: width * 0.5, ay: height * 0.9, theta: -Math.PI / 2, s: baseS, k: 0 }, handU: -2 });
  cases.push({ name: 'cejuela fuera de cuadro', pose: { ax: width * 0.5, ay: -height * 0.04, theta: Math.PI / 2, s: baseS * 1.1, k: 0 }, handU: -2 });
  for (const deg of [-8, -4, 4, 8]) {
    const theta = Math.PI / 2 + (deg * Math.PI) / 180;
    cases.push({ name: `inclinado ${deg > 0 ? '+' : ''}${deg}°`, pose: { ax: width * 0.5, ay: height * 0.13, theta, s: baseS, k: 0 }, handU: -2 });
  }
  cases.push({ name: 'inclinado +4° mano trastes 2-5', pose: { ax: width * 0.5, ay: height * 0.13, theta: Math.PI / 2 + (4 * Math.PI) / 180, s: baseS, k: 0 }, handU: 0.3 });

  // Mismo camino que detectVerticalNeck al fijar: eje (inclinación + centro) y escalera a lo largo del eje
  const topRow = Math.floor(height * 0.14);
  const bottomRow = Math.floor(height * 0.86);
  console.log(`\n=== Calibración vertical: eje + escalera de trastes (${width}x${height}) ===`);
  let worst = 0;
  let failures = 0;
  let fitMs = 0;
  for (const cs of cases) {
    scene.render({ pose: cs.pose, handU: cs.handU, handPhase: 0, gain: 1, bias: 0, torsoDx: 0, torsoDy: 0 }, 2, gray, null);
    const truth = anchorsOf(cs.pose);
    // Columnas que daría el perfil vertical del detector (bordes en la fila central, con ~1-2 px de error)
    const yMid = 0.5 * (topRow + bottomRow);
    const truthSlope = (truth.b.x - truth.a.x) / (truth.b.y - truth.a.y);
    const xMid = truth.a.x + (yMid - truth.a.y) * truthSlope;
    const hw = 0.08 * cs.pose.s;
    const t0 = performance.now();
    const axis = estimateNeckAxis(gray, width, height, xMid - hw + 1.5, xMid + hw - 1, topRow, bottomRow);
    const fit = axis
      ? fitVerticalFretLadder(gray, width, height, axis.cx - axis.halfWidth, axis.cx + axis.halfWidth, 24, axis.slope, axis.yRef)
      : null;
    fitMs = Math.max(fitMs, performance.now() - t0);
    if (!axis || !fit) {
      failures++;
      console.log(`  ${cs.name.padEnd(30)} ${axis ? 'sin escalera' : 'sin eje'}`);
      continue;
    }
    // Índice de píxel → coordenada continua, como hace el motor al fijar la pose
    const at = (y: number) => ({ x: axis.cx + (y - axis.yRef) * axis.slope + 0.5, y: y + 0.5 });
    const nut = at(fit.nutY);
    const f12 = at(fit.fret12Y);
    const eNut = Math.hypot(nut.x - truth.a.x, nut.y - truth.a.y);
    const e12 = Math.hypot(f12.x - truth.b.x, f12.y - truth.b.y);
    const tiltErr = (Math.abs(Math.atan(axis.slope) - Math.atan(truthSlope)) * 180) / Math.PI;
    worst = Math.max(worst, eNut / cs.pose.s, e12 / cs.pose.s);
    console.log(
      `  ${cs.name.padEnd(30)} cejuela ${eNut.toFixed(2).padStart(5)} px  traste12 ${e12.toFixed(2).padStart(5)} px  ` +
      `inclinación ±${tiltErr.toFixed(2)}°  (${fit.matchedFrets} trastes, rms ${fit.rms.toFixed(2)}, ${fit.nutAtTop ? 'arriba' : 'abajo'})`
    );
  }
  console.log(`  coste máximo del ajuste: ${fitMs.toFixed(1)} ms/fotograma`);
  return { worst, failures };
}

/** Código de barras de 10 bits (índice de fotograma) para sincronizar la verdad con lo que procesa el navegador */
const BARCODE_BITS = 10;
const BARCODE_CELL = 14;

function barcodeLayout(width: number, height: number, portrait: boolean) {
  // Chrome recorta al centro el vídeo de la cámara falsa hasta el alto ideal pedido (720) y el canvas
  // vuelve a recortar: el código va dentro de la zona que sigue visible
  const y0 = portrait ? Math.round(height * 0.78) : height - 2 * BARCODE_CELL;
  return { x0: 10, y0, cell: BARCODE_CELL, bits: BARCODE_BITS };
}

function drawBarcode(rgb: Uint8Array, width: number, height: number, portrait: boolean, value: number) {
  const { x0, y0, cell, bits } = barcodeLayout(width, height, portrait);
  for (let b = 0; b < bits; b++) {
    const on = (value >> b) & 1;
    const bx = x0 + b * cell;
    for (let y = y0; y < y0 + cell - 2; y++) {
      for (let x = bx; x < bx + cell - 2; x++) {
        const o = (y * width + x) * 3;
        rgb[o] = rgb[o + 1] = rgb[o + 2] = on ? 255 : 0;
      }
    }
  }
}

function exportY4m(path: string, width: number, height: number, portrait: boolean, truthPath: string | null) {
  const frames = 600;
  const scene = new SyntheticScene(width, height, SEED);
  const timeline = buildTimeline(width, height, portrait, frames, 0.2);
  if (truthPath) {
    const truth = timeline.map((fr) => {
      const t = anchorsOf(fr.pose);
      return [t.a.x, t.a.y, t.b.x, t.b.y].map((v) => Math.round(v * 100) / 100);
    });
    writeFileSync(
      truthPath,
      JSON.stringify({ width, height, barcode: barcodeLayout(width, height, portrait), frames: truth })
    );
    console.log(`Verdad por fotograma escrita en ${truthPath}`);
  }
  const rgb = new Uint8Array(width * height * 3);
  const yPlane = new Uint8Array(width * height);
  const cw = width >> 1;
  const ch = height >> 1;
  const uPlane = new Uint8Array(cw * ch);
  const vPlane = new Uint8Array(cw * ch);
  const fd = openSync(path, 'w');
  writeSync(fd, `YUV4MPEG2 W${width} H${height} F30:1 Ip A1:1 C420jpeg\n`);
  for (let f = 0; f < frames; f++) {
    scene.render(timeline[f], 1, null, rgb);
    drawBarcode(rgb, width, height, portrait, f);
    for (let i = 0; i < width * height; i++) {
      const r = rgb[i * 3], g = rgb[i * 3 + 1], b = rgb[i * 3 + 2];
      yPlane[i] = Math.max(0, Math.min(255, Math.round(0.299 * r + 0.587 * g + 0.114 * b)));
    }
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        const i = (2 * y * width + 2 * x) * 3;
        const r = rgb[i], g = rgb[i + 1], b = rgb[i + 2];
        uPlane[y * cw + x] = Math.max(0, Math.min(255, Math.round(128 - 0.168736 * r - 0.331264 * g + 0.5 * b)));
        vPlane[y * cw + x] = Math.max(0, Math.min(255, Math.round(128 + 0.5 * r - 0.418688 * g - 0.081312 * b)));
      }
    }
    writeSync(fd, 'FRAME\n');
    writeSync(fd, yPlane);
    writeSync(fd, uPlane);
    writeSync(fd, vPlane);
    if (f % 100 === 0) console.log(`  y4m: fotograma ${f}/${frames}`);
  }
  closeSync(fd);
  console.log(`Video sintético escrito en ${path}`);
}

const args = process.argv.slice(2);
const TRACE = args.includes('--trace');
const seedIdx = args.indexOf('--seed');
const SEED = seedIdx >= 0 ? Number(args[seedIdx + 1]) || 7 : 7;
const shakeIdx = args.indexOf('--shake');
const SHAKE = shakeIdx >= 0 ? Number(args[shakeIdx + 1]) || 1 : 1;
const y4mIdx = args.indexOf('--y4m');
const truthIdx = args.indexOf('--truth');
if (y4mIdx >= 0) {
  const portrait = args.includes('--portrait');
  exportY4m(
    args[y4mIdx + 1] ?? 'guitar-synthetic.y4m',
    portrait ? 480 : 960,
    portrait ? 960 : 540,
    portrait,
    truthIdx >= 0 ? args[truthIdx + 1] ?? 'guitar-synthetic-truth.json' : null
  );
} else if (args.includes('--ladder-only')) {
  runLadderCheck(318, 400);
  runLadderCheck(284, 400);
} else {
  const results = [
    runScenario('Horizontal (PC / celular apaisado)', 400, 225, false),
    runScenario('Vertical (celular en retrato)', 318, 400, true),
  ];
  // Sacudida 3x: se pierde el consenso a propósito; hay que relocalizar y quedar bien al terminar
  const violent = [
    runScenario('Recuperación tras sacudida 3x (horizontal)', 400, 225, false, 3),
    runScenario('Recuperación tras sacudida 3x (vertical)', 318, 400, true, 3),
  ];
  const ladders = [runLadderCheck(318, 400), runLadderCheck(284, 400)];
  const worst = Math.max(...results.map((r) => Math.max(r.maxA, r.maxB) / r.dAB));
  const worstSettled = Math.max(...violent.map((r) => r.settledMax / r.dAB));
  const worstLadder = Math.max(...ladders.map((l) => l.worst));
  const ladderFailures = ladders.reduce((s, l) => s + l.failures, 0);
  console.log(`\nPeor error relativo a |AB|: ${(worst * 100).toFixed(2)}%`);
  console.log(`Tras sacudida 3x: peor error final ${(worstSettled * 100).toFixed(2)}% de |AB|`);
  console.log(`Calibración por trastes: peor error ${(worstLadder * 100).toFixed(2)}% de |AB|, ${ladderFailures} sin ajuste`);
  if (worst > 0.05 || worstSettled > 0.03 || worstLadder > 0.03 || ladderFailures > 0) {
    console.error(
      'FALLO: tracking > 5% de |AB|, sin recuperación tras sacudida 3x (> 3%), calibración > 3% de |AB| ' +
      'o calibración sin ajuste'
    );
    process.exit(1);
  }
}
