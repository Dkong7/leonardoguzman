// Banco de pruebas sintético del rastreador LK del mástil (sin navegador).
// Renderiza una guitarra procedural (trastes, cuerdas, incrustaciones, clavijero, cuerpo) sobre un fondo
// texturizado, con pose de referencia exacta, y mide el error de anchorA (cejuela) y anchorB (traste 12).
//
//   npx tsx scripts/guitar-tracker-lk-bench.ts                 # escenarios horizontal y vertical
//   npx tsx scripts/guitar-tracker-lk-bench.ts --y4m out.y4m   # exporta el escenario como cámara falsa
//                                                               # (chrome --use-file-for-fake-video-capture)

import { closeSync, openSync, writeSync } from 'node:fs';
import { LucasKanadeNeckTracker } from '../src/lib/guitarTracker/visionArEngine';

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
function buildTimeline(width: number, height: number, vertical: boolean, frames: number): Frame[] {
  const unit = Math.min(width, height) / 225;
  const base: Pose = vertical
    ? { ax: width * 0.5, ay: height * 0.13, theta: Math.PI / 2, s: 165 * unit * (225 / 300), k: 0 }
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
      const env = Math.sin((Math.PI * (f - 455)) / 60);
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

function runScenario(name: string, width: number, height: number, vertical: boolean) {
  const frames = 600;
  const scene = new SyntheticScene(width, height, SEED);
  const timeline = buildTimeline(width, height, vertical, frames);
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
      if (!tracker.track()) lostFrames++;
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
    if (TRACE && f % 10 === 0) {
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
  console.log(`  fotogramas sin consenso: ${lostFrames}/${frames - 1}   coste medio pirámide+LK: ${(trackMs / frames).toFixed(2)} ms/fotograma`);
  return { maxA: Math.max(...errA), maxB: Math.max(...errB), dAB, lostFrames };
}

function exportY4m(path: string, width: number, height: number) {
  const frames = 600;
  const scene = new SyntheticScene(width, height, SEED);
  const timeline = buildTimeline(width, height, false, frames);
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
const y4mIdx = args.indexOf('--y4m');
if (y4mIdx >= 0) {
  exportY4m(args[y4mIdx + 1] ?? 'guitar-synthetic.y4m', 960, 540);
} else {
  const results = [
    runScenario('Horizontal (PC / celular apaisado)', 400, 225, false),
    runScenario('Vertical (celular en retrato)', 318, 400, true),
  ];
  const worst = Math.max(...results.map((r) => Math.max(r.maxA, r.maxB) / r.dAB));
  console.log(`\nPeor error relativo a |AB|: ${(worst * 100).toFixed(2)}%`);
  if (worst > 0.05) {
    console.error('FALLO: el error máximo supera el 5% de |AB|');
    process.exit(1);
  }
}
