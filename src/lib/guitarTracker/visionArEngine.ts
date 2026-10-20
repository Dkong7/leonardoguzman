// Motor de Visión por Computador AR — Flujo Óptico Piramidal de Lucas-Kanade (nativo, sin dependencias)
// 1. Buffers de fotograma: pirámides prevGray/currGray de 3 niveles (Float32Array) con gradientes Scharr.
// 2. Nubes de características Shi-Tomasi alrededor de anchorA (Cejuela) y anchorB (Traste 12).
// 3. LK piramidal subpíxel por punto, con compensación de brillo y verificación forward-backward.
// 4. Cinemática de cuerpo rígido: similitud 2D (rotación + escala + traslación) estimada por RANSAC sobre
//    ambas nubes, corrección local por mediana de residuos en cada ancla y restricción de distancia A–B.
// 5. Reposición automática de características y filtro One-Euro para la malla en pantalla.
// El buffer de proceso usa exactamente el mismo recorte (object-fit: cover) y espejo que el canvas visible,
// así las coordenadas rastreadas coinciden 1:1 con la malla dibujada (también en vertical en el celular).

import {
  getNormalizedFretPosition,
  type FretNode,
} from './musicTheoryEngine';
import type { DetectedNoteInfo } from './audioDspEngine';

export interface Point2D {
  x: number;
  y: number;
}

export interface NeckKeypoints {
  nutTop: Point2D;       // Cejuela borde superior
  bridgeTop: Point2D;    // Traste final (21/22/24) borde superior
  bridgeBottom: Point2D; // Traste final borde inferior
  nutBottom: Point2D;    // Cejuela borde inferior
}

export type EngineState = 'idle' | 'calibrating_vertical' | 'tracking';

export interface VisionTelemetry {
  fps: number;
  confidence: number;
  neckAngleDeg: number;
  isFallbackFrozen: boolean;
  trackingMode: 'hybrid-auto' | 'kalman-locked' | 'manual-calibration';
  engineState?: EngineState;
  calibrationFrames?: number;
  keypoints: NeckKeypoints;
  homographyMatrix: number[]; // Matriz 3x3 aplanada (9 elementos)
  featuresA?: number;
  featuresB?: number;
  inlierRatio?: number;
  scaleRatio?: number;
}

export interface PyramidLevel {
  width: number;
  height: number;
  img: Float32Array;
  gx: Float32Array;
  gy: Float32Array;
}

const PROC_LONG_SIDE = 400;
const PYRAMID_LEVELS = 3;

const LK_WIN_RADIUS = 5; // Ventana 11x11 por nivel
const LK_WIN_AREA = (2 * LK_WIN_RADIUS + 1) * (2 * LK_WIN_RADIUS + 1);
const LK_MAX_ITERATIONS = 10;
const LK_EPSILON_SQ = 0.02 * 0.02;
const LK_MIN_EIGEN = 2.0; // λmin(G)/N en (niveles de gris / px)²: rechaza zonas planas y bordes puros
const LK_MAX_RESIDUAL = 24; // Error absoluto medio (con sesgo de brillo compensado)
const FB_MAX_ERROR = 1.0; // px entre el punto original y el re-rastreado hacia atrás

const FEATURES_PER_ANCHOR = 10;
const MIN_FEATURES_PER_ANCHOR = 3;
const MAX_FEATURES = FEATURES_PER_ANCHOR * 2;
const CLOUD_A = 0;
const CLOUD_B = 1;
// Regiones de cada nube en coordenadas del mástil (u a lo largo de A→B, v perpendicular; unidad = |AB|)
const CLOUD_HALF_LENGTH = 0.2;
const CLOUD_WIDTH_FACTOR = 0.95;
const CLOUD_DRIFT_MARGIN = 1.6;
const FEATURE_MIN_DISTANCE = 6;
const SHI_TOMASI_BLOCK_RADIUS = 2;
const SHI_TOMASI_MIN_EIGEN = 6;
const SHI_TOMASI_QUALITY = 0.05;
const REPLENISH_INTERVAL_FRAMES = 6;
const URGENT_RESEED_INTERVAL_FRAMES = 2;
const LOST_RESEED_INTERVAL_FRAMES = 8;
const MAX_OUTLIER_STRIKES = 3;

const RANSAC_ITERATIONS = 40;
const MAX_SCALE_STEP = 0.06; // Cambio máximo de |AB| por fotograma de video
const MIN_SCALE_RATIO = 0.55; // |AB| permitido respecto a referenceDist
const MAX_SCALE_RATIO = 1.8;
const MAX_ROTATION_STEP = 0.2; // rad por fotograma de video
// Si los inliers abarcan menos que esta fracción de |AB| (p. ej. solo sobrevive una nube),
// la rotación/escala medida se mezcla con la predicción para no amplificar ruido en el ancla lejana.
const MIN_CONDITIONING_SPREAD = 0.3;
const VELOCITY_PREDICTION_GAIN = 0.8;
const LK_ERROR_SOFT = 8; // Peso de cada punto en el ajuste local: 1 / (1 + (error / LK_ERROR_SOFT)²)

// Corrección de deriva contra el fotograma de referencia capturado al fijar el tracking
const KEYFRAME_CHECK_INTERVAL = 2;
const KEYFRAME_GAIN = 0.3;
const KEYFRAME_MIN_SCALE = 0.65;
const KEYFRAME_MAX_SCALE = 1.6;

const DEFAULT_NUT_HALF_WIDTH_RATIO = 0.072; // 43 mm / 2 sobre 324 mm (cejuela→traste 12, escala 648 mm)
const DEFAULT_END_HALF_WIDTH_RATIO = 0.092;
const MIN_HALF_WIDTH_RATIO = 0.03;
const MAX_HALF_WIDTH_RATIO = 0.2;

const REQUIRED_CALIBRATION_FRAMES = 45; // ~1.5 segundos continuos en calibración vertical
const CALIBRATION_LADDER_FRAMES = 12; // últimos frames de la calibración en los que se miden los trastes
const CALIBRATION_LADDER_AGREEMENT = 0.008; // fracción de |AB| para que dos escaleras sean la misma pose
const CALIBRATION_LOCK_RETRIES = 15; // reintentos (cada 2 frames) esperando escaleras coincidentes
const CALIBRATION_LOCK_MIN_AGREEING = 3; // escaleras coincidentes (incluida la actual) para fijar
const CALIBRATION_GATE_FRAMES = 6; // frames detectados tras los que se exige continuidad del corredor
const MANUAL_DRAG_SETTLE_MS = 220;
const RVFC_STALL_MS = 300;

/**
 * Solicita estrictamente la cámara frontal a 1280x720 por defecto
 */
export async function requestFrontCameraStream(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: 'user',
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
    audio: false,
  });
}

/**
 * Calcula la matriz de homografía 3x3 que transforma el cuadrado unitario
 * (0,0) -> nutTop, (1,0) -> bridgeTop, (1,1) -> bridgeBottom, (0,1) -> nutBottom
 * hacia las coordenadas en pantalla con perspectiva 3D real.
 */
export function computeUnitSquareHomography(quad: NeckKeypoints): number[] {
  const x0 = quad.nutTop.x, y0 = quad.nutTop.y;
  const x1 = quad.bridgeTop.x, y1 = quad.bridgeTop.y;
  const x2 = quad.bridgeBottom.x, y2 = quad.bridgeBottom.y;
  const x3 = quad.nutBottom.x, y3 = quad.nutBottom.y;

  const dx1 = x1 - x2;
  const dx2 = x3 - x2;
  const sumX = x0 - x1 + x2 - x3;

  const dy1 = y1 - y2;
  const dy2 = y3 - y2;
  const sumY = y0 - y1 + y2 - y3;

  const det = dx1 * dy2 - dx2 * dy1;
  if (Math.abs(det) < 1e-6) {
    return [1, 0, 0, 0, 1, 0, 0, 0, 1];
  }

  const g = (sumX * dy2 - dx2 * sumY) / det;
  const h = (dx1 * sumY - sumX * dy1) / det;

  const a = x1 - x0 + g * x1;
  const b = x3 - x0 + h * x3;
  const c = x0;
  const d = y1 - y0 + g * y1;
  const e = y3 - y0 + h * y3;
  const f = y0;

  return [a, b, c, d, e, f, g, h, 1];
}

/**
 * Proyecta una coordenada normalizada del diapasón (u en [0..1] a lo largo del mástil,
 * v en [0..1] a lo ancho de las cuerdas) usando la matriz de homografía H (3x3).
 */
export function projectHomographyPoint(H: number[], u: number, v: number): Point2D {
  const denom = H[6] * u + H[7] * v + H[8];
  if (Math.abs(denom) < 1e-6) return { x: 0, y: 0 };
  const x = (H[0] * u + H[1] * v + H[2]) / denom;
  const y = (H[3] * u + H[4] * v + H[5]) / denom;
  return { x, y };
}

/**
 * Proyección bilineal del diapasón: u en [0..1] (cejuela → último traste), v en [0..1] (borde sup → inf).
 * El diapasón real es más estrecho en la cejuela que en el traste 24; una homografía interpreta ese
 * estrechamiento como perspectiva y desplaza los trastes intermedios (~8% de |cejuela→traste 12|).
 * La interpolación bilineal respeta las posiciones físicas de los trastes a lo largo del mástil.
 */
export function projectNeckPoint(quad: NeckKeypoints, u: number, v: number): Point2D {
  const topX = quad.nutTop.x + (quad.bridgeTop.x - quad.nutTop.x) * u;
  const topY = quad.nutTop.y + (quad.bridgeTop.y - quad.nutTop.y) * u;
  const botX = quad.nutBottom.x + (quad.bridgeBottom.x - quad.nutBottom.x) * u;
  const botY = quad.nutBottom.y + (quad.bridgeBottom.y - quad.nutBottom.y) * u;
  return { x: topX + (botX - topX) * v, y: topY + (botY - topY) * v };
}

// =====================================================================
// PIRÁMIDE DE IMAGEN (Float32Array) + GRADIENTES SCHARR
// =====================================================================

export function createPyramid(width: number, height: number, levels: number): PyramidLevel[] {
  const pyramid: PyramidLevel[] = [];
  let w = width;
  let h = height;
  for (let l = 0; l < levels; l++) {
    const size = w * h;
    pyramid.push({
      width: w,
      height: h,
      img: new Float32Array(size),
      gx: new Float32Array(size),
      gy: new Float32Array(size),
    });
    w = (w + 1) >> 1;
    h = (h + 1) >> 1;
  }
  return pyramid;
}

function computeScharrGradients(level: PyramidLevel) {
  const { width: w, height: h, img, gx, gy } = level;
  gx.fill(0);
  gy.fill(0);
  for (let y = 1; y < h - 1; y++) {
    let i = y * w + 1;
    for (let x = 1; x < w - 1; x++, i++) {
      const tl = img[i - w - 1];
      const tr = img[i - w + 1];
      const bl = img[i + w - 1];
      const br = img[i + w + 1];
      gx[i] = (3 * (tr - tl + br - bl) + 10 * (img[i + 1] - img[i - 1])) * (1 / 32);
      gy[i] = (3 * (bl - tl + br - tr) + 10 * (img[i + w] - img[i - w])) * (1 / 32);
    }
  }
}

// Gaussiano [1 4 6 4 1]/16 centrado en píxeles pares: el punto p del nivel L corresponde a p/2 en L+1
function downsampleGaussian(src: PyramidLevel, dst: PyramidLevel, tmp: Float32Array) {
  const sw = src.width;
  const sh = src.height;
  const dw = dst.width;
  const dh = dst.height;
  const s = src.img;
  const d = dst.img;
  const maxX = sw - 1;
  const maxY = sh - 1;

  for (let y = 0; y < sh; y++) {
    const row = y * sw;
    const out = y * dw;
    for (let x = 0; x < dw; x++) {
      const c = Math.min(2 * x, maxX);
      const m2 = c - 2 < 0 ? 0 : c - 2;
      const m1 = c - 1 < 0 ? 0 : c - 1;
      const p1 = c + 1 > maxX ? maxX : c + 1;
      const p2 = c + 2 > maxX ? maxX : c + 2;
      tmp[out + x] =
        (s[row + m2] + s[row + p2] + 4 * (s[row + m1] + s[row + p1]) + 6 * s[row + c]) * (1 / 16);
    }
  }

  for (let y = 0; y < dh; y++) {
    const c = Math.min(2 * y, maxY);
    const r0 = (c - 2 < 0 ? 0 : c - 2) * dw;
    const r1 = (c - 1 < 0 ? 0 : c - 1) * dw;
    const r2 = c * dw;
    const r3 = (c + 1 > maxY ? maxY : c + 1) * dw;
    const r4 = (c + 2 > maxY ? maxY : c + 2) * dw;
    const out = y * dw;
    for (let x = 0; x < dw; x++) {
      d[out + x] =
        (tmp[r0 + x] + tmp[r4 + x] + 4 * (tmp[r1 + x] + tmp[r3 + x]) + 6 * tmp[r2 + x]) * (1 / 16);
    }
  }
}

/** Construye los niveles 1..N y los gradientes de todos los niveles a partir de pyramid[0].img */
export function buildPyramid(pyramid: PyramidLevel[], scratch: Float32Array) {
  computeScharrGradients(pyramid[0]);
  for (let l = 1; l < pyramid.length; l++) {
    downsampleGaussian(pyramid[l - 1], pyramid[l], scratch);
    computeScharrGradients(pyramid[l]);
  }
}

// =====================================================================
// LUCAS-KANADE PIRAMIDAL (Bouguet) CON COMPENSACIÓN DE BRILLO
// =====================================================================

const lkTemplate = new Float32Array(LK_WIN_AREA);
const lkGradX = new Float32Array(LK_WIN_AREA);
const lkGradY = new Float32Array(LK_WIN_AREA);
const lkCurrent = new Float32Array(LK_WIN_AREA);
const lkIterResult = new Float32Array(3);

/**
 * Iteraciones Gauss-Newton de traslación sobre la ventana actual (plantilla en lkTemplate/lkGradX/lkGradY).
 * Escribe [dx, dy, errorMedio] en res; devuelve false si la ventana sale de la imagen.
 */
function iterateTranslationLK(
  C: PyramidLevel,
  lx: number,
  ly: number,
  gX: number,
  gY: number,
  gxx: number,
  gxy: number,
  gyy: number,
  meanT: number,
  res: Float32Array
): boolean {
  const r = LK_WIN_RADIUS;
  const w = C.width;
  const h = C.height;
  const cImg = C.img;
  const invDet = 1 / (gxx * gyy - gxy * gxy);
  let dx = 0;
  let dy = 0;
  let err = 0;

  for (let iter = 0; iter < LK_MAX_ITERATIONS; iter++) {
    const cx = lx + gX + dx;
    const cy = ly + gY + dy;
    const jx = Math.floor(cx);
    const jy = Math.floor(cy);
    if (jx - r < 0 || jy - r < 0 || jx + r + 1 >= w || jy + r + 1 >= h) {
      res[0] = dx;
      res[1] = dy;
      res[2] = err;
      return false;
    }
    const bx = cx - jx;
    const by = cy - jy;
    const v00 = (1 - bx) * (1 - by);
    const v10 = bx * (1 - by);
    const v01 = (1 - bx) * by;
    const v11 = bx * by;

    let sumC = 0;
    let k = 0;
    for (let wy = -r; wy <= r; wy++) {
      let i = (jy + wy) * w + jx - r;
      for (let wx = -r; wx <= r; wx++, i++, k++) {
        const c = v00 * cImg[i] + v10 * cImg[i + 1] + v01 * cImg[i + w] + v11 * cImg[i + w + 1];
        lkCurrent[k] = c;
        sumC += c;
      }
    }

    const bias = meanT - sumC / LK_WIN_AREA;
    let bX = 0;
    let bY = 0;
    let absErr = 0;
    for (k = 0; k < LK_WIN_AREA; k++) {
      const e = lkTemplate[k] - lkCurrent[k] - bias;
      bX += e * lkGradX[k];
      bY += e * lkGradY[k];
      absErr += e < 0 ? -e : e;
    }

    const stepX = (gyy * bX - gxy * bY) * invDet;
    const stepY = (gxx * bY - gxy * bX) * invDet;
    dx += stepX;
    dy += stepY;
    err = absErr / LK_WIN_AREA;
    if (stepX * stepX + stepY * stepY < LK_EPSILON_SQ) break;
  }

  res[0] = dx;
  res[1] = dy;
  res[2] = err;
  return true;
}

/**
 * Rastrea el punto (px, py) de `from` hacia `to` partiendo de la estimación inicial (guessX, guessY).
 * Escribe en out: [x, y, errorMedio, λmin/N]. Devuelve false si el punto se pierde.
 */
export function trackPointLK(
  from: PyramidLevel[],
  to: PyramidLevel[],
  px: number,
  py: number,
  guessX: number,
  guessY: number,
  out: Float32Array
): boolean {
  const levels = Math.min(from.length, to.length);
  const r = LK_WIN_RADIUS;
  const topScale = 1 / (1 << (levels - 1));
  let gX = (guessX - px) * topScale;
  let gY = (guessY - py) * topScale;
  let finalError = 0;
  let finalMinEig = 0;

  for (let L = levels - 1; L >= 0; L--) {
    const P = from[L];
    const C = to[L];
    const w = P.width;
    const h = P.height;
    const scale = 1 / (1 << L);
    const lx = px * scale;
    const ly = py * scale;
    const ix = Math.floor(lx);
    const iy = Math.floor(ly);
    let dx = 0;
    let dy = 0;

    if (ix - r < 0 || iy - r < 0 || ix + r + 1 >= w || iy + r + 1 >= h) {
      if (L === 0) return false;
      gX *= 2;
      gY *= 2;
      continue;
    }

    const ax = lx - ix;
    const ay = ly - iy;
    const w00 = (1 - ax) * (1 - ay);
    const w10 = ax * (1 - ay);
    const w01 = (1 - ax) * ay;
    const w11 = ax * ay;
    const pImg = P.img;
    const pGx = P.gx;
    const pGy = P.gy;

    let gxx = 0;
    let gxy = 0;
    let gyy = 0;
    let sumT = 0;
    let k = 0;
    for (let wy = -r; wy <= r; wy++) {
      let i = (iy + wy) * w + ix - r;
      for (let wx = -r; wx <= r; wx++, i++, k++) {
        const t = w00 * pImg[i] + w10 * pImg[i + 1] + w01 * pImg[i + w] + w11 * pImg[i + w + 1];
        const gx = w00 * pGx[i] + w10 * pGx[i + 1] + w01 * pGx[i + w] + w11 * pGx[i + w + 1];
        const gy = w00 * pGy[i] + w10 * pGy[i + 1] + w01 * pGy[i + w] + w11 * pGy[i + w + 1];
        lkTemplate[k] = t;
        lkGradX[k] = gx;
        lkGradY[k] = gy;
        sumT += t;
        gxx += gx * gx;
        gxy += gx * gy;
        gyy += gy * gy;
      }
    }

    const det = gxx * gyy - gxy * gxy;
    const halfTrace = 0.5 * (gxx + gyy);
    const minEig = (halfTrace - Math.sqrt(Math.max(0, halfTrace * halfTrace - det))) / LK_WIN_AREA;
    const minEigRequired = L === 0 ? LK_MIN_EIGEN : LK_MIN_EIGEN * 0.05;

    if (det > 1e-6 && minEig >= minEigRequired) {
      const inside = iterateTranslationLK(
        C, lx, ly, gX, gY, gxx, gxy, gyy, sumT / LK_WIN_AREA, lkIterResult
      );
      if (!inside && L === 0) return false;
      dx = lkIterResult[0];
      dy = lkIterResult[1];
      if (L === 0) {
        finalError = lkIterResult[2];
        finalMinEig = minEig;
      }
    } else if (L === 0) {
      return false;
    }

    if (L > 0) {
      gX = 2 * (gX + dx);
      gY = 2 * (gY + dy);
    } else {
      gX += dx;
      gY += dy;
    }
  }

  out[0] = px + gX;
  out[1] = py + gY;
  out[2] = finalError;
  out[3] = finalMinEig;
  return Number.isFinite(out[0]) && Number.isFinite(out[1]);
}

const KF_PAD = LK_WIN_RADIUS + 1;
const KF_SIZE = 2 * KF_PAD + 1;
const kfPatch = new Float32Array(KF_SIZE * KF_SIZE);

function sampleBilinearClamped(img: Float32Array, w: number, h: number, x: number, y: number): number {
  const cx = x < 0 ? 0 : x > w - 1.001 ? w - 1.001 : x;
  const cy = y < 0 ? 0 : y > h - 1.001 ? h - 1.001 : y;
  const ix = cx | 0;
  const iy = cy | 0;
  const fx = cx - ix;
  const fy = cy - iy;
  const i = iy * w + ix;
  return (
    (img[i] * (1 - fx) + img[i + 1] * fx) * (1 - fy) +
    (img[i + w] * (1 - fx) + img[i + w + 1] * fx) * fy
  );
}

/**
 * LK de una sola escala contra el FOTOGRAMA DE REFERENCIA (keyframe del "Fijar Tracking"):
 * el parche alrededor de (kx, ky) se re-muestrea con la rotación/escala inversa actual
 * (ia, ib = parte lineal inversa de la similitud keyframe→actual), así la plantilla queda orientada
 * como la guitarra ahora y el emparejamiento no se rompe al girar o acercar el mástil.
 */
export function refineWarpedTemplateLK(
  keyImg: Float32Array,
  keyW: number,
  keyH: number,
  kx: number,
  ky: number,
  ia: number,
  ib: number,
  curr: PyramidLevel,
  startX: number,
  startY: number,
  out: Float32Array
): boolean {
  for (let py = -KF_PAD; py <= KF_PAD; py++) {
    for (let px = -KF_PAD; px <= KF_PAD; px++) {
      kfPatch[(py + KF_PAD) * KF_SIZE + px + KF_PAD] = sampleBilinearClamped(
        keyImg, keyW, keyH, kx + ia * px + ib * py, ky - ib * px + ia * py
      );
    }
  }

  const r = LK_WIN_RADIUS;
  let gxx = 0;
  let gxy = 0;
  let gyy = 0;
  let sumT = 0;
  let k = 0;
  for (let wy = -r; wy <= r; wy++) {
    let i = (wy + KF_PAD) * KF_SIZE + KF_PAD - r;
    for (let wx = -r; wx <= r; wx++, i++, k++) {
      const t = kfPatch[i];
      const gx = 0.5 * (kfPatch[i + 1] - kfPatch[i - 1]);
      const gy = 0.5 * (kfPatch[i + KF_SIZE] - kfPatch[i - KF_SIZE]);
      lkTemplate[k] = t;
      lkGradX[k] = gx;
      lkGradY[k] = gy;
      sumT += t;
      gxx += gx * gx;
      gxy += gx * gy;
      gyy += gy * gy;
    }
  }
  const det = gxx * gyy - gxy * gxy;
  const halfTrace = 0.5 * (gxx + gyy);
  const minEig = (halfTrace - Math.sqrt(Math.max(0, halfTrace * halfTrace - det))) / LK_WIN_AREA;
  if (det <= 1e-6 || minEig < LK_MIN_EIGEN) return false;

  if (!iterateTranslationLK(curr, startX, startY, 0, 0, gxx, gxy, gyy, sumT / LK_WIN_AREA, lkIterResult)) {
    return false;
  }
  out[0] = startX + lkIterResult[0];
  out[1] = startY + lkIterResult[1];
  out[2] = lkIterResult[2];
  out[3] = minEig;
  return Number.isFinite(out[0]) && Number.isFinite(out[1]);
}

// =====================================================================
// SIMILITUD 2D: q = [a -b; b a]·p + t  (rotación + escala uniforme + traslación)
// =====================================================================

interface Similarity {
  a: number;
  b: number;
  tx: number;
  ty: number;
}

function setIdentity(s: Similarity) {
  s.a = 1;
  s.b = 0;
  s.tx = 0;
  s.ty = 0;
}

function copySimilarity(dst: Similarity, src: Similarity) {
  dst.a = src.a;
  dst.b = src.b;
  dst.tx = src.tx;
  dst.ty = src.ty;
}

function similarityFromPairs(
  out: Similarity,
  p1x: number, p1y: number, p2x: number, p2y: number,
  q1x: number, q1y: number, q2x: number, q2y: number
): boolean {
  const dpx = p2x - p1x;
  const dpy = p2y - p1y;
  const den = dpx * dpx + dpy * dpy;
  if (den < 1e-6) return false;
  const dqx = q2x - q1x;
  const dqy = q2y - q1y;
  out.a = (dpx * dqx + dpy * dqy) / den;
  out.b = (dpx * dqy - dpy * dqx) / den;
  out.tx = q1x - (out.a * p1x - out.b * p1y);
  out.ty = q1y - (out.b * p1x + out.a * p1y);
  return true;
}

function wrapAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function medianInPlace(values: Float32Array, count: number): number {
  for (let i = 1; i < count; i++) {
    const v = values[i];
    let j = i - 1;
    while (j >= 0 && values[j] > v) {
      values[j + 1] = values[j];
      j--;
    }
    values[j + 1] = v;
  }
  const mid = count >> 1;
  return count % 2 === 1 ? values[mid] : 0.5 * (values[mid - 1] + values[mid]);
}

// =====================================================================
// ESCALERA DE TRASTES: cejuela y traste 12 reales a partir de las líneas de traste visibles
// =====================================================================

export interface FretLadderFit {
  nutY: number;
  fret12Y: number;
  nutAtTop: boolean;
  matchedFrets: number;
  rms: number;
}

const LADDER_MAX_PEAKS = 64;
const LADDER_MIN_MATCHED = 6;
const LADDER_TOLERANCE = 0.16;
const LADDER_CANDIDATES = 12;
const LADDER_CONTEXT_WEIGHT = 2.5;
// Intervalos (n, n+1) sin incrustaciones: referencia del color del diapasón robusta a una mano encima
const LADDER_BOARD_INTERVALS = [1, 3, 5, 7, 9, 10, 12, 13];

/**
 * Ajusta la ley temperada y(n) = y0 + D·(1 − 2^(−n/12)) (n = 0 cejuela, D = escala en px) a las líneas
 * horizontales de la columna [x0, x1] de un diapasón vertical, con la cejuela arriba o abajo.
 * La escalera es autosemejante (desplazada k trastes también encaja con D·2^(−k/12)), así que se penaliza
 * la hipótesis que deja trastes detectados al otro lado de su cejuela.
 * Con el mástil inclinado ([x0, x1] en la fila yRef, eje x = centro + (y − yRef)·slope) cada fila y se
 * muestrea a lo largo del traste que cruza el eje en y; nutY/fret12Y siguen siendo filas sobre el eje.
 */
export function fitVerticalFretLadder(
  img: Float32Array,
  width: number,
  height: number,
  x0: number,
  x1: number,
  maxFret: number,
  slope = 0,
  yRef = height * 0.5
): FretLadderFit | null {
  const span = x1 - x0;
  const xa = Math.max(1, Math.round(x0 + span * 0.18));
  const xb = Math.min(width - 2, Math.round(x1 - span * 0.18));
  if (xb - xa < 3 || height < 40) return null;
  const frets = Math.max(12, Math.min(30, Math.round(maxFret)));

  const rows = new Float32Array(height);
  const invCount = 1 / (xb - xa + 1);
  if (Math.abs(slope) < 1e-4) {
    for (let y = 0; y < height; y++) {
      const row = y * width;
      let s = 0;
      for (let x = xa; x <= xb; x++) s += img[row + x];
      rows[y] = s * invCount;
    }
  } else {
    const half = 0.5 * (xb - xa);
    const mid = 0.5 * (x0 + x1);
    for (let y = 0; y < height; y++) {
      const xc = mid + (y - yRef) * slope;
      let s = 0;
      for (let i = 0; i <= xb - xa; i++) {
        const t = i - half;
        const sx = clamp(xc + t, 0, width - 1.001);
        const sy = clamp(y - slope * t, 0, height - 1.001);
        const ix = sx | 0;
        const iy = sy | 0;
        const fx = sx - ix;
        const fy = sy - iy;
        const o = iy * width + ix;
        const top = img[o] + (img[o + 1] - img[o]) * fx;
        const bot = img[o + width] + (img[o + width + 1] - img[o + width]) * fx;
        s += top + (bot - top) * fy;
      }
      rows[y] = s * invCount;
    }
  }

  // Detector de línea fina: trastes claros sobre palisandro (o al revés en arce)
  const resp = new Float32Array(height);
  let posEnergy = 0;
  let negEnergy = 0;
  for (let y = 2; y < height - 2; y++) {
    const r = rows[y] - 0.5 * (rows[y - 2] + rows[y + 2]);
    resp[y] = r;
    if (r > 0) posEnergy += r * r;
    else negEnergy += r * r;
  }
  const polarity = posEnergy >= negEnergy ? 1 : -1;
  const line = new Float32Array(height);
  for (let y = 2; y < height - 2; y++) line[y] = Math.max(0, polarity * resp[y]);

  const sorted = Float32Array.from(line.subarray(2, height - 2)).sort();
  const threshold = Math.max(2.5, 4 * sorted[sorted.length >> 1]);

  const peakPos: number[] = [];
  const peakStrength: number[] = [];
  for (let y = 3; y < height - 3; y++) {
    const v = line[y];
    if (v < threshold || v <= line[y - 1] || v < line[y + 1] || v < line[y - 2] || v < line[y + 2]) continue;
    const den = line[y - 1] - 2 * v + line[y + 1];
    const delta = den < -1e-6 ? clamp((0.5 * (line[y - 1] - line[y + 1])) / den, -0.5, 0.5) : 0;
    peakPos.push(y + delta);
    peakStrength.push(v);
  }
  if (peakPos.length < LADDER_MIN_MATCHED) return null;
  if (peakPos.length > LADDER_MAX_PEAKS) {
    const order = peakPos.map((_, i) => i).sort((a, b) => peakStrength[b] - peakStrength[a]);
    const keep = order.slice(0, LADDER_MAX_PEAKS).sort((a, b) => peakPos[a] - peakPos[b]);
    const pos = keep.map((i) => peakPos[i]);
    const str = keep.map((i) => peakStrength[i]);
    peakPos.length = 0;
    peakStrength.length = 0;
    peakPos.push(...pos);
    peakStrength.push(...str);
  }
  // Pesos relativos a la línea típica: los trastes dominan el recuento de picos
  const typicalStrength = [...peakStrength].sort((a, b) => a - b)[peakStrength.length >> 1];
  const peakWeight = peakStrength.map((s) => Math.min(1, s / Math.max(1e-6, typicalStrength)));

  const c = new Float64Array(frets + 1);
  for (let n = 0; n <= frets; n++) c[n] = 1 - Math.pow(2, -n / 12);
  const cNeg = new Float64Array(6);
  for (let m = 0; m <= 5; m++) cNeg[m] = 1 - Math.pow(2, m / 12);

  const t = new Float64Array(peakPos.length);
  const tw = new Float64Array(peakPos.length);
  const matchedFlags = new Uint8Array(frets + 1);

  const prefix = new Float64Array(height + 1);
  for (let y = 0; y < height; y++) prefix[y + 1] = prefix[y] + rows[y];
  let flipped = false;
  const intervalMean = (ta: number, tb: number): number => {
    const ya = flipped ? height - 1 - tb : ta;
    const yb = flipped ? height - 1 - ta : tb;
    const ia = Math.max(0, Math.ceil(ya));
    const ib = Math.min(height - 1, Math.floor(yb));
    if (ib - ia + 1 < 3) return NaN;
    return (prefix[ib + 1] - prefix[ia]) / (ib - ia + 1);
  };
  const innerMean = (n: number, y0: number, D: number): number => {
    const a = y0 + D * (n < 0 ? cNeg[-n] : c[n]);
    const b = y0 + D * c[n + 1];
    const margin = Math.max(1, 0.15 * (b - a));
    return intervalMean(a + margin, b - margin);
  };
  const boardRef: number[] = [];
  // Entre trastes todo es madera del diapasón; por encima de la cejuela (pala + hueso) no. Distingue la
  // hipótesis buena de la que toma la cejuela como traste 1 o el traste 1 como cejuela.
  const nutContextBonus = (y0: number, D: number): number => {
    boardRef.length = 0;
    for (const n of LADDER_BOARD_INTERVALS) {
      if (n + 1 > frets) break;
      const m = innerMean(n, y0, D);
      if (!Number.isNaN(m)) boardRef.push(m);
    }
    if (boardRef.length < 2) return 0;
    boardRef.sort((a, b) => a - b);
    const ref = boardRef[boardRef.length >> 1];
    const inconsistency = (m: number) => (Number.isNaN(m) ? 0.5 : Math.min(1, Math.abs(m - ref) / 25));
    return LADDER_CONTEXT_WEIGHT * (inconsistency(innerMean(-1, y0, D)) - inconsistency(innerMean(0, y0, D)));
  };

  // Peso de la coincidencia más cercana a q (0 si no hay pico dentro de la tolerancia)
  const matchWeight = (q: number, tol: number): number => {
    let lo = 0;
    let hi = t.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (t[mid] < q) lo = mid;
      else hi = mid;
    }
    const k = Math.abs(t[lo] - q) <= Math.abs(t[hi] - q) ? lo : hi;
    const d = Math.abs(t[k] - q) / tol;
    return d <= 1 ? (1 - d * d) * tw[k] : 0;
  };

  const scoreLines = (y0: number, D: number): number => {
    let score = 0;
    let first = -1;
    let last = -1;
    matchedFlags.fill(0);
    // n = 0 puntúa el borde cejuela/diapasón: sin él, "cejuela = traste 1" empata con la hipótesis buena
    for (let n = 0; n <= frets; n++) {
      const tp = y0 + D * c[n];
      if (tp < 1 || tp > height - 2) continue;
      const m = matchWeight(tp, Math.max(0.9, LADDER_TOLERANCE * D * (n === 0 ? c[1] : c[n] - c[n - 1])));
      if (m > 0) {
        score += m;
        matchedFlags[n] = 1;
        if (first < 0) first = n;
        last = n;
      }
    }
    for (let n = first + 1; n < last; n++) {
      if (!matchedFlags[n]) score -= 0.3;
    }
    // Una línea donde iría el "traste −1" suele ser la cejuela real: la hipótesis está corrida un traste
    for (let m = 1; m <= 5; m++) {
      const tp = y0 + D * cNeg[m];
      if (tp < 1) break;
      const tol = Math.max(0.9, LADDER_TOLERANCE * D * (cNeg[m - 1] - cNeg[m]));
      score -= (m === 1 ? 1.6 : 1.0) * matchWeight(tp, tol);
    }
    return score;
  };
  const scoreHypothesis = (y0: number, D: number): number => scoreLines(y0, D) + nutContextBonus(y0, D);

  const loadOrientation = (nutAtTop: boolean) => {
    flipped = !nutAtTop;
    for (let i = 0; i < peakPos.length; i++) {
      const src = nutAtTop ? i : peakPos.length - 1 - i;
      t[i] = nutAtTop ? peakPos[src] : height - 1 - peakPos[src];
      tw[i] = peakWeight[src];
    }
  };

  // Mínimos cuadrados y = y0 + D·c(n) sobre los trastes emparejados (la cejuela n = 0 queda fuera: su
  // borde detectado está sesgado ~1 px hacia el hueso)
  const refine = (y0In: number, DIn: number) => {
    let y0 = y0In;
    let D = DIn;
    let matched = 0;
    let rms = Infinity;
    let first = -1;
    let last = -1;
    for (let iter = 0; iter < 3; iter++) {
      let sc = 0, st = 0, scc = 0, sct = 0, stt = 0;
      matched = 0;
      first = -1;
      last = -1;
      for (let n = 1; n <= frets; n++) {
        const tp = y0 + D * c[n];
        if (tp < 1 || tp > height - 2) continue;
        const tol = Math.max(0.9, LADDER_TOLERANCE * D * (c[n] - c[n - 1]));
        let lo = 0;
        let hi = t.length - 1;
        while (hi - lo > 1) {
          const mid = (lo + hi) >> 1;
          if (t[mid] < tp) lo = mid;
          else hi = mid;
        }
        const tk = Math.abs(t[lo] - tp) <= Math.abs(t[hi] - tp) ? t[lo] : t[hi];
        if (Math.abs(tk - tp) > tol) continue;
        sc += c[n];
        st += tk;
        scc += c[n] * c[n];
        sct += c[n] * tk;
        stt += tk * tk;
        matched++;
        if (first < 0) first = n;
        last = n;
      }
      if (matched < LADDER_MIN_MATCHED) return null;
      const varC = scc - (sc * sc) / matched;
      if (varC < 1e-9) return null;
      D = (sct - (sc * st) / matched) / varC;
      y0 = (st - D * sc) / matched;
      const sse = stt - 2 * y0 * st - 2 * D * sct + matched * y0 * y0 + 2 * y0 * D * sc + D * D * scc;
      rms = Math.sqrt(Math.max(0, sse) / matched);
    }
    return { y0, D, matched, rms, first, last };
  };

  // Hipótesis de 2 trastes extrapolan mal hasta los trastes agudos (tolerancia < 1 px): se refinan las
  // mejores antes de compararlas
  const candidates: { score: number; y0: number; D: number; top: boolean }[] = [];
  const offerCandidate = (score: number, y0: number, D: number, top: boolean) => {
    if (candidates.length === LADDER_CANDIDATES && score <= candidates[candidates.length - 1].score) return;
    for (const cand of candidates) {
      if (cand.top === top && Math.abs(cand.y0 - y0) < 1.5 && Math.abs(cand.D - D) < 0.01 * D) {
        if (score > cand.score) {
          cand.score = score;
          cand.y0 = y0;
          cand.D = D;
          candidates.sort((a, b) => b.score - a.score);
        }
        return;
      }
    }
    candidates.push({ score, y0, D, top });
    candidates.sort((a, b) => b.score - a.score);
    if (candidates.length > LADDER_CANDIDATES) candidates.pop();
  };

  for (const nutAtTop of [true, false]) {
    loadOrientation(nutAtTop);
    for (let i = 0; i < t.length; i++) {
      for (let j = i + 1; j <= Math.min(t.length - 1, i + 3); j++) {
        const gap = t[j] - t[i];
        if (gap < 3) continue;
        for (let ni = 0; ni <= 10; ni++) {
          for (let nj = ni + 1; nj <= Math.min(frets, ni + 4); nj++) {
            const D = gap / (c[nj] - c[ni]);
            if (D * 0.5 < 0.12 * height || D * 0.5 > 1.3 * height) continue;
            const y0 = t[i] - D * c[ni];
            if (y0 < -0.5 * height || y0 > 0.85 * height) continue;
            const lines = scoreLines(y0, D);
            const floor = candidates.length === LADDER_CANDIDATES ? candidates[candidates.length - 1].score : -Infinity;
            if (lines + LADDER_CONTEXT_WEIGHT <= floor) continue;
            offerCandidate(lines + nutContextBonus(y0, D), y0, D, nutAtTop);
          }
        }
      }
    }
  }

  let bestScore = -Infinity;
  let best: { y0: number; D: number; matched: number; rms: number; first: number; last: number; top: boolean } | null =
    null;
  for (const cand of candidates) {
    loadOrientation(cand.top);
    const r = refine(cand.y0, cand.D);
    if (!r) continue;
    const s = scoreHypothesis(r.y0, r.D);
    if (s > bestScore) {
      bestScore = s;
      best = { ...r, top: cand.top };
    }
  }
  if (!best || bestScore < LADDER_MIN_MATCHED * 0.6) return null;

  const spacingAtLast = best.D * (c[best.last] - c[best.last - 1]);
  if (best.matched / (best.last - best.first + 1) < 0.6 || best.rms > Math.max(0.8, 0.12 * spacingAtLast)) {
    return null;
  }
  const nutT = best.y0;
  const fret12T = best.y0 + best.D * 0.5;
  return {
    nutY: best.top ? nutT : height - 1 - nutT,
    fret12Y: best.top ? fret12T : height - 1 - fret12T,
    nutAtTop: best.top,
    matchedFrets: best.matched,
    rms: best.rms,
  };
}

/** Eje de un mástil casi vertical: en la fila y pasa por x = cx + (y − yRef)·slope */
export interface NeckAxis {
  cx: number;
  yRef: number;
  slope: number;
  halfWidth: number;
}

const AXIS_MAX_TILT_DEG = 12;
const AXIS_FINE_STEP_DEG = 0.125;
const AXIS_EDGE_THRESHOLD = 95;

/**
 * Inclinación y centro reales del mástil detectado en [leftX, rightX] (columnas del perfil vertical).
 * Bordes, filetes y cuerdas son paralelos al eje (el estrechamiento es simétrico): la cizalla
 * x' = x − (y − yRef)·tan(φ) que más concentra la energía de bordes verticales da la inclinación, y en ese
 * perfil cizallado el par de bordes de polaridad opuesta da el centro.
 */
export function estimateNeckAxis(
  img: Float32Array,
  width: number,
  height: number,
  leftX: number,
  rightX: number,
  topRow: number,
  bottomRow: number
): NeckAxis | null {
  const y0 = Math.max(1, Math.floor(topRow));
  const y1 = Math.min(height - 2, Math.ceil(bottomRow));
  if (y1 - y0 < 20 || rightX - leftX < 4) return null;
  const yRef = 0.5 * (y0 + y1);
  const maxTan = Math.tan((AXIS_MAX_TILT_DEG * Math.PI) / 180);
  const margin = Math.ceil(0.5 * (y1 - y0) * maxTan) + 4;
  const xMin = Math.max(1, Math.floor(leftX) - margin);
  const xMax = Math.min(width - 2, Math.ceil(rightX) + margin);

  const capacity = (xMax - xMin + 1) * (y1 - y0 + 1);
  const hx = new Float32Array(capacity);
  const hy = new Float32Array(capacity);
  const hv = new Float32Array(capacity);
  let hits = 0;
  for (let y = y0; y <= y1; y++) {
    const row = y * width;
    for (let x = xMin; x <= xMax; x++) {
      const idx = row + x;
      const gx =
        -img[idx - width - 1] + img[idx - width + 1] - 2 * img[idx - 1] + 2 * img[idx + 1] -
        img[idx + width - 1] + img[idx + width + 1];
      const gy =
        -img[idx - width - 1] - 2 * img[idx - width] - img[idx - width + 1] +
        img[idx + width - 1] + 2 * img[idx + width] + img[idx + width + 1];
      if (Math.abs(gx) < AXIS_EDGE_THRESHOLD || Math.abs(gx) <= Math.abs(gy) * 1.75) continue;
      hx[hits] = x;
      hy[hits] = y - yRef;
      hv[hits] = gx;
      hits++;
    }
  }
  if (hits < 40) return null;

  const base = xMin - margin - 2;
  const bins = xMax - xMin + 2 * margin + 6;
  const pos = new Float32Array(bins);
  const neg = new Float32Array(bins);
  const shear = (k: number) => {
    pos.fill(0);
    neg.fill(0);
    for (let i = 0; i < hits; i++) {
      const xs = hx[i] - hy[i] * k - base;
      const i0 = Math.floor(xs);
      if (i0 < 0 || i0 >= bins - 1) continue;
      const f = xs - i0;
      const v = hv[i];
      const arr = v > 0 ? pos : neg;
      const m = v > 0 ? v : -v;
      arr[i0] += m * (1 - f);
      arr[i0 + 1] += m * f;
    }
  };
  const concentration = (deg: number): number => {
    shear(Math.tan((deg * Math.PI) / 180));
    let s = 0;
    for (let i = 1; i < bins - 1; i++) {
      const p = 0.25 * pos[i - 1] + 0.5 * pos[i] + 0.25 * pos[i + 1];
      const n = 0.25 * neg[i - 1] + 0.5 * neg[i] + 0.25 * neg[i + 1];
      s += p * p + n * n;
    }
    return s;
  };

  let bestDeg = 0;
  let bestScore = -Infinity;
  for (let deg = -AXIS_MAX_TILT_DEG; deg <= AXIS_MAX_TILT_DEG; deg += 1) {
    const s = concentration(deg);
    if (s > bestScore) {
      bestScore = s;
      bestDeg = deg;
    }
  }
  const coarse = bestDeg;
  const fineSteps = Math.round(1 / AXIS_FINE_STEP_DEG);
  const fine = new Float64Array(2 * fineSteps + 1);
  let bestFine = fineSteps;
  for (let j = 0; j <= 2 * fineSteps; j++) {
    fine[j] = concentration(coarse + (j - fineSteps) * AXIS_FINE_STEP_DEG);
    if (fine[j] > fine[bestFine]) bestFine = j;
  }
  let deg = coarse + (bestFine - fineSteps) * AXIS_FINE_STEP_DEG;
  if (bestFine > 0 && bestFine < 2 * fineSteps) {
    const a = fine[bestFine - 1];
    const b = fine[bestFine];
    const c = fine[bestFine + 1];
    const den = a - 2 * b + c;
    if (den < 0) deg += clamp((0.5 * (a - c)) / den, -0.5, 0.5) * AXIS_FINE_STEP_DEG;
  }
  const slope = Math.tan((deg * Math.PI) / 180);

  // Centro por simetría especular del perfil enderezado: con I(c + t) = I(c − t) el gradiente cumple
  // gx(c + t) = −gx(c − t). Usa a la vez bordes, filetes y cuerdas, sin depender de cuál contrasta más.
  shear(slope);
  const ps = new Float32Array(bins);
  const ns = new Float32Array(bins);
  for (let i = 1; i < bins - 1; i++) {
    ps[i] = 0.25 * pos[i - 1] + 0.5 * pos[i] + 0.25 * pos[i + 1];
    ns[i] = 0.25 * neg[i - 1] + 0.5 * neg[i] + 0.25 * neg[i + 1];
  }
  const half = 0.5 * (rightX - leftX);
  const maxSpread = 2 * Math.ceil(1.3 * half);
  const reach = Math.max(4, Math.round(0.6 * half));
  const mMid = Math.round(leftX + rightX) - 2 * base;
  const symmetry = (m: number): number => {
    let s = 0;
    for (let i = (m >> 1) + 1; 2 * i - m <= maxSpread && i < bins; i++) {
      const j = m - i;
      if (j < 0) break;
      s += ps[i] * ns[j] + ns[i] * ps[j];
    }
    return s;
  };
  let bestM = mMid;
  let bestSym = -Infinity;
  const symScores = new Float64Array(4 * reach + 1);
  for (let k = 0; k <= 4 * reach; k++) {
    symScores[k] = symmetry(mMid - 2 * reach + k);
    if (symScores[k] > bestSym) {
      bestSym = symScores[k];
      bestM = mMid - 2 * reach + k;
    }
  }
  if (!(bestSym > 0)) return null;
  let mRefined = bestM;
  const kBest = bestM - (mMid - 2 * reach);
  if (kBest > 0 && kBest < 4 * reach) {
    const a = symScores[kBest - 1];
    const c = symScores[kBest + 1];
    const den = a - 2 * bestSym + c;
    if (den < 0) mRefined += clamp((0.5 * (a - c)) / den, -0.5, 0.5);
  }
  const cosT = 1 / Math.sqrt(1 + slope * slope);
  return { cx: base + 0.5 * mRefined, yRef, slope, halfWidth: half * cosT };
}

// =====================================================================
// RASTREADOR DE MÁSTIL (sin DOM): pirámides, nubes de puntos, RANSAC y cuerpo rígido
// =====================================================================

export class LucasKanadeNeckTracker {
  public anchorA: Point2D = { x: 0, y: 0 }; // Cejuela (px del buffer de proceso)
  public anchorB: Point2D = { x: 0, y: 0 }; // Traste 12
  public referenceDist = 0;
  public nutHalfWidthRatio = DEFAULT_NUT_HALF_WIDTH_RATIO;
  public endHalfWidthRatio = DEFAULT_END_HALF_WIDTH_RATIO;
  public endU = 1.5; // Posición del último traste en unidades |AB|
  public isLocked = false;
  public isLost = false;
  public confidence = 0;
  public inliersA = 0;
  public inliersB = 0;
  public inlierRatio = 0;

  private width = 0;
  private height = 0;
  private prevGrayBuffer: PyramidLevel[] = [];
  private currGrayBuffer: PyramidLevel[] = [];
  private pyramidScratch = new Float32Array(0);
  private hasPrev = false;
  private hasCurr = false;

  private featureCount = 0;
  private readonly fx = new Float32Array(MAX_FEATURES);
  private readonly fy = new Float32Array(MAX_FEATURES);
  private readonly nx = new Float32Array(MAX_FEATURES);
  private readonly ny = new Float32Array(MAX_FEATURES);
  private readonly residual = new Float32Array(MAX_FEATURES);
  private readonly fErr = new Float32Array(MAX_FEATURES);
  private readonly fCloud = new Uint8Array(MAX_FEATURES);
  private readonly fStatus = new Uint8Array(MAX_FEATURES);
  private readonly fInlier = new Uint8Array(MAX_FEATURES);
  private readonly fStrikes = new Uint8Array(MAX_FEATURES);
  private readonly validIdx = new Int32Array(MAX_FEATURES);
  private readonly cloudIdxA = new Int32Array(MAX_FEATURES);
  private readonly cloudIdxB = new Int32Array(MAX_FEATURES);
  private readonly lkOut = new Float32Array(4);
  private seedScores = new Float32Array(0);

  private velAx = 0;
  private velAy = 0;
  private velBx = 0;
  private velBy = 0;
  private readonly framesSinceSeed = new Int32Array(2);
  private lostFrames = 0;
  private randomState = 0x2f6b9a1d;

  private readonly sim: Similarity = { a: 1, b: 0, tx: 0, ty: 0 };
  private readonly simPred: Similarity = { a: 1, b: 0, tx: 0, ty: 0 };
  private readonly simTry: Similarity = { a: 1, b: 0, tx: 0, ty: 0 };
  private readonly simLocal: Similarity = { a: 1, b: 0, tx: 0, ty: 0 };

  // Fotograma de referencia (keyframe) del último "Fijar Tracking"
  private keyImg = new Float32Array(0);
  private keyCount = 0;
  private readonly keyX = new Float32Array(MAX_FEATURES);
  private readonly keyY = new Float32Array(MAX_FEATURES);
  private readonly keyCloud = new Uint8Array(MAX_FEATURES);
  private keyA: Point2D = { x: 0, y: 0 };
  private keyB: Point2D = { x: 0, y: 0 };
  private framesSinceKeyCheck = 0;
  private readonly kfOffX = new Float32Array(MAX_FEATURES);
  private readonly kfOffY = new Float32Array(MAX_FEATURES);
  private readonly kfKeyX = new Float32Array(MAX_FEATURES);
  private readonly kfKeyY = new Float32Array(MAX_FEATURES);
  private readonly kfSortX = new Float32Array(MAX_FEATURES);
  private readonly kfSortY = new Float32Array(MAX_FEATURES);

  public get procWidth() {
    return this.width;
  }

  public get procHeight() {
    return this.height;
  }

  public get hasFrame() {
    return this.hasCurr;
  }

  public get currentLevel0(): PyramidLevel | null {
    return this.hasCurr ? this.currGrayBuffer[0] : null;
  }

  public resize(width: number, height: number) {
    if (width === this.width && height === this.height) {
      this.invalidateFrames();
      return;
    }
    this.width = width;
    this.height = height;
    this.prevGrayBuffer = createPyramid(width, height, PYRAMID_LEVELS);
    this.currGrayBuffer = createPyramid(width, height, PYRAMID_LEVELS);
    this.pyramidScratch = new Float32Array(width * height);
    this.keyImg = new Float32Array(width * height);
    this.invalidateFrames();
  }

  public invalidateFrames() {
    this.hasPrev = false;
    this.hasCurr = false;
    this.keyCount = 0;
    this.invalidateFeatures();
  }

  public invalidateFeatures() {
    this.featureCount = 0;
    this.isLocked = false;
    this.isLost = false;
    this.velAx = this.velAy = this.velBx = this.velBy = 0;
  }

  /** Intercambia prev/curr y devuelve el buffer de luminancia (nivel 0) que se debe llenar */
  public beginFrame(): Float32Array {
    const tmp = this.prevGrayBuffer;
    this.prevGrayBuffer = this.currGrayBuffer;
    this.currGrayBuffer = tmp;
    return this.currGrayBuffer[0].img;
  }

  /** Deshace beginFrame() (fotograma duplicado): restaura el fotograma actual previo */
  public rollbackFrame() {
    const tmp = this.prevGrayBuffer;
    this.prevGrayBuffer = this.currGrayBuffer;
    this.currGrayBuffer = tmp;
  }

  public isFrameIdenticalToPrevious(): boolean {
    if (!this.hasCurr) return false;
    const a = this.currGrayBuffer[0].img;
    const b = this.prevGrayBuffer[0].img;
    for (let i = 0; i < a.length; i += 61) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  public commitFrame() {
    buildPyramid(this.currGrayBuffer, this.pyramidScratch);
    this.hasPrev = this.hasCurr;
    this.hasCurr = true;
  }

  public setPose(a: Point2D, b: Point2D) {
    this.anchorA = { x: a.x, y: a.y };
    this.anchorB = { x: b.x, y: b.y };
  }

  /** Fija el seguimiento: detecta las nubes Shi-Tomasi alrededor de ambas anclas en el fotograma actual */
  public lock(): boolean {
    if (!this.hasCurr) return false;
    const d = Math.hypot(this.anchorB.x - this.anchorA.x, this.anchorB.y - this.anchorA.y);
    if (d < 8) return false;
    this.featureCount = 0;
    this.velAx = this.velAy = this.velBx = this.velBy = 0;
    this.seedCloud(CLOUD_A, FEATURES_PER_ANCHOR);
    this.seedCloud(CLOUD_B, FEATURES_PER_ANCHOR);
    this.framesSinceSeed[0] = 0;
    this.framesSinceSeed[1] = 0;
    this.referenceDist = d;
    this.isLocked = true;
    this.isLost = false;
    this.lostFrames = 0;

    this.keyImg.set(this.currGrayBuffer[0].img);
    this.keyCount = this.featureCount;
    this.keyX.set(this.fx);
    this.keyY.set(this.fy);
    this.keyCloud.set(this.fCloud);
    this.keyA = { x: this.anchorA.x, y: this.anchorA.y };
    this.keyB = { x: this.anchorB.x, y: this.anchorB.y };
    this.framesSinceKeyCheck = 0;

    this.inliersA = this.countCloud(CLOUD_A);
    this.inliersB = this.countCloud(CLOUD_B);
    this.inlierRatio = 1;
    this.confidence = Math.min(1, (this.inliersA + this.inliersB) / 10);
    return true;
  }

  public forEachFeature(cb: (x: number, y: number, cloud: number, inlier: boolean) => void) {
    for (let i = 0; i < this.featureCount; i++) {
      cb(this.fx[i], this.fy[i], this.fCloud[i], this.fInlier[i] === 1);
    }
  }

  public countCloud(cloud: number): number {
    let c = 0;
    for (let i = 0; i < this.featureCount; i++) {
      if (this.fCloud[i] === cloud) c++;
    }
    return c;
  }

  private halfWidthAt(u: number): number {
    if (u <= 0) return this.nutHalfWidthRatio;
    const t = Math.min(1, u / Math.max(0.1, this.endU));
    return this.nutHalfWidthRatio + (this.endHalfWidthRatio - this.nutHalfWidthRatio) * t;
  }

  private insideCloudRegion(cloud: number, x: number, y: number, margin: number): boolean {
    const A = this.anchorA;
    const ax = this.anchorB.x - A.x;
    const ay = this.anchorB.y - A.y;
    const d2 = ax * ax + ay * ay;
    if (d2 < 1e-6) return false;
    const rx = x - A.x;
    const ry = y - A.y;
    const u = (rx * ax + ry * ay) / d2;
    const v = (ry * ax - rx * ay) / d2;
    const center = cloud === CLOUD_A ? 0 : 1;
    if (Math.abs(u - center) > CLOUD_HALF_LENGTH * margin) return false;
    return Math.abs(v) <= this.halfWidthAt(u) * CLOUD_WIDTH_FACTOR * margin;
  }

  /** Good Features to Track (Shi-Tomasi): λmin del tensor de estructura 5x5 dentro de la región del ancla */
  private seedCloud(cloud: number, maxNew: number): number {
    if (!this.hasCurr || maxNew <= 0 || this.featureCount >= MAX_FEATURES) return 0;
    const level = this.currGrayBuffer[0];
    const w = level.width;
    const h = level.height;
    const gxArr = level.gx;
    const gyArr = level.gy;

    const A = this.anchorA;
    const B = this.anchorB;
    const ax = B.x - A.x;
    const ay = B.y - A.y;
    const d = Math.hypot(ax, ay);
    if (d < 1e-3) return 0;
    const ux = ax / d;
    const uy = ay / d;
    const center = cloud === CLOUD_A ? 0 : 1;
    const halfLen = CLOUD_HALF_LENGTH * d;
    const halfWid = Math.max(this.halfWidthAt(center - CLOUD_HALF_LENGTH), this.halfWidthAt(center + CLOUD_HALF_LENGTH)) * CLOUD_WIDTH_FACTOR * d;
    const cx = A.x + ax * center;
    const cy = A.y + ay * center;
    const extX = Math.abs(ux) * halfLen + Math.abs(uy) * halfWid;
    const extY = Math.abs(uy) * halfLen + Math.abs(ux) * halfWid;

    const margin = LK_WIN_RADIUS + SHI_TOMASI_BLOCK_RADIUS + 2;
    const x0 = Math.max(margin, Math.floor(cx - extX));
    const x1 = Math.min(w - 1 - margin, Math.ceil(cx + extX));
    const y0 = Math.max(margin, Math.floor(cy - extY));
    const y1 = Math.min(h - 1 - margin, Math.ceil(cy + extY));
    if (x1 <= x0 || y1 <= y0) return 0;

    const bw = x1 - x0 + 1;
    const bh = y1 - y0 + 1;
    if (this.seedScores.length < bw * bh) this.seedScores = new Float32Array(bw * bh);
    const scores = this.seedScores;
    const R = SHI_TOMASI_BLOCK_RADIUS;
    const blockArea = (2 * R + 1) * (2 * R + 1);
    let maxScore = 0;

    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const k = (y - y0) * bw + (x - x0);
        if (!this.insideCloudRegion(cloud, x, y, 1)) {
          scores[k] = 0;
          continue;
        }
        let sxx = 0;
        let sxy = 0;
        let syy = 0;
        for (let by = -R; by <= R; by++) {
          let i = (y + by) * w + x - R;
          for (let bx = -R; bx <= R; bx++, i++) {
            const gx = gxArr[i];
            const gy = gyArr[i];
            sxx += gx * gx;
            sxy += gx * gy;
            syy += gy * gy;
          }
        }
        const half = 0.5 * (sxx - syy);
        const lambdaMin = (0.5 * (sxx + syy) - Math.sqrt(half * half + sxy * sxy)) / blockArea;
        scores[k] = lambdaMin;
        if (lambdaMin > maxScore) maxScore = lambdaMin;
      }
    }

    const threshold = Math.max(SHI_TOMASI_MIN_EIGEN, maxScore * SHI_TOMASI_QUALITY);
    const candidates: number[] = [];
    for (let y = 1; y < bh - 1; y++) {
      for (let x = 1; x < bw - 1; x++) {
        const k = y * bw + x;
        const s = scores[k];
        if (s < threshold) continue;
        if (
          s < scores[k - 1] || s < scores[k + 1] ||
          s < scores[k - bw] || s < scores[k + bw] ||
          s < scores[k - bw - 1] || s < scores[k - bw + 1] ||
          s < scores[k + bw - 1] || s < scores[k + bw + 1]
        ) continue;
        candidates.push(k);
      }
    }
    candidates.sort((p, q) => scores[q] - scores[p]);

    const minDistSq = FEATURE_MIN_DISTANCE * FEATURE_MIN_DISTANCE;
    let added = 0;
    for (let c = 0; c < candidates.length && added < maxNew && this.featureCount < MAX_FEATURES; c++) {
      const k = candidates[c];
      const x = x0 + (k % bw);
      const y = y0 + Math.floor(k / bw);
      let tooClose = false;
      for (let i = 0; i < this.featureCount; i++) {
        const ddx = this.fx[i] - x;
        const ddy = this.fy[i] - y;
        if (ddx * ddx + ddy * ddy < minDistSq) {
          tooClose = true;
          break;
        }
      }
      if (tooClose) continue;
      const n = this.featureCount++;
      this.fx[n] = x;
      this.fy[n] = y;
      this.fCloud[n] = cloud;
      this.fStrikes[n] = 0;
      this.fInlier[n] = 1;
      added++;
    }
    return added;
  }

  private nextRandom(): number {
    // xorshift32: determinista y sin asignaciones
    let s = this.randomState;
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    this.randomState = s >>> 0;
    return this.randomState / 4294967296;
  }

  private trackFeature(i: number, guessX: number, guessY: number): boolean {
    const px = this.fx[i];
    const py = this.fy[i];
    const out = this.lkOut;
    if (!trackPointLK(this.prevGrayBuffer, this.currGrayBuffer, px, py, guessX, guessY, out)) return false;
    if (out[2] > LK_MAX_RESIDUAL) return false;
    const qx = out[0];
    const qy = out[1];
    const err = out[2];
    if (!trackPointLK(this.currGrayBuffer, this.prevGrayBuffer, qx, qy, px, py, out)) return false;
    const fbx = out[0] - px;
    const fby = out[1] - py;
    if (fbx * fbx + fby * fby > FB_MAX_ERROR * FB_MAX_ERROR) return false;
    this.nx[i] = qx;
    this.ny[i] = qy;
    this.fErr[i] = err;
    return true;
  }

  /** Marca inliers respecto a la similitud s; devuelve el número de inliers */
  private markInliers(s: Similarity, tau: number): number {
    const tauSq = tau * tau;
    let count = 0;
    for (let i = 0; i < this.featureCount; i++) {
      if (!this.fStatus[i]) {
        this.fInlier[i] = 0;
        continue;
      }
      const px = this.fx[i];
      const py = this.fy[i];
      const ex = s.a * px - s.b * py + s.tx - this.nx[i];
      const ey = s.b * px + s.a * py + s.ty - this.ny[i];
      const r2 = ex * ex + ey * ey;
      this.residual[i] = Math.sqrt(r2);
      const inlier = r2 < tauSq ? 1 : 0;
      this.fInlier[i] = inlier;
      count += inlier;
    }
    return count;
  }

  /** Mínimos cuadrados de la similitud sobre los inliers marcados */
  private fitInliers(out: Similarity): boolean {
    let n = 0;
    let mpx = 0, mpy = 0, mqx = 0, mqy = 0;
    for (let i = 0; i < this.featureCount; i++) {
      if (!this.fInlier[i]) continue;
      mpx += this.fx[i];
      mpy += this.fy[i];
      mqx += this.nx[i];
      mqy += this.ny[i];
      n++;
    }
    if (n < 2) return false;
    mpx /= n;
    mpy /= n;
    mqx /= n;
    mqy /= n;
    let sxx = 0, sdot = 0, scross = 0;
    for (let i = 0; i < this.featureCount; i++) {
      if (!this.fInlier[i]) continue;
      const dx = this.fx[i] - mpx;
      const dy = this.fy[i] - mpy;
      const ex = this.nx[i] - mqx;
      const ey = this.ny[i] - mqy;
      sxx += dx * dx + dy * dy;
      sdot += dx * ex + dy * ey;
      scross += dx * ey - dy * ex;
    }
    if (sxx < 1e-6) {
      out.a = 1;
      out.b = 0;
    } else {
      out.a = sdot / sxx;
      out.b = scross / sxx;
    }
    out.tx = mqx - (out.a * mpx - out.b * mpy);
    out.ty = mqy - (out.b * mpx + out.a * mpy);
    return true;
  }

  private msacCost(s: Similarity, tauSq: number, validCount: number): number {
    let cost = 0;
    for (let k = 0; k < validCount; k++) {
      const i = this.validIdx[k];
      const px = this.fx[i];
      const py = this.fy[i];
      const ex = s.a * px - s.b * py + s.tx - this.nx[i];
      const ey = s.b * px + s.a * py + s.ty - this.ny[i];
      const r2 = ex * ex + ey * ey;
      cost += r2 < tauSq ? r2 : tauSq;
    }
    return cost;
  }

  /** RANSAC (MSAC) de 2 puntos sobre ambas nubes, con hipótesis extra de velocidad constante e identidad */
  private estimateRigidMotion(tau: number, pred: Similarity, out: Similarity): boolean {
    let validCount = 0;
    let countA = 0;
    let countB = 0;
    for (let i = 0; i < this.featureCount; i++) {
      if (!this.fStatus[i]) continue;
      this.validIdx[validCount++] = i;
      if (this.fCloud[i] === CLOUD_A) this.cloudIdxA[countA++] = i;
      else this.cloudIdxB[countB++] = i;
    }
    if (validCount < 3) return false;

    const tauSq = tau * tau;
    const d = Math.hypot(this.anchorB.x - this.anchorA.x, this.anchorB.y - this.anchorA.y);
    const minPairDistSq = (0.12 * d) * (0.12 * d);
    const trial = this.simTry;

    copySimilarity(out, pred);
    let bestCost = this.msacCost(pred, tauSq, validCount);
    setIdentity(trial);
    let cost = this.msacCost(trial, tauSq, validCount);
    if (cost < bestCost) {
      bestCost = cost;
      copySimilarity(out, trial);
    }

    for (let it = 0; it < RANSAC_ITERATIONS; it++) {
      let i: number;
      let j: number;
      if (countA > 0 && countB > 0 && it % 3 !== 2) {
        i = this.cloudIdxA[Math.floor(this.nextRandom() * countA)];
        j = this.cloudIdxB[Math.floor(this.nextRandom() * countB)];
      } else {
        i = this.validIdx[Math.floor(this.nextRandom() * validCount)];
        j = this.validIdx[Math.floor(this.nextRandom() * validCount)];
        if (i === j) continue;
      }
      const dpx = this.fx[j] - this.fx[i];
      const dpy = this.fy[j] - this.fy[i];
      if (dpx * dpx + dpy * dpy < minPairDistSq) continue;
      if (!similarityFromPairs(
        trial,
        this.fx[i], this.fy[i], this.fx[j], this.fy[j],
        this.nx[i], this.ny[i], this.nx[j], this.ny[j]
      )) continue;
      const s = Math.hypot(trial.a, trial.b);
      if (Math.abs(s - 1) > 0.25 || Math.abs(Math.atan2(trial.b, trial.a)) > MAX_ROTATION_STEP * 2) continue;
      cost = this.msacCost(trial, tauSq, validCount);
      if (cost < bestCost) {
        bestCost = cost;
        copySimilarity(out, trial);
      }
    }

    if (this.markInliers(out, tau) < 3) return false;
    for (let refine = 0; refine < 2; refine++) {
      if (!this.fitInliers(out)) return false;
      if (this.markInliers(out, tau) < 3) return false;
    }
    return true;
  }

  /** Mezcla rotación/escala con la predicción cuando los inliers están concentrados (mal condicionado) */
  private conditionSimilarity(pred: Similarity, out: Similarity, d: number) {
    let n = 0;
    let mpx = 0, mpy = 0, mqx = 0, mqy = 0;
    for (let i = 0; i < this.featureCount; i++) {
      if (!this.fInlier[i]) continue;
      mpx += this.fx[i];
      mpy += this.fy[i];
      mqx += this.nx[i];
      mqy += this.ny[i];
      n++;
    }
    if (n === 0) return;
    mpx /= n;
    mpy /= n;
    mqx /= n;
    mqy /= n;
    let spreadSq = 0;
    for (let i = 0; i < this.featureCount; i++) {
      if (!this.fInlier[i]) continue;
      const dx = this.fx[i] - mpx;
      const dy = this.fy[i] - mpy;
      spreadSq += dx * dx + dy * dy;
    }
    const spread = Math.sqrt(spreadSq / n) / Math.max(1e-3, d);
    const weight = clamp(spread / MIN_CONDITIONING_SPREAD, 0.1, 1);

    let theta = Math.atan2(out.b, out.a);
    let logS = Math.log(Math.max(1e-3, Math.hypot(out.a, out.b)));
    if (weight < 1) {
      const thetaPred = Math.atan2(pred.b, pred.a);
      const logSPred = Math.log(Math.max(1e-3, Math.hypot(pred.a, pred.b)));
      theta = thetaPred + weight * wrapAngle(theta - thetaPred);
      logS = logSPred + weight * (logS - logSPred);
    }
    const s = Math.exp(logS);
    out.a = s * Math.cos(theta);
    out.b = s * Math.sin(theta);
    out.tx = mqx - (out.a * mpx - out.b * mpy);
    out.ty = mqy - (out.b * mpx + out.a * mpy);
  }

  /**
   * Similitud local de una nube (mínimos cuadrados ponderados por el error LK de cada punto).
   * Recoge el movimiento propio de cada extremo del mástil (perspectiva / escorzo) y baja el peso
   * de puntos parcialmente tapados por la mano. Devuelve el número de inliers usados (0 si no aplica).
   */
  private fitCloudSimilarity(cloud: number, out: Similarity): number {
    let n = 0;
    let sw = 0;
    let mpx = 0, mpy = 0, mqx = 0, mqy = 0;
    for (let i = 0; i < this.featureCount; i++) {
      if (!this.fInlier[i] || this.fCloud[i] !== cloud) continue;
      const e = this.fErr[i] / LK_ERROR_SOFT;
      const wgt = 1 / (1 + e * e);
      sw += wgt;
      mpx += wgt * this.fx[i];
      mpy += wgt * this.fy[i];
      mqx += wgt * this.nx[i];
      mqy += wgt * this.ny[i];
      n++;
    }
    if (n < 3 || sw < 1e-6) return 0;
    mpx /= sw;
    mpy /= sw;
    mqx /= sw;
    mqy /= sw;
    let sxx = 0, sdot = 0, scross = 0;
    for (let i = 0; i < this.featureCount; i++) {
      if (!this.fInlier[i] || this.fCloud[i] !== cloud) continue;
      const e = this.fErr[i] / LK_ERROR_SOFT;
      const wgt = 1 / (1 + e * e);
      const dx = this.fx[i] - mpx;
      const dy = this.fy[i] - mpy;
      const ex = this.nx[i] - mqx;
      const ey = this.ny[i] - mqy;
      sxx += wgt * (dx * dx + dy * dy);
      sdot += wgt * (dx * ex + dy * ey);
      scross += wgt * (dx * ey - dy * ex);
    }
    if (sxx / sw < 4) return 0;
    out.a = sdot / sxx;
    out.b = scross / sxx;
    out.tx = mqx - (out.a * mpx - out.b * mpy);
    out.ty = mqy - (out.b * mpx + out.a * mpy);
    return n;
  }

  /** Mueve un ancla con la similitud local de su nube si es coherente con la global; si no, con la global */
  private moveAnchor(cloud: number, p: Point2D, global: Similarity, tau: number, out: Point2D): number {
    const gx = global.a * p.x - global.b * p.y + global.tx;
    const gy = global.b * p.x + global.a * p.y + global.ty;
    out.x = gx;
    out.y = gy;
    const local = this.simLocal;
    const n = this.fitCloudSimilarity(cloud, local);
    if (n < 3) return n;
    const lx = local.a * p.x - local.b * p.y + local.tx;
    const ly = local.b * p.x + local.a * p.y + local.ty;
    if ((lx - gx) * (lx - gx) + (ly - gy) * (ly - gy) <= tau * tau) {
      out.x = lx;
      out.y = ly;
    }
    return n;
  }

  /**
   * Corrección de deriva: re-empareja los puntos del keyframe (fijados al pulsar "Fijar Tracking")
   * contra el fotograma actual con plantillas giradas/escaladas, y empuja suavemente cada ancla hacia
   * la mediana de esos desplazamientos. Sin esto, el error subpíxel del flujo óptico se acumula.
   */
  private correctDriftWithKeyframe(tau: number) {
    if (this.keyCount === 0) return;
    const T = this.simTry;
    if (!similarityFromPairs(
      T,
      this.keyA.x, this.keyA.y, this.keyB.x, this.keyB.y,
      this.anchorA.x, this.anchorA.y, this.anchorB.x, this.anchorB.y
    )) return;
    const sT = Math.hypot(T.a, T.b);
    if (sT < KEYFRAME_MIN_SCALE || sT > KEYFRAME_MAX_SCALE) return;
    const curr = this.currGrayBuffer[0];
    const out = this.lkOut;
    const maxOffsetSq = tau * tau * 1.5;
    const local = this.simLocal;

    for (let cloud = CLOUD_A; cloud <= CLOUD_B; cloud++) {
      // Dos pasadas: la 2ª re-muestrea las plantillas con la escala/rotación local de esta nube
      // (bajo perspectiva cada extremo del mástil escala distinto)
      copySimilarity(local, T);
      let ok = false;
      for (let pass = 0; pass < 2; pass++) {
        const s2 = local.a * local.a + local.b * local.b;
        const ia = local.a / s2;
        const ib = local.b / s2;
        let n = 0;
        for (let j = 0; j < this.keyCount; j++) {
          if (this.keyCloud[j] !== cloud) continue;
          const kx = this.keyX[j];
          const ky = this.keyY[j];
          const qx = local.a * kx - local.b * ky + local.tx;
          const qy = local.b * kx + local.a * ky + local.ty;
          if (!refineWarpedTemplateLK(this.keyImg, this.width, this.height, kx, ky, ia, ib, curr, qx, qy, out)) continue;
          if (out[2] > LK_MAX_RESIDUAL * 0.8) continue;
          const ox = out[0] - qx;
          const oy = out[1] - qy;
          if (ox * ox + oy * oy > maxOffsetSq) continue;
          this.kfKeyX[n] = kx;
          this.kfKeyY[n] = ky;
          this.kfOffX[n] = ox;
          this.kfOffY[n] = oy;
          n++;
        }
        if (n < 3) break;

        // Mediana robusta del desplazamiento y recorte de outliers (mano, reflejos) antes del ajuste
        this.kfSortX.set(this.kfOffX.subarray(0, n));
        this.kfSortY.set(this.kfOffY.subarray(0, n));
        const mx = medianInPlace(this.kfSortX, n);
        const my = medianInPlace(this.kfSortY, n);
        const trimSq = Math.max(1, tau * 0.5) ** 2;
        let kept = 0;
        let mkx = 0, mky = 0, mrx = 0, mry = 0;
        for (let j = 0; j < n; j++) {
          const dx = this.kfOffX[j] - mx;
          const dy = this.kfOffY[j] - my;
          if (dx * dx + dy * dy > trimSq) {
            this.kfOffX[j] = NaN;
            continue;
          }
          const kx = this.kfKeyX[j];
          const ky = this.kfKeyY[j];
          mkx += kx;
          mky += ky;
          mrx += local.a * kx - local.b * ky + local.tx + this.kfOffX[j];
          mry += local.b * kx + local.a * ky + local.ty + this.kfOffY[j];
          kept++;
        }
        if (kept < 3) break;
        mkx /= kept;
        mky /= kept;
        mrx /= kept;
        mry /= kept;
        let sxx = 0, sdot = 0, scross = 0;
        for (let j = 0; j < n; j++) {
          if (Number.isNaN(this.kfOffX[j])) continue;
          const kx = this.kfKeyX[j];
          const ky = this.kfKeyY[j];
          const dx = kx - mkx;
          const dy = ky - mky;
          const ex = local.a * kx - local.b * ky + local.tx + this.kfOffX[j] - mrx;
          const ey = local.b * kx + local.a * ky + local.ty + this.kfOffY[j] - mry;
          sxx += dx * dx + dy * dy;
          sdot += dx * ex + dy * ey;
          scross += dx * ey - dy * ex;
        }
        if (sxx < 4 * kept) {
          // Nube demasiado compacta para estimar escala local: solo traslación
          local.tx += mx;
          local.ty += my;
        } else {
          const na = sdot / sxx;
          const nb = scross / sxx;
          if (Math.abs(Math.hypot(na, nb) / Math.hypot(local.a, local.b) - 1) > 0.2) break;
          local.a = na;
          local.b = nb;
          local.tx = mrx - (na * mkx - nb * mky);
          local.ty = mry - (nb * mkx + na * mky);
        }
        ok = true;
      }
      if (!ok) continue;

      const key = cloud === CLOUD_A ? this.keyA : this.keyB;
      const anchor = cloud === CLOUD_A ? this.anchorA : this.anchorB;
      let cx = local.a * key.x - local.b * key.y + local.tx - anchor.x;
      let cy = local.b * key.x + local.a * key.y + local.ty - anchor.y;
      const len = Math.hypot(cx, cy);
      if (len > tau) {
        cx *= tau / len;
        cy *= tau / len;
      }
      anchor.x += cx * KEYFRAME_GAIN;
      anchor.y += cy * KEYFRAME_GAIN;
    }
  }

  /**
   * Paso de seguimiento entre prevGrayBuffer y currGrayBuffer.
   * Devuelve false si no hubo consenso suficiente (la pose se congela en la última posición válida).
   */
  public track(): boolean {
    if (!this.isLocked || !this.hasPrev || !this.hasCurr) return false;
    const A = this.anchorA;
    const B = this.anchorB;
    const dPrev = Math.hypot(B.x - A.x, B.y - A.y);
    if (dPrev < 4) {
      this.isLocked = false;
      return false;
    }
    this.framesSinceSeed[0]++;
    this.framesSinceSeed[1]++;

    const pred = this.simPred;
    const gain = VELOCITY_PREDICTION_GAIN;
    if (!similarityFromPairs(
      pred,
      A.x, A.y, B.x, B.y,
      A.x + this.velAx * gain, A.y + this.velAy * gain,
      B.x + this.velBx * gain, B.y + this.velBy * gain
    )) setIdentity(pred);

    const n = this.featureCount;
    for (let i = 0; i < n; i++) {
      const px = this.fx[i];
      const py = this.fy[i];
      this.fStatus[i] = this.trackFeature(
        i,
        pred.a * px - pred.b * py + pred.tx,
        pred.b * px + pred.a * py + pred.ty
      ) ? 1 : 0;
      this.fInlier[i] = 0;
    }

    const tau = clamp(dPrev * 0.015, 1.5, 4);
    const sim = this.sim;
    let solved = this.estimateRigidMotion(tau, pred, sim);

    if (solved) {
      // Re-rastreo guiado: los puntos fallidos u outliers se reintentan partiendo de la similitud consensuada
      let recovered = 0;
      for (let i = 0; i < n; i++) {
        if (this.fInlier[i]) continue;
        const px = this.fx[i];
        const py = this.fy[i];
        const gx = sim.a * px - sim.b * py + sim.tx;
        const gy = sim.b * px + sim.a * py + sim.ty;
        if (!this.trackFeature(i, gx, gy)) continue;
        this.fStatus[i] = 1;
        const ex = this.nx[i] - gx;
        const ey = this.ny[i] - gy;
        if (ex * ex + ey * ey < tau * tau) recovered++;
      }
      if (recovered > 0) {
        this.markInliers(sim, tau);
        solved = this.fitInliers(sim) && this.markInliers(sim, tau) >= 3;
      }
    }

    let inlierCount = 0;
    if (solved) {
      this.conditionSimilarity(pred, sim, dPrev);
      inlierCount = this.markInliers(sim, tau);
      solved = inlierCount >= 3;
    }

    if (solved) {
      const movedA = { x: 0, y: 0 };
      const movedB = { x: 0, y: 0 };
      this.inliersA = this.moveAnchor(CLOUD_A, A, sim, tau, movedA);
      this.inliersB = this.moveAnchor(CLOUD_B, B, sim, tau, movedB);

      let newAx = movedA.x;
      let newAy = movedA.y;
      let newBx = movedB.x;
      let newBy = movedB.y;

      // Restricción de cuerpo rígido 1D: |AB| solo puede variar suavemente (escala por acercamiento o
      // escorzo) y dentro de un rango respecto a referenceDist; el ancla con menos soporte se desliza
      // sobre el eje A–B hasta cumplirla. Lo mismo para saltos de rotación imposibles.
      const prevAngle = Math.atan2(B.y - A.y, B.x - A.x);
      const dNew = Math.hypot(newBx - newAx, newBy - newAy);
      const angNew = Math.atan2(newBy - newAy, newBx - newAx);
      const ref = this.referenceDist;
      const target = clamp(
        clamp(dNew, dPrev * (1 - MAX_SCALE_STEP), dPrev * (1 + MAX_SCALE_STEP)),
        ref * MIN_SCALE_RATIO,
        ref * MAX_SCALE_RATIO
      );
      const dAng = wrapAngle(angNew - prevAngle);
      const angTarget = prevAngle + clamp(dAng, -MAX_ROTATION_STEP, MAX_ROTATION_STEP);
      if (Math.abs(target - dNew) > 1e-3 || Math.abs(angTarget - angNew) > 1e-4) {
        const cosT = Math.cos(angTarget);
        const sinT = Math.sin(angTarget);
        if (this.inliersA >= this.inliersB) {
          newBx = newAx + cosT * target;
          newBy = newAy + sinT * target;
        } else {
          newAx = newBx - cosT * target;
          newAy = newBy - sinT * target;
        }
      }

      this.velAx = 0.4 * this.velAx + 0.6 * (newAx - A.x);
      this.velAy = 0.4 * this.velAy + 0.6 * (newAy - A.y);
      this.velBx = 0.4 * this.velBx + 0.6 * (newBx - B.x);
      this.velBy = 0.4 * this.velBy + 0.6 * (newBy - B.y);
      this.anchorA = { x: newAx, y: newAy };
      this.anchorB = { x: newBx, y: newBy };
      this.isLost = false;
      this.lostFrames = 0;

      if (++this.framesSinceKeyCheck >= KEYFRAME_CHECK_INTERVAL) {
        this.framesSinceKeyCheck = 0;
        this.correctDriftWithKeyframe(tau);
      }
    } else {
      this.isLost = true;
      this.lostFrames++;
      this.inliersA = 0;
      this.inliersB = 0;
      this.velAx *= 0.5;
      this.velAy *= 0.5;
      this.velBx *= 0.5;
      this.velBy *= 0.5;
    }

    this.maintainFeatures(solved, tau);
    this.replenishFeatures();

    this.inlierRatio = n > 0 ? inlierCount / n : 0;
    const raw = solved ? this.inlierRatio * Math.min(1, inlierCount / 8) : 0;
    this.confidence = this.confidence * 0.8 + raw * 0.2;
    return solved;
  }

  private maintainFeatures(solved: boolean, tau: number) {
    const border = LK_WIN_RADIUS + 1;
    const maxX = this.width - border - 1;
    const maxY = this.height - border - 1;
    let write = 0;
    for (let i = 0; i < this.featureCount; i++) {
      if (!this.fStatus[i]) continue;
      let strikes = this.fStrikes[i];
      if (solved) {
        if (this.fInlier[i]) {
          strikes = 0;
        } else {
          strikes++;
          if (strikes >= MAX_OUTLIER_STRIKES || this.residual[i] > tau * 3) continue;
        }
      }
      const x = this.nx[i];
      const y = this.ny[i];
      if (x < border || y < border || x > maxX || y > maxY) continue;
      if (!this.insideCloudRegion(this.fCloud[i], x, y, CLOUD_DRIFT_MARGIN)) continue;
      this.fx[write] = x;
      this.fy[write] = y;
      this.fCloud[write] = this.fCloud[i];
      this.fStrikes[write] = strikes;
      this.fInlier[write] = this.fInlier[i];
      write++;
    }
    this.featureCount = write;
  }

  private replenishFeatures() {
    for (let cloud = CLOUD_A; cloud <= CLOUD_B; cloud++) {
      const count = this.countCloud(cloud);
      const needed = FEATURES_PER_ANCHOR - count;
      if (needed <= 0) continue;
      const since = this.framesSinceSeed[cloud];
      let due: boolean;
      if (this.isLost) {
        due = since >= LOST_RESEED_INTERVAL_FRAMES;
      } else if (count < MIN_FEATURES_PER_ANCHOR) {
        due = since >= URGENT_RESEED_INTERVAL_FRAMES;
      } else {
        due = since >= REPLENISH_INTERVAL_FRAMES && count < FEATURES_PER_ANCHOR * 0.7;
      }
      if (!due) continue;
      this.seedCloud(cloud, needed);
      this.framesSinceSeed[cloud] = 0;
    }
  }
}

// =====================================================================
// FILTRO ONE-EURO 2D (suaviza el temblor en reposo sin añadir retardo al mover la guitarra)
// =====================================================================

class OneEuroFilter2D {
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;
  private x = 0;
  private y = 0;
  private dx = 0;
  private dy = 0;
  private initialized = false;

  constructor(minCutoff: number, beta: number, dCutoff: number) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
  }

  private static alpha(cutoff: number, dt: number): number {
    const tau = 2 * Math.PI * cutoff * dt;
    return tau / (1 + tau);
  }

  public reset(p: Point2D) {
    this.x = p.x;
    this.y = p.y;
    this.dx = 0;
    this.dy = 0;
    this.initialized = true;
  }

  public filter(p: Point2D, dt: number): Point2D {
    if (!this.initialized) {
      this.reset(p);
      return { x: p.x, y: p.y };
    }
    const ad = OneEuroFilter2D.alpha(this.dCutoff, dt);
    this.dx += ad * ((p.x - this.x) / dt - this.dx);
    this.dy += ad * ((p.y - this.y) / dt - this.dy);
    const a = OneEuroFilter2D.alpha(this.minCutoff + this.beta * Math.hypot(this.dx, this.dy), dt);
    this.x += a * (p.x - this.x);
    this.y += a * (p.y - this.y);
    return { x: this.x, y: this.y };
  }
}

// =====================================================================
// MOTOR AR (DOM): captura, geometría de recorte, calibración, interacción y render
// =====================================================================

interface FrameGeometry {
  procW: number;
  procH: number;
  hasCrop: boolean;
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  mirror: boolean;
}

export class GuitarVisionArEngine {
  private readonly tracker = new LucasKanadeNeckTracker();
  // beta alto: con la guitarra en movimiento el filtro casi no retrasa (el LK ya es subpíxel en reposo)
  private readonly filterA = new OneEuroFilter2D(1.5, 0.4, 2.0);
  private readonly filterB = new OneEuroFilter2D(1.5, 0.4, 2.0);
  private displayA: Point2D = { x: 0, y: 0 };
  private displayB: Point2D = { x: 0, y: 0 };
  private manualPins: NeckKeypoints | null = null;
  private manualPinsA: Point2D = { x: 0, y: 0 };
  private manualPinsB: Point2D = { x: 0, y: 0 };
  private manualPinsW = 0;
  private manualPinsH = 0;
  private poseIsDefault = true;
  private totalFrets = 24;

  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D | null;
  /**
   * Fotograma de cámara ya recortado/espejado tal como lo vio el tracker. El fondo se pinta desde aquí y no
   * desde el <video>: el video puede avanzar antes de que dispare requestVideoFrameCallback, y entonces la
   * malla (del fotograma anterior) se vería desfasada un fotograma en los movimientos rápidos.
   */
  private frameCanvas: HTMLCanvasElement;
  private frameCtx: CanvasRenderingContext2D | null;
  private frameCanvasValid = false;
  private geom: FrameGeometry = {
    procW: 0, procH: 0, hasCrop: false, sx: 0, sy: 0, sw: 0, sh: 0, mirror: true,
  };

  private pendingLock = false;
  /** Tras "Reset Pose" la malla queda quieta (sin LK) hasta que se arrastra un pin o se pulsa "Fijar Tracking" */
  private posePaused = false;
  private manualHoldUntil = 0;
  private trackingConfidence = 0.95;
  private lastFrameTime = performance.now();
  private lastTrackTime = performance.now();
  private smoothedFps = 60;

  private rvfcVideo: HTMLVideoElement | null = null;
  private rvfcActive = false;
  private frameSerial = 0;
  private processedSerial = -1;
  private lastSerialChangeTime = 0;

  // Máquina de estados: 'idle' | 'calibrating_vertical' | 'tracking'
  public state: EngineState = 'idle';
  private calibrationHoldFrames = 0;
  private calibDetected = false;
  private calibCorridor = {
    leftX: 0.45,
    rightX: 0.55,
    topY: 0.14,
    bottomY: 0.86,
  };
  private calibLadderFits: FretLadderFit[] = [];
  private calibLockRetries = 0;

  public trackingMode: 'hybrid-auto' | 'kalman-locked' | 'manual-calibration' = 'hybrid-auto';
  public showVisionDebug = true;
  public mirrorVideo = true;
  public invertStringsVertical = false;

  constructor() {
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });
    this.frameCanvas = document.createElement('canvas');
    this.frameCtx = this.frameCanvas.getContext('2d');
    this.updateGeometry(null, 960, 540);
  }

  /** Ancla A (Cejuela) en coordenadas normalizadas del canvas */
  public get anchorA(): Point2D {
    return this.toNormalized(this.displayA);
  }

  /** Ancla B (Traste 12) en coordenadas normalizadas del canvas */
  public get anchorB(): Point2D {
    return this.toNormalized(this.displayB);
  }

  public get referenceDist(): number {
    return this.tracker.referenceDist;
  }

  private get fret12U(): number {
    return Math.max(0.05, getNormalizedFretPosition(12, Math.max(1, this.totalFrets)));
  }

  private toNormalized(p: Point2D): Point2D {
    return { x: p.x / this.geom.procW, y: p.y / this.geom.procH };
  }

  private setPose(a: Point2D, b: Point2D) {
    this.tracker.setPose(a, b);
    this.displayA = { x: a.x, y: a.y };
    this.displayB = { x: b.x, y: b.y };
    this.filterA.reset(a);
    this.filterB.reset(b);
    this.manualPins = null;
  }

  /**
   * Pines tal como los soltó el usuario, movidos con el mástil desde entonces. El cuadrilátero del modelo es
   * simétrico y "corrige" cada pin; partir de él en el siguiente arrastre acumularía ese error.
   */
  private currentPins(): NeckKeypoints {
    const quad = this.computeQuad(this.displayA, this.displayB);
    const raw = this.manualPins;
    if (!raw || this.manualPinsW !== this.geom.procW || this.manualPinsH !== this.geom.procH) return quad;
    const a0 = this.manualPinsA;
    const b0 = this.manualPinsB;
    const dx0 = b0.x - a0.x;
    const dy0 = b0.y - a0.y;
    const dx1 = this.displayB.x - this.displayA.x;
    const dy1 = this.displayB.y - this.displayA.y;
    const den = dx0 * dx0 + dy0 * dy0;
    if (den < 1e-6) return quad;
    const ca = (dx0 * dx1 + dy0 * dy1) / den;
    const sa = (dx0 * dy1 - dy0 * dx1) / den;
    const map = (p: Point2D): Point2D => ({
      x: this.displayA.x + ca * (p.x - a0.x) - sa * (p.y - a0.y),
      y: this.displayA.y + sa * (p.x - a0.x) + ca * (p.y - a0.y),
    });
    return {
      nutTop: map(raw.nutTop),
      bridgeTop: map(raw.bridgeTop),
      bridgeBottom: map(raw.bridgeBottom),
      nutBottom: map(raw.nutBottom),
    };
  }

  private applyDefaultPose() {
    const w = this.geom.procW;
    const h = this.geom.procH;
    const vertical = h > w;
    const nut = vertical ? { x: 0.5 * w, y: 0.14 * h } : { x: 0.17 * w, y: 0.55 * h };
    const end = vertical ? { x: 0.5 * w, y: 0.86 * h } : { x: 0.85 * w, y: 0.43 * h };
    const u12 = this.fret12U;
    this.tracker.nutHalfWidthRatio = DEFAULT_NUT_HALF_WIDTH_RATIO;
    this.tracker.endHalfWidthRatio = DEFAULT_END_HALF_WIDTH_RATIO;
    this.setPose(nut, { x: nut.x + (end.x - nut.x) * u12, y: nut.y + (end.y - nut.y) * u12 });
    this.poseIsDefault = true;
  }

  /** Cuadrilátero del diapasón (cejuela → último traste) en px del buffer de proceso */
  private computeQuad(a: Point2D, b: Point2D): NeckKeypoints {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.max(1e-6, Math.hypot(dx, dy));
    const nx = -dy / d;
    const ny = dx / d;
    const endU = this.tracker.endU;
    const ex = a.x + dx * endU;
    const ey = a.y + dy * endU;
    const hn = this.tracker.nutHalfWidthRatio * d;
    const he = this.tracker.endHalfWidthRatio * d;
    return {
      nutTop: { x: a.x - nx * hn, y: a.y - ny * hn },
      bridgeTop: { x: ex - nx * he, y: ey - ny * he },
      bridgeBottom: { x: ex + nx * he, y: ey + ny * he },
      nutBottom: { x: a.x + nx * hn, y: a.y + ny * hn },
    };
  }

  private scaleQuad(q: NeckKeypoints, sx: number, sy: number): NeckKeypoints {
    return {
      nutTop: { x: q.nutTop.x * sx, y: q.nutTop.y * sy },
      bridgeTop: { x: q.bridgeTop.x * sx, y: q.bridgeTop.y * sy },
      bridgeBottom: { x: q.bridgeBottom.x * sx, y: q.bridgeBottom.y * sy },
      nutBottom: { x: q.nutBottom.x * sx, y: q.nutBottom.y * sy },
    };
  }

  /**
   * Mantiene el buffer de proceso con el MISMO recorte (object-fit: cover) y espejo que el canvas visible.
   * Si cambia (rotación del celular, cambio de cámara o de espejo) la pose se traslada a través de las
   * coordenadas de video para que la malla siga sobre la guitarra.
   */
  private updateGeometry(video: HTMLVideoElement | null, canvasWidth: number, canvasHeight: number) {
    const aspect = canvasWidth / Math.max(1, canvasHeight);
    let pw: number;
    let ph: number;
    if (aspect >= 1) {
      pw = PROC_LONG_SIDE;
      ph = Math.max(48, Math.round(PROC_LONG_SIDE / aspect));
    } else {
      ph = PROC_LONG_SIDE;
      pw = Math.max(48, Math.round(PROC_LONG_SIDE * aspect));
    }

    let hasCrop = false;
    let sx = 0, sy = 0, sw = 0, sh = 0;
    if (video && video.videoWidth > 0 && video.videoHeight > 0) {
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      hasCrop = true;
      if (vw / vh > aspect) {
        sh = vh;
        sw = vh * aspect;
        sx = (vw - sw) * 0.5;
      } else {
        sw = vw;
        sh = vw / aspect;
        sy = (vh - sh) * 0.5;
      }
    }

    const g = this.geom;
    const changed =
      g.procW !== pw || g.procH !== ph || g.mirror !== this.mirrorVideo || g.hasCrop !== hasCrop ||
      (hasCrop && (Math.abs(g.sx - sx) > 0.5 || Math.abs(g.sy - sy) > 0.5 ||
        Math.abs(g.sw - sw) > 0.5 || Math.abs(g.sh - sh) > 0.5));
    if (!changed) return;

    const next: FrameGeometry = { procW: pw, procH: ph, hasCrop, sx, sy, sw, sh, mirror: this.mirrorVideo };
    const migrate = (p: Point2D): Point2D => {
      if (g.hasCrop && next.hasCrop) {
        const xs = g.mirror ? g.procW - p.x : p.x;
        const vx = g.sx + (xs * g.sw) / g.procW;
        const vy = g.sy + (p.y * g.sh) / g.procH;
        const nxp = ((vx - next.sx) * next.procW) / next.sw;
        return { x: next.mirror ? next.procW - nxp : nxp, y: ((vy - next.sy) * next.procH) / next.sh };
      }
      const nx = (p.x / g.procW) * next.procW;
      return { x: g.mirror !== next.mirror ? next.procW - nx : nx, y: (p.y / g.procH) * next.procH };
    };

    const firstGeometry = g.procW === 0;
    const migratedA = firstGeometry ? null : migrate(this.tracker.anchorA);
    const migratedB = firstGeometry ? null : migrate(this.tracker.anchorB);

    if (!firstGeometry && g.mirror !== next.mirror) {
      const left = 1 - this.calibCorridor.rightX;
      this.calibCorridor.rightX = 1 - this.calibCorridor.leftX;
      this.calibCorridor.leftX = left;
    }

    this.geom = next;
    this.frameCanvasValid = false;
    if (this.offscreenCanvas.width !== pw || this.offscreenCanvas.height !== ph) {
      this.offscreenCanvas.width = pw;
      this.offscreenCanvas.height = ph;
    }
    this.tracker.resize(pw, ph);

    if (firstGeometry || this.poseIsDefault || !migratedA || !migratedB) {
      this.applyDefaultPose();
    } else {
      this.setPose(migratedA, migratedB);
    }
    if (this.state === 'tracking') this.pendingLock = true;
  }

  private ensureFrameCallback(video: HTMLVideoElement) {
    if (this.rvfcVideo === video) return;
    this.rvfcVideo = video;
    this.frameCanvasValid = false;
    this.rvfcActive = typeof video.requestVideoFrameCallback === 'function';
    this.lastSerialChangeTime = performance.now();
    if (!this.rvfcActive) return;
    const onFrame = () => {
      if (this.rvfcVideo !== video || !this.rvfcActive) return;
      this.frameSerial++;
      this.lastSerialChangeTime = performance.now();
      video.requestVideoFrameCallback(onFrame);
    };
    video.requestVideoFrameCallback(onFrame);
  }

  /**
   * Captura el fotograma de cámara en currGrayBuffer solo si es un fotograma NUEVO
   * (la cámara suele entregar 30 fps mientras el render corre a 60 Hz).
   */
  private ingestVideoFrame(video: HTMLVideoElement, now: number, outW: number, outH: number): boolean {
    if (!this.offscreenCtx || !this.frameCtx) return false;
    this.ensureFrameCallback(video);
    if (this.rvfcActive && this.frameSerial === this.processedSerial) {
      if (now - this.lastSerialChangeTime < RVFC_STALL_MS) return false;
      // requestVideoFrameCallback no dispara (p. ej. video oculto en algunos navegadores): usar detección por contenido
      this.rvfcActive = false;
    }

    const g = this.geom;
    const fc = this.frameCanvas;
    if (fc.width !== outW || fc.height !== outH) {
      fc.width = outW;
      fc.height = outH;
    }
    const fctx = this.frameCtx;
    fctx.save();
    if (g.mirror) {
      fctx.translate(outW, 0);
      fctx.scale(-1, 1);
    }
    fctx.drawImage(video, g.sx, g.sy, g.sw, g.sh, 0, 0, outW, outH);
    fctx.restore();
    this.frameCanvasValid = true;

    const ctx = this.offscreenCtx;
    ctx.drawImage(fc, 0, 0, outW, outH, 0, 0, g.procW, g.procH);
    const rgba = ctx.getImageData(0, 0, g.procW, g.procH).data;
    const gray = this.tracker.beginFrame();
    const total = g.procW * g.procH;
    for (let i = 0, p = 0; i < total; i++, p += 4) {
      gray[i] = (77 * rgba[p] + 150 * rgba[p + 1] + 29 * rgba[p + 2]) * (1 / 256);
    }

    if (!this.rvfcActive && this.tracker.isFrameIdenticalToPrevious()) {
      this.tracker.rollbackFrame();
      return false;
    }
    this.tracker.commitFrame();
    this.processedSerial = this.frameSerial;
    return true;
  }

  /**
   * Inicia la fase de calibración inicial vertical ('calibrating_vertical')
   */
  public startCalibration() {
    this.state = 'calibrating_vertical';
    this.calibrationHoldFrames = 0;
    this.calibDetected = false;
    this.calibLadderFits = [];
    this.calibLockRetries = 0;
    this.pendingLock = false;
    this.posePaused = false;
    this.trackingConfidence = 0.5;
    this.tracker.invalidateFeatures();
  }

  /**
   * "Fijar Tracking": detecta las nubes Shi-Tomasi alrededor de anchorA (Cejuela) y anchorB (Traste 12)
   * sobre el fotograma actual y arranca el flujo óptico. Si aún no hay fotograma, queda pendiente.
   */
  public lockTracking(): boolean {
    this.state = 'tracking';
    this.manualHoldUntil = 0;
    this.posePaused = false;
    this.tracker.setPose(this.displayA, this.displayB);
    if (!this.tracker.hasFrame) {
      this.pendingLock = true;
      return false;
    }
    const ok = this.tracker.lock();
    this.pendingLock = !ok;
    if (ok) {
      this.poseIsDefault = false;
      this.filterA.reset(this.tracker.anchorA);
      this.filterB.reset(this.tracker.anchorB);
      this.trackingConfidence = Math.max(this.trackingConfidence, 0.9);
    }
    return ok;
  }

  public getNormalizedKeypoints(): NeckKeypoints {
    const g = this.geom;
    return this.scaleQuad(this.computeQuad(this.displayA, this.displayB), 1 / g.procW, 1 / g.procH);
  }

  /**
   * Ajuste manual: cejuela y último traste son los puntos medios de sus dos pines (tal como se soltaron),
   * así se corrige posición, ángulo y grosor. Al soltar, el tracking se vuelve a fijar.
   */
  public setNormalizedKeypoint(key: keyof NeckKeypoints, pt: Point2D) {
    const g = this.geom;
    const p = { x: clamp(pt.x, 0.01, 0.99) * g.procW, y: clamp(pt.y, 0.01, 0.99) * g.procH };
    const pins = this.currentPins();
    pins[key] = p;
    const u12 = this.fret12U;
    const isNut = key === 'nutTop' || key === 'nutBottom';

    let nut: Point2D = { x: (pins.nutTop.x + pins.nutBottom.x) * 0.5, y: (pins.nutTop.y + pins.nutBottom.y) * 0.5 };
    let end: Point2D = {
      x: (pins.bridgeTop.x + pins.bridgeBottom.x) * 0.5,
      y: (pins.bridgeTop.y + pins.bridgeBottom.y) * 0.5,
    };

    let ax = end.x - nut.x;
    let ay = end.y - nut.y;
    let len = Math.hypot(ax, ay);
    const minLen = 0.12 * Math.min(g.procW, g.procH);
    if (len < minLen) {
      const prevAngle = Math.atan2(this.displayB.y - this.displayA.y, this.displayB.x - this.displayA.x);
      ax = Math.cos(prevAngle) * minLen;
      ay = Math.sin(prevAngle) * minLen;
      len = minLen;
      if (isNut) nut = { x: end.x - ax, y: end.y - ay };
      else end = { x: nut.x + ax, y: nut.y + ay };
    }

    const d = len * u12;
    const halfWidth = (a: Point2D, b: Point2D) => Math.abs(((a.x - b.x) * -ay + (a.y - b.y) * ax) / len) * 0.5;
    this.tracker.nutHalfWidthRatio = clamp(
      halfWidth(pins.nutTop, pins.nutBottom) / Math.max(1e-3, d), MIN_HALF_WIDTH_RATIO, MAX_HALF_WIDTH_RATIO
    );
    this.tracker.endHalfWidthRatio = clamp(
      halfWidth(pins.bridgeTop, pins.bridgeBottom) / Math.max(1e-3, d), MIN_HALF_WIDTH_RATIO, MAX_HALF_WIDTH_RATIO
    );

    this.setPose(nut, { x: nut.x + ax * u12, y: nut.y + ay * u12 });
    this.manualPins = pins;
    this.manualPinsA = { ...this.displayA };
    this.manualPinsB = { ...this.displayB };
    this.manualPinsW = g.procW;
    this.manualPinsH = g.procH;
    this.poseIsDefault = false;
    this.tracker.invalidateFeatures();
    this.state = 'tracking';
    this.pendingLock = true;
    this.posePaused = false;
    this.manualHoldUntil = performance.now() + MANUAL_DRAG_SETTLE_MS;
    this.trackingConfidence = 0.98;
  }

  /**
   * Vuelve a la pose por defecto y la deja quieta: fijar el LK sobre una pose que no coincide con el mástil
   * haría que la malla siguiera al fondo y se saliera del lienzo (pines inalcanzables).
   */
  public resetDefaultNeckPose() {
    this.applyDefaultPose();
    this.tracker.invalidateFeatures();
    this.pendingLock = false;
    this.posePaused = this.state === 'tracking';
    this.manualHoldUntil = 0;
    this.trackingConfidence = 0.96;
  }

  /** Captura el fotograma actual y fija el tracking sobre la pose actual de la malla */
  public autoScanNeckFromVideo(video: HTMLVideoElement): boolean {
    if (video.readyState < 2 || video.videoWidth === 0) return false;
    this.updateGeometry(video, this.geom.procW, this.geom.procH);
    this.ingestVideoFrame(
      video, performance.now(), this.frameCanvas.width || this.geom.procW, this.frameCanvas.height || this.geom.procH
    );
    return this.lockTracking();
  }

  /**
   * Paso de tracking por flujo óptico LK (solo con fotograma nuevo de cámara).
   */
  private updateTrackingStep(now: number) {
    if (this.posePaused || now < this.manualHoldUntil) return;
    if (this.pendingLock || !this.tracker.isLocked) {
      this.lockTracking();
      this.lastTrackTime = now;
      return;
    }

    this.tracker.track();
    const dt = clamp((now - this.lastTrackTime) / 1000, 1 / 120, 0.25);
    this.lastTrackTime = now;
    this.displayA = this.filterA.filter(this.tracker.anchorA, dt);
    this.displayB = this.filterB.filter(this.tracker.anchorB, dt);
    this.trackingConfidence = Math.min(0.99, this.tracker.confidence);
  }

  /**
   * Escalera para fijar la pose en el fotograma actual (la última de calibLadderFits): mediana de las
   * recientes que coinciden con ella; con la guitarra moviéndose las antiguas quedan fuera y la mediana no
   * llega tarde. Con allowMotion (tras agotar la espera) vale la actual sola si la anterior la sigue de
   * cerca: cada escalera es precisa por sí misma y los ajustes espurios saltan un traste entero.
   * 'unconfirmed' para seguir esperando; null si no hay trastes fiables (se usa la geometría de la guía).
   */
  private lockLadderFit(
    current: FretLadderFit | null,
    allowMotion: boolean
  ): { nutY: number; fret12Y: number } | 'unconfirmed' | null {
    const fits = this.calibLadderFits;
    if (!current) return fits.length && !allowMotion ? 'unconfirmed' : null;
    if (Math.abs(current.fret12Y - current.nutY) <= 8) return null;
    const tol = Math.max(1, CALIBRATION_LADDER_AGREEMENT * Math.abs(current.fret12Y - current.nutY));
    const near = (f: FretLadderFit, t: number) =>
      f.nutAtTop === current.nutAtTop && Math.abs(f.nutY - current.nutY) <= t && Math.abs(f.fret12Y - current.fret12Y) <= t;
    const agree = fits.filter((f) => near(f, tol));
    if (agree.length >= CALIBRATION_LOCK_MIN_AGREEING) {
      const median = (values: number[]) => {
        const s = [...values].sort((a, b) => a - b);
        const m = s.length >> 1;
        return s.length % 2 ? s[m] : 0.5 * (s[m - 1] + s[m]);
      };
      return { nutY: median(agree.map((f) => f.nutY)), fret12Y: median(agree.map((f) => f.fret12Y)) };
    }
    if (allowMotion && fits.length >= 2 && near(fits[fits.length - 2], 3 * tol)) {
      return { nutY: current.nutY, fret12Y: current.fret12Y };
    }
    return 'unconfirmed';
  }

  /**
   * Calibración Inicial Vertical Endurecida (detectVerticalNeck) sobre el fotograma actual:
   * 1. Filtro de Bordes Paralelos con Polaridad Opuesta: Busca un par de bordes verticales rectilíneos
   *    con signo de gradiente opuesto, separados entre el 8% y el 20% del ancho del frame.
   * 2. Rechazo de Formas Orgánicas: umbral Sobel X estricto y colinealidad en 3 tercios verticales.
   * 3. Filtro de Varianza Interna y Alta Frecuencia (Trastes/Cuerdas) dentro del corredor.
   * 4. Escalera de trastes: en los últimos frames se ajusta la ley temperada a los trastes visibles para
   *    ubicar la cejuela y el traste 12 reales (y su sentido) en vez de suponerlos en los bordes de la guía.
   * 5. Eje real del fotograma de bloqueo (inclinación + centro, estimateNeckAxis): la escalera se mide a lo
   *    largo de él y la pose no se supone vertical. Si la guitarra se mueve se espera a escaleras coincidentes.
   * Al completar 45 fotogramas fija la pose y arranca el flujo óptico.
   */
  private detectVerticalNeck(): boolean {
    const level = this.tracker.currentLevel0;
    if (!level) return false;

    const w = level.width;
    const h = level.height;
    const gray = level.img;

    const topRow = Math.floor(h * 0.14);
    const bottomRow = Math.floor(h * 0.86);
    const spanRows = bottomRow - topRow + 1;
    const minSearchX = Math.floor(w * 0.20);
    const maxSearchX = Math.floor(w * 0.80);

    const rawPosX = new Float32Array(w);
    const rawNegX = new Float32Array(w);

    const segSpan = Math.floor(spanRows / 3);
    const posSegHits = [new Uint16Array(w), new Uint16Array(w), new Uint16Array(w)];
    const negSegHits = [new Uint16Array(w), new Uint16Array(w), new Uint16Array(w)];

    const STRICT_SOBEL_X_THRESHOLD = 95;

    for (let y = topRow; y <= bottomRow; y++) {
      const row = y * w;
      const segIdx = Math.min(2, Math.floor((y - topRow) / Math.max(1, segSpan)));

      for (let x = minSearchX - 1; x <= maxSearchX + 1; x++) {
        const idx = row + x;
        const gx =
          -gray[idx - w - 1] +
          gray[idx - w + 1] -
          2 * gray[idx - 1] +
          2 * gray[idx + 1] -
          gray[idx + w - 1] +
          gray[idx + w + 1];

        const gy =
          -gray[idx - w - 1] -
          2 * gray[idx - w] -
          gray[idx - w + 1] +
          gray[idx + w - 1] +
          2 * gray[idx + w] +
          gray[idx + w + 1];

        const absGx = Math.abs(gx);
        const absGy = Math.abs(gy);

        if (absGx >= STRICT_SOBEL_X_THRESHOLD && absGx > absGy * 1.75) {
          if (gx > 0) {
            rawPosX[x] += gx;
            posSegHits[segIdx][x]++;
          } else {
            rawNegX[x] += -gx;
            negSegHits[segIdx][x]++;
          }
        }
      }
    }

    const posProfileX = new Float32Array(w);
    const negProfileX = new Float32Array(w);
    for (let x = minSearchX; x <= maxSearchX; x++) {
      posProfileX[x] = (rawPosX[x - 1] + 2 * rawPosX[x] + rawPosX[x + 1]) * 0.25;
      negProfileX[x] = (rawNegX[x - 1] + 2 * rawNegX[x] + rawNegX[x + 1]) * 0.25;
    }

    const minNeckWidthPx = Math.floor(w * 0.08);
    const maxNeckWidthPx = Math.floor(w * 0.20);
    const centerFrameX = w * 0.5;
    const minSegmentHits = Math.max(4, Math.floor(segSpan * 0.16));

    const hasStraightVerticalSupport = (segArray: Uint16Array[], x: number): boolean => {
      const s0 = segArray[0][x - 1] + segArray[0][x] + segArray[0][x + 1];
      const s1 = segArray[1][x - 1] + segArray[1][x] + segArray[1][x + 1];
      const s2 = segArray[2][x - 1] + segArray[2][x] + segArray[2][x + 1];
      return s0 >= minSegmentHits && s1 >= minSegmentHits && s2 >= minSegmentHits;
    };

    // Devuelve el número de filas con trastes horizontales, o -1 si el interior no parece un diapasón
    const evaluateInternalFretboardTexture = (lx: number, rx: number): number => {
      const innerLeft = lx + 2;
      const innerRight = rx - 2;
      if (innerRight <= innerLeft) return -1;

      let sumLum = 0;
      let sumLumSq = 0;
      let pixelCount = 0;
      let fretRows = 0;

      for (let y = topRow + 2; y <= bottomRow - 2; y++) {
        const row = y * w;
        let rowGyPeak = 0;

        for (let x = innerLeft; x <= innerRight; x++) {
          const idx = row + x;
          const val = gray[idx];
          sumLum += val;
          sumLumSq += val * val;
          pixelCount++;

          const gy =
            -gray[idx - w - 1] -
            2 * gray[idx - w] -
            gray[idx - w + 1] +
            gray[idx + w - 1] +
            2 * gray[idx + w] +
            gray[idx + w + 1];
          const gx =
            -gray[idx - w - 1] +
            gray[idx - w + 1] -
            2 * gray[idx - 1] +
            2 * gray[idx + 1] -
            gray[idx + w - 1] +
            gray[idx + w + 1];

          const absGy = Math.abs(gy);
          if (absGy >= 75 && absGy > Math.abs(gx) * 1.15) {
            if (absGy > rowGyPeak) rowGyPeak = absGy;
          }
        }

        if (rowGyPeak >= 80) fretRows++;
      }

      if (pixelCount === 0) return -1;
      const mean = sumLum / pixelCount;
      const variance = sumLumSq / pixelCount - mean * mean;
      return variance >= 240 && fretRows >= 10 ? fretRows : -1;
    };

    const minEdgeEnergy = spanRows * STRICT_SOBEL_X_THRESHOLD * 0.22;
    let bestScore = -Infinity;
    let bestLeftX = -1;
    let bestRightX = -1;

    for (let lx = minSearchX; lx <= maxSearchX - minNeckWidthPx; lx++) {
      const posLeft = posProfileX[lx];
      const negLeft = negProfileX[lx];
      if (posLeft < minEdgeEnergy && negLeft < minEdgeEnergy) continue;

      const leftStraightPos = posLeft >= minEdgeEnergy && hasStraightVerticalSupport(posSegHits, lx);
      const leftStraightNeg = negLeft >= minEdgeEnergy && hasStraightVerticalSupport(negSegHits, lx);
      if (!leftStraightPos && !leftStraightNeg) continue;

      const maxRx = Math.min(maxSearchX, lx + maxNeckWidthPx);
      for (let rx = lx + minNeckWidthPx; rx <= maxRx; rx++) {
        let oppositePairEnergy = 0;
        if (leftStraightPos && negProfileX[rx] >= minEdgeEnergy && hasStraightVerticalSupport(negSegHits, rx)) {
          const symmetry =
            1 - (Math.abs(posLeft - negProfileX[rx]) / (posLeft + negProfileX[rx] + 1e-3)) * 0.45;
          oppositePairEnergy = (posLeft + negProfileX[rx]) * 0.5 * symmetry;
        }

        if (leftStraightNeg && posProfileX[rx] >= minEdgeEnergy && hasStraightVerticalSupport(posSegHits, rx)) {
          const symmetry =
            1 - (Math.abs(negLeft - posProfileX[rx]) / (negLeft + posProfileX[rx] + 1e-3)) * 0.45;
          const candidateB = (negLeft + posProfileX[rx]) * 0.5 * symmetry;
          if (candidateB > oppositePairEnergy) oppositePairEnergy = candidateB;
        }

        if (oppositePairEnergy < minEdgeEnergy) continue;

        const midX = (lx + rx) * 0.5;
        const centerBias = 1 - (Math.abs(midX - centerFrameX) / (w * 0.5)) * 0.35;
        const preliminaryScore = oppositePairEnergy * centerBias;
        if (preliminaryScore <= bestScore) continue;
        const fretRows = evaluateInternalFretboardTexture(lx, rx);
        if (fretRows < 0) continue;

        const finalScore = preliminaryScore * Math.min(1.35, 1 + (fretRows / 40) * 0.35);
        if (finalScore > bestScore) {
          bestScore = finalScore;
          bestLeftX = lx;
          bestRightX = rx;
        }
      }
    }

    let isDetected = bestLeftX !== -1 && bestRightX !== -1 && bestScore >= minEdgeEnergy * 0.95;
    if (isDetected && this.calibrationHoldFrames >= CALIBRATION_GATE_FRAMES) {
      // Con el mástil inclinado más de ~4° el perfil vertical empareja bordes ajenos: otra anchura o un
      // salto de medio mástil no es el mismo diapasón
      const prevWidth = (this.calibCorridor.rightX - this.calibCorridor.leftX) * w;
      const prevCenter = (this.calibCorridor.leftX + this.calibCorridor.rightX) * 0.5 * w;
      if (
        Math.abs(bestRightX - bestLeftX - prevWidth) > 0.3 * prevWidth ||
        Math.abs((bestLeftX + bestRightX) * 0.5 - prevCenter) > 0.5 * prevWidth
      ) {
        isDetected = false;
      }
    }
    this.calibDetected = isDetected;

    let axis: NeckAxis | null = null;
    let currentFit: FretLadderFit | null = null;
    if (isDetected) {
      const blend = this.calibrationHoldFrames === 0 ? 1 : 0.35;
      this.calibCorridor.leftX += (bestLeftX / w - this.calibCorridor.leftX) * blend;
      this.calibCorridor.rightX += (bestRightX / w - this.calibCorridor.rightX) * blend;
      this.calibCorridor.topY = 0.14;
      this.calibCorridor.bottomY = 0.86;
      this.calibrationHoldFrames = Math.min(REQUIRED_CALIBRATION_FRAMES, this.calibrationHoldFrames + 1);
      this.trackingConfidence = Math.min(
        0.99,
        0.55 + (this.calibrationHoldFrames / REQUIRED_CALIBRATION_FRAMES) * 0.44
      );
      if (
        this.calibrationHoldFrames > REQUIRED_CALIBRATION_FRAMES - CALIBRATION_LADDER_FRAMES &&
        this.calibrationHoldFrames % 2 === 1
      ) {
        axis = estimateNeckAxis(gray, w, h, bestLeftX, bestRightX, topRow, bottomRow);
        currentFit = axis
          ? fitVerticalFretLadder(gray, w, h, axis.cx - axis.halfWidth, axis.cx + axis.halfWidth, this.totalFrets, axis.slope, axis.yRef)
          : fitVerticalFretLadder(gray, w, h, bestLeftX, bestRightX, this.totalFrets);
        if (currentFit) {
          this.calibLadderFits.push(currentFit);
          if (this.calibLadderFits.length > CALIBRATION_LADDER_FRAMES >> 1) this.calibLadderFits.shift();
        }
      }
    } else {
      this.calibrationHoldFrames = Math.max(0, this.calibrationHoldFrames - 3);
      this.trackingConfidence = Math.max(0.25, this.trackingConfidence - 0.04);
      this.calibLadderFits = [];
      this.calibLockRetries = 0;
    }

    if (this.calibrationHoldFrames < REQUIRED_CALIBRATION_FRAMES) return false;

    // La pose se fija en este fotograma: con la guitarra en movimiento la mediana de los anteriores llega tarde
    const ladder = this.lockLadderFit(currentFit, this.calibLockRetries >= CALIBRATION_LOCK_RETRIES);
    if (ladder === 'unconfirmed') {
      this.calibLockRetries = Math.min(CALIBRATION_LOCK_RETRIES, this.calibLockRetries + 1);
      this.calibrationHoldFrames = REQUIRED_CALIBRATION_FRAMES - 2;
      return false;
    }
    this.calibLadderFits = [];
    this.calibLockRetries = 0;

    const c = this.calibCorridor;
    const centerX = axis ? axis.cx : (c.leftX + c.rightX) * 0.5 * w;
    const slope = axis ? axis.slope : 0;
    const yRef = axis ? axis.yRef : 0;
    const halfWidthPx = axis
      ? clamp(axis.halfWidth, 0.04 * w, 0.1 * w)
      : clamp((c.rightX - c.leftX) * 0.5, 0.04, 0.10) * w;
    const u12 = this.fret12U;
    // Sin escalera de trastes fiable se asume la cejuela en el borde superior de la guía y el último traste abajo
    const nutY = ladder ? ladder.nutY : c.topY * h;
    const fret12Y = ladder ? ladder.fret12Y : nutY + (c.bottomY * h - nutY) * u12;
    // Medidas en índices de píxel (centro del píxel i en i); la pose usa coordenadas continuas (centro en
    // i + 0.5), que es lo que suponen toNormalized, el espejo procW − x y el dibujo de la malla
    const nut = { x: centerX + (nutY - yRef) * slope + 0.5, y: nutY + 0.5 };
    const fret12 = { x: centerX + (fret12Y - yRef) * slope + 0.5, y: fret12Y + 0.5 };
    const d = Math.hypot(fret12.x - nut.x, fret12.y - nut.y);
    this.tracker.nutHalfWidthRatio = clamp((halfWidthPx * 0.9) / d, MIN_HALF_WIDTH_RATIO, MAX_HALF_WIDTH_RATIO);
    this.tracker.endHalfWidthRatio = clamp((halfWidthPx * 1.06) / d, MIN_HALF_WIDTH_RATIO, MAX_HALF_WIDTH_RATIO);
    this.setPose(nut, fret12);
    this.poseIsDefault = false;
    this.trackingConfidence = 0.98;
    this.lockTracking();
    return true;
  }

  private drawCalibrationHud(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) {
    const isDetected = this.calibDetected;
    const rectX = this.calibCorridor.leftX * canvasWidth;
    const rectY = this.calibCorridor.topY * canvasHeight;
    const rectW = (this.calibCorridor.rightX - this.calibCorridor.leftX) * canvasWidth;
    const rectH = (this.calibCorridor.bottomY - this.calibCorridor.topY) * canvasHeight;
    const progress = this.calibrationHoldFrames / REQUIRED_CALIBRATION_FRAMES;

    ctx.save();
    if (isDetected) {
      ctx.shadowColor = '#00ff66';
      ctx.shadowBlur = 18;
      ctx.strokeStyle = '#00ff66';
      ctx.lineWidth = 3.5;
      ctx.strokeRect(rectX, rectY, rectW, rectH);
      ctx.fillStyle = 'rgba(0, 255, 102, 0.16)';
      ctx.fillRect(rectX, rectY, rectW, rectH);
    } else {
      // Guía central punteada: obliga a colocar el diapasón vertical con trastes visibles hacia la cámara
      const guideW = canvasWidth * 0.12;
      const guideX = (canvasWidth - guideW) * 0.5;
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
      ctx.lineWidth = 2;
      ctx.strokeRect(guideX, rectY, guideW, rectH);
    }

    const hudW = Math.min(400, canvasWidth * 0.9);
    const hudH = 60;
    const hudX = (canvasWidth - hudW) * 0.5;
    const hudY = canvasHeight - hudH - 36;

    ctx.shadowBlur = 0;
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(7, 9, 20, 0.92)';
    ctx.strokeStyle = isDetected ? '#00ff66' : 'rgba(56, 189, 248, 0.65)';
    ctx.lineWidth = 1.5;
    ctx.fillRect(hudX, hudY, hudW, hudH);
    ctx.strokeRect(hudX, hudY, hudW, hudH);

    ctx.fillStyle = isDetected ? '#00ff66' : '#e2e8f0';
    ctx.font = 'bold 11px Inter, monospace, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      isDetected && this.calibLockRetries > 0
        ? 'DIAPASÓN DETECTADO: MANTÉN QUIETA LA GUITARRA'
        : isDetected
        ? `DIAPASÓN DETECTADO: MANTÉN ${this.calibrationHoldFrames}/${REQUIRED_CALIBRATION_FRAMES} FRAMES (${Math.round(progress * 100)}%)`
        : `ALINEA EL DIAPASÓN VERTICAL EN EL CENTRO (${this.calibrationHoldFrames}/${REQUIRED_CALIBRATION_FRAMES})`,
      canvasWidth * 0.5,
      hudY + 21
    );

    const barW = hudW - 28;
    const barX = hudX + 14;
    const barY = hudY + 35;
    ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
    ctx.fillRect(barX, barY, barW, 12);
    ctx.fillStyle = '#00ff66';
    ctx.fillRect(barX, barY, barW * progress, 12);
    ctx.restore();
  }

  /**
   * Renderiza el frame de video + el overlay AR con proyección homográfica del diapasón rastreado
   */
  public renderArFrame(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    video: HTMLVideoElement | null,
    fretMatrix: FretNode[][],
    totalFrets: number,
    activeNote: DetectedNoteInfo | null,
    mode: 'reactive' | 'guided',
    boxFilter: number,
    hoveredKeypoint: keyof NeckKeypoints | null
  ): VisionTelemetry {
    const now = performance.now();
    const dt = Math.max(0.001, Math.min(0.1, (now - this.lastFrameTime) / 1000));
    this.lastFrameTime = now;
    this.smoothedFps = this.smoothedFps * 0.9 + (1 / dt) * 0.1;

    this.totalFrets = totalFrets;
    this.tracker.endU = 1 / this.fret12U;

    const videoReady = !!video && video.readyState >= 2 && video.videoWidth > 0;
    this.updateGeometry(videoReady ? video : null, canvasWidth, canvasHeight);
    const newFrame = videoReady && video ? this.ingestVideoFrame(video, now, canvasWidth, canvasHeight) : false;

    if (this.state === 'calibrating_vertical') {
      if (newFrame) this.detectVerticalNeck();
    } else if (this.state === 'tracking' && newFrame && this.trackingMode === 'hybrid-auto') {
      this.updateTrackingStep(now);
    }

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // 1. Dibujar el stream de cámara con el mismo recorte (object-fit: cover) y espejo que el buffer de proceso
    const g = this.geom;
    if (videoReady && video && g.hasCrop) {
      const fc = this.frameCanvas;
      if (this.frameCanvasValid && fc.width === canvasWidth && fc.height === canvasHeight) {
        ctx.drawImage(fc, 0, 0);
      } else {
        ctx.save();
        if (g.mirror) {
          ctx.translate(canvasWidth, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, g.sx, g.sy, g.sw, g.sh, 0, 0, canvasWidth, canvasHeight);
        ctx.restore();
      }

      ctx.fillStyle = 'rgba(6, 8, 18, 0.25)';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    } else {
      const grad = ctx.createRadialGradient(
        canvasWidth * 0.5,
        canvasHeight * 0.5,
        40,
        canvasWidth * 0.5,
        canvasHeight * 0.5,
        canvasWidth * 0.7
      );
      grad.addColorStop(0, '#131629');
      grad.addColorStop(1, '#070810');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      ctx.strokeStyle = 'rgba(139, 92, 246, 0.08)';
      ctx.lineWidth = 1;
      const gridStep = 40;
      for (let x = 0; x < canvasWidth; x += gridStep) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvasHeight);
        ctx.stroke();
      }
      for (let y = 0; y < canvasHeight; y += gridStep) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvasWidth, y);
        ctx.stroke();
      }
    }

    const toCanvasX = canvasWidth / g.procW;
    const toCanvasY = canvasHeight / g.procH;
    const normQuad = this.getNormalizedKeypoints();

    // 2. Fase de calibración vertical: solo HUD, sin malla
    if (this.state === 'calibrating_vertical') {
      this.drawCalibrationHud(ctx, canvasWidth, canvasHeight);
      return {
        fps: Math.round(this.smoothedFps),
        confidence: Math.round(this.trackingConfidence * 100),
        neckAngleDeg: 90,
        isFallbackFrozen: false,
        trackingMode: this.trackingMode,
        engineState: this.state,
        calibrationFrames: this.calibrationHoldFrames,
        keypoints: normQuad,
        homographyMatrix: computeUnitSquareHomography(this.scaleQuad(normQuad, canvasWidth, canvasHeight)),
      };
    }

    const screenQuad = this.scaleQuad(normQuad, canvasWidth, canvasHeight);
    const H = computeUnitSquareHomography(screenQuad);

    const screenA = { x: this.displayA.x * toCanvasX, y: this.displayA.y * toCanvasY };
    const screenB = { x: this.displayB.x * toCanvasX, y: this.displayB.y * toCanvasY };
    const neckAngleDeg =
      Math.round(((Math.atan2(screenB.y - screenA.y, screenB.x - screenA.x) * 180) / Math.PI) * 10) / 10;

    const isFrozen = this.state === 'tracking' && this.tracker.isLost;
    const masterAlpha = isFrozen ? 0.42 : 0.95;
    ctx.save();
    ctx.globalAlpha = masterAlpha;

    // 3. Dibujar la superficie del diapasón proyectada con perspectiva
    ctx.beginPath();
    ctx.moveTo(screenQuad.nutTop.x, screenQuad.nutTop.y);
    ctx.lineTo(screenQuad.bridgeTop.x, screenQuad.bridgeTop.y);
    ctx.lineTo(screenQuad.bridgeBottom.x, screenQuad.bridgeBottom.y);
    ctx.lineTo(screenQuad.nutBottom.x, screenQuad.nutBottom.y);
    ctx.closePath();

    const neckGrad = ctx.createLinearGradient(
      screenQuad.nutTop.x,
      screenQuad.nutTop.y,
      screenQuad.bridgeBottom.x,
      screenQuad.bridgeBottom.y
    );
    neckGrad.addColorStop(0, 'rgba(22, 16, 32, 0.72)');
    neckGrad.addColorStop(0.5, 'rgba(30, 22, 45, 0.68)');
    neckGrad.addColorStop(1, 'rgba(18, 14, 28, 0.76)');
    ctx.fillStyle = neckGrad;
    ctx.fill();

    ctx.strokeStyle = isFrozen ? 'rgba(251, 191, 36, 0.7)' : 'rgba(56, 189, 248, 0.65)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 4. Dibujar trastes proyectados por homografía
    const inlayFrets = new Set([3, 5, 7, 9, 12, 15, 17, 19, 21, 24]);

    for (let f = 0; f <= totalFrets; f++) {
      const u = getNormalizedFretPosition(f, totalFrets);
      const topPt = projectNeckPoint(screenQuad, u, 0);
      const botPt = projectNeckPoint(screenQuad, u, 1);

      ctx.beginPath();
      ctx.moveTo(topPt.x, topPt.y);
      ctx.lineTo(botPt.x, botPt.y);

      if (f === 0) {
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 4.5;
      } else if (f === 12 || f === 24) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
        ctx.lineWidth = 2.2;
      } else {
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.48)';
        ctx.lineWidth = 1.4;
      }
      ctx.stroke();

      if (f > 0 && inlayFrets.has(f)) {
        const uPrev = getNormalizedFretPosition(f - 1, totalFrets);
        const uCenter = (uPrev + u) * 0.5;

        const labelPt = projectNeckPoint(screenQuad, uCenter, -0.16);
        ctx.fillStyle = f === 12 || f === 24 ? '#38bdf8' : 'rgba(226, 232, 240, 0.85)';
        ctx.font = 'bold 10px Orbitron, monospace, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(f), labelPt.x, labelPt.y);

        if (f === 12 || f === 24) {
          const p1 = projectNeckPoint(screenQuad, uCenter, 0.3);
          const p2 = projectNeckPoint(screenQuad, uCenter, 0.7);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
          ctx.beginPath();
          ctx.arc(p1.x, p1.y, 4, 0, Math.PI * 2);
          ctx.arc(p2.x, p2.y, 4, 0, Math.PI * 2);
          ctx.fill();
        } else {
          const pMid = projectNeckPoint(screenQuad, uCenter, 0.5);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
          ctx.beginPath();
          ctx.arc(pMid.x, pMid.y, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 5. Dibujar las 6 cuerdas proyectadas con perspectiva
    for (let s = 0; s < 6; s++) {
      const vIndex = this.invertStringsVertical ? s : 5 - s;
      const v = 0.08 + (vIndex / 5) * 0.84;
      const startPt = projectNeckPoint(screenQuad, 0, v);
      const endPt = projectNeckPoint(screenQuad, 1, v);

      ctx.beginPath();
      ctx.moveTo(startPt.x, startPt.y);
      ctx.lineTo(endPt.x, endPt.y);
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.55)';
      ctx.lineWidth = 1 + (5 - s) * 0.28;
      ctx.stroke();
    }

    // 6. Dibujar los nodos de la escala / notas activas sobre el mástil AR
    for (let s = 0; s < 6; s++) {
      const vIndex = this.invertStringsVertical ? s : 5 - s;
      const v = 0.08 + (vIndex / 5) * 0.84;

      for (let f = 0; f <= totalFrets; f++) {
        const node = fretMatrix[s]?.[f];
        if (!node) continue;

        const isNotePlaying =
          activeNote !== null &&
          (activeNote.midi === node.midi || activeNote.pitchClassIndex === node.pitchClassIndex);
        const isExactMidiPlaying = activeNote !== null && activeNote.midi === node.midi;

        const shouldRender =
          isNotePlaying ||
          (mode === 'reactive' ? node.inScale : boxFilter > 0 ? node.inBox : node.inScale);

        if (!shouldRender) continue;

        const u =
          f === 0
            ? -0.018
            : (getNormalizedFretPosition(f - 1, totalFrets) + getNormalizedFretPosition(f, totalFrets)) * 0.5;

        const pt = projectNeckPoint(screenQuad, u, v);

        const baseRadius = isExactMidiPlaying ? 11.5 : node.role === 'root' ? 8.8 : 7.2;
        const perspectiveScale = 1.05 - u * 0.28;
        const radius = Math.max(4.5, baseRadius * perspectiveScale);

        let fillColor = 'rgba(14, 165, 233, 0.88)';
        let strokeColor = '#bae6fd';

        if (isExactMidiPlaying) {
          fillColor = '#facc15';
          strokeColor = '#ffffff';
        } else if (mode === 'guided') {
          if (node.role === 'root') {
            fillColor = '#ec4899';
            strokeColor = '#fbcfe8';
          } else if (node.role === 'third') {
            fillColor = '#8b5cf6';
            strokeColor = '#ddd6fe';
          } else if (node.role === 'blue') {
            fillColor = '#06b6d4';
            strokeColor = '#cffafe';
          } else {
            fillColor = 'rgba(59, 130, 246, 0.82)';
            strokeColor = '#bfdbfe';
          }
        } else {
          if (node.role === 'root') {
            fillColor = '#0284c7';
            strokeColor = '#38bdf8';
          }
        }

        if (isExactMidiPlaying || node.role === 'root') {
          ctx.save();
          ctx.shadowColor = isExactMidiPlaying ? '#facc15' : '#38bdf8';
          ctx.shadowBlur = isExactMidiPlaying ? 18 : 10;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
          ctx.fillStyle = fillColor;
          ctx.fill();
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
          ctx.fillStyle = fillColor;
          ctx.fill();
        }

        ctx.lineWidth = isExactMidiPlaying ? 2.2 : 1.2;
        ctx.strokeStyle = strokeColor;
        ctx.stroke();

        ctx.fillStyle = isExactMidiPlaying ? '#09090b' : '#ffffff';
        ctx.font = `bold ${Math.round(radius * 0.95)}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.noteName, pt.x, pt.y + 0.5);
      }
    }

    ctx.restore();

    // 7. Depuración: nubes LK (verde = inlier, rojo = outlier), anclas A/B y los 4 pines arrastrables
    if (this.showVisionDebug || this.trackingMode === 'manual-calibration' || hoveredKeypoint) {
      if (this.state === 'tracking' && this.tracker.isLocked) {
        ctx.save();
        this.tracker.forEachFeature((x, y, cloud, inlier) => {
          ctx.beginPath();
          ctx.arc((x + 0.5) * toCanvasX, (y + 0.5) * toCanvasY, 2.6, 0, Math.PI * 2);
          ctx.fillStyle = !inlier ? '#f87171' : cloud === CLOUD_A ? '#4ade80' : '#22d3ee';
          ctx.fill();
        });
        ctx.restore();
      }

      const anchorLabels: [Point2D, string][] = [
        [screenA, 'A · CEJUELA'],
        [screenB, 'B · TRASTE 12'],
      ];
      for (const [pt, label] of anchorLabels) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#22d3ee';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        ctx.fillStyle = 'rgba(9, 9, 11, 0.88)';
        ctx.fillRect(pt.x - 44, pt.y + 10, 88, 15);
        ctx.fillStyle = '#67e8f9';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(label, pt.x, pt.y + 21);
      }

      const pinEntries: [keyof NeckKeypoints, Point2D, string][] = [
        ['nutTop', screenQuad.nutTop, 'CEJUELA SUP'],
        ['nutBottom', screenQuad.nutBottom, 'CEJUELA INF'],
        ['bridgeTop', screenQuad.bridgeTop, `TRASTE ${totalFrets} SUP`],
        ['bridgeBottom', screenQuad.bridgeBottom, `TRASTE ${totalFrets} INF`],
      ];

      for (const [key, pt, label] of pinEntries) {
        const isHovered = hoveredKeypoint === key;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, isHovered ? 18 : 13, 0, Math.PI * 2);
        ctx.fillStyle = isHovered ? 'rgba(250, 204, 21, 0.25)' : 'rgba(16, 185, 129, 0.20)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(pt.x, pt.y, isHovered ? 10 : 7, 0, Math.PI * 2);
        ctx.fillStyle = isHovered ? '#facc15' : '#10b981';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        ctx.fillStyle = 'rgba(9, 9, 11, 0.85)';
        ctx.fillRect(pt.x - 42, pt.y - 28, 84, 15);
        ctx.fillStyle = '#a7f3d0';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(label, pt.x, pt.y - 19);
      }
    }

    const paused = this.state === 'tracking' && this.posePaused;
    if (isFrozen || paused) {
      const msg = isFrozen
        ? 'SEGUIMIENTO PERDIDO · REACOMODA LA GUITARRA O PULSA FIJAR TRACKING'
        : 'POSE POR DEFECTO · ARRASTRA LOS PINES O PULSA FIJAR TRACKING';
      ctx.save();
      ctx.font = 'bold 10px Inter, monospace, sans-serif';
      const boxW = Math.min(canvasWidth - 16, ctx.measureText(msg).width + 24);
      ctx.fillStyle = isFrozen ? 'rgba(120, 53, 15, 0.9)' : 'rgba(12, 74, 110, 0.9)';
      ctx.fillRect((canvasWidth - boxW) * 0.5, 54, boxW, 20);
      ctx.fillStyle = isFrozen ? '#fde68a' : '#bae6fd';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(msg, canvasWidth * 0.5, 64);
      ctx.restore();
    }

    return {
      fps: Math.round(this.smoothedFps),
      confidence: Math.round(this.trackingConfidence * 100),
      neckAngleDeg,
      isFallbackFrozen: isFrozen,
      trackingMode: this.trackingMode,
      engineState: this.state,
      calibrationFrames: this.calibrationHoldFrames,
      keypoints: normQuad,
      homographyMatrix: H,
      featuresA: this.tracker.countCloud(CLOUD_A),
      featuresB: this.tracker.countCloud(CLOUD_B),
      inlierRatio: Math.round(this.tracker.inlierRatio * 100) / 100,
      scaleRatio:
        this.tracker.referenceDist > 0
          ? Math.round(
              (Math.hypot(this.displayB.x - this.displayA.x, this.displayB.y - this.displayA.y) /
                this.tracker.referenceDist) * 100
            ) / 100
          : 1,
    };
  }
}
