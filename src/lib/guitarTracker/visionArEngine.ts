// Motor de Visión por Computador, Homografía 2D/3D, Template Matching 2D (SAD 24x24),
// Transformada de Hough Diagonal y Filtro de Kalman a 60 FPS

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

export interface VisionTelemetry {
  fps: number;
  confidence: number;
  neckAngleDeg: number;
  isFallbackFrozen: boolean;
  trackingMode: 'hybrid-auto' | 'kalman-locked' | 'manual-calibration';
  keypoints: NeckKeypoints;
  homographyMatrix: number[]; // Matriz 3x3 aplanada (9 elementos)
}

const KEYPOINT_KEYS: (keyof NeckKeypoints)[] = [
  'nutTop',
  'bridgeTop',
  'bridgeBottom',
  'nutBottom',
];

const PATCH_SIZE = 24;
const HALF_PATCH = 12; // 24x24 píxeles
const SEARCH_RADIUS = 9; // Ventana de búsqueda 2D [-9..+9] en X e Y

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
 * Filtro de Kalman 2D con estado [x, y, vx, vy] para suavizar cada punto clave
 * y predecir posición en X e Y entre frames evitando vibraciones (jitter).
 */
class KalmanPoint2D {
  private x = 0;
  private y = 0;
  private vx = 0;
  private vy = 0;
  private initialized = false;
  private alpha: number;
  private beta: number;

  constructor(alpha = 0.42, beta = 0.12) {
    this.alpha = alpha;
    this.beta = beta;
  }

  public reset(pt: Point2D) {
    this.x = pt.x;
    this.y = pt.y;
    this.vx = 0;
    this.vy = 0;
    this.initialized = true;
  }

  public update(measured: Point2D, dt: number = 1 / 60): Point2D {
    if (!this.initialized) {
      this.reset(measured);
      return { x: this.x, y: this.y };
    }

    const safeDt = Math.max(0.005, Math.min(0.1, dt));

    // Predicción de estado en X e Y
    const predX = this.x + this.vx * safeDt;
    const predY = this.y + this.vy * safeDt;

    // Residuo (innovación)
    const rx = measured.x - predX;
    const ry = measured.y - predY;

    // Corrección Alpha-Beta Kalman
    this.x = predX + this.alpha * rx;
    this.y = predY + this.alpha * ry;
    this.vx = (this.vx + (this.beta / safeDt) * rx * 0.18) * 0.84;
    this.vy = (this.vy + (this.beta / safeDt) * ry * 0.18) * 0.84;

    return { x: this.x, y: this.y };
  }

  public getCurrent(): Point2D {
    return { x: this.x, y: this.y };
  }
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

export class GuitarVisionArEngine {
  private kalmanFilters: Record<keyof NeckKeypoints, KalmanPoint2D> = {
    nutTop: new KalmanPoint2D(0.42, 0.12),
    bridgeTop: new KalmanPoint2D(0.42, 0.12),
    bridgeBottom: new KalmanPoint2D(0.42, 0.12),
    nutBottom: new KalmanPoint2D(0.42, 0.12),
  };

  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D | null;
  // Resolución de procesamiento optimizada para parches 24x24 a 60 FPS sin bloquear el hilo principal
  private procWidth = 320;
  private procHeight = 180;
  private grayBuffer: Uint8Array;
  private hasValidGrayFrame = false;

  // Parches de referencia ("templates") de 24x24 píxeles (576 bytes cada uno) para SAD Template Matching
  private templates: Record<keyof NeckKeypoints, Uint8Array> = {
    nutTop: new Uint8Array(PATCH_SIZE * PATCH_SIZE),
    bridgeTop: new Uint8Array(PATCH_SIZE * PATCH_SIZE),
    bridgeBottom: new Uint8Array(PATCH_SIZE * PATCH_SIZE),
    nutBottom: new Uint8Array(PATCH_SIZE * PATCH_SIZE),
  };

  private templateInitialized: Record<keyof NeckKeypoints, boolean> = {
    nutTop: false,
    bridgeTop: false,
    bridgeBottom: false,
    nutBottom: false,
  };

  // Puntos ancla normalizados en coordenadas de canvas (0..1)
  private anchorQuad: NeckKeypoints = {
    nutTop: { x: 0.14, y: 0.48 },
    bridgeTop: { x: 0.84, y: 0.34 },
    bridgeBottom: { x: 0.86, y: 0.50 },
    nutBottom: { x: 0.16, y: 0.61 },
  };

  private lastValidQuad: NeckKeypoints = { ...this.anchorQuad };
  private trackingConfidence = 0.94;
  private isFallbackFrozen = false;
  private lastFrameTime = performance.now();
  private smoothedFps = 60;

  public trackingMode: 'hybrid-auto' | 'kalman-locked' | 'manual-calibration' = 'hybrid-auto';
  public showVisionDebug = true;
  // 1. MODO ESPEJO ACTIVADO POR DEFECTO PARA CÁMARA FRONTAL
  public mirrorVideo = true;
  public invertStringsVertical = false;

  constructor() {
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = this.procWidth;
    this.offscreenCanvas.height = this.procHeight;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });
    this.grayBuffer = new Uint8Array(this.procWidth * this.procHeight);
    this.resetKalmanToCurrent();
  }

  private resetKalmanToCurrent() {
    for (const key of KEYPOINT_KEYS) {
      this.kalmanFilters[key].reset(this.anchorQuad[key]);
    }
  }

  public getNormalizedKeypoints(): NeckKeypoints {
    return {
      nutTop: { ...this.anchorQuad.nutTop },
      bridgeTop: { ...this.anchorQuad.bridgeTop },
      bridgeBottom: { ...this.anchorQuad.bridgeBottom },
      nutBottom: { ...this.anchorQuad.nutBottom },
    };
  }

  /**
   * 3. Si el usuario arrastra un pin verde, actualiza la coordenada y captura inmediatamente
   * el nuevo parche de referencia (template 24x24) debajo del dedo para continuar el tracking desde ahí.
   */
  public setNormalizedKeypoint(key: keyof NeckKeypoints, pt: Point2D) {
    const clamped: Point2D = {
      x: Math.max(0.04, Math.min(0.96, pt.x)),
      y: Math.max(0.04, Math.min(0.96, pt.y)),
    };
    this.anchorQuad[key] = clamped;
    this.lastValidQuad = this.getNormalizedKeypoints();
    this.kalmanFilters[key].reset(clamped);

    if (this.hasValidGrayFrame) {
      this.capturePatchTemplate(key, clamped);
    } else {
      this.templateInitialized[key] = false;
    }

    this.trackingConfidence = 0.98;
    this.isFallbackFrozen = false;
  }

  public resetDefaultNeckPose() {
    this.anchorQuad = {
      nutTop: { x: 0.14, y: 0.48 },
      bridgeTop: { x: 0.84, y: 0.34 },
      bridgeBottom: { x: 0.86, y: 0.50 },
      nutBottom: { x: 0.16, y: 0.61 },
    };
    this.lastValidQuad = this.getNormalizedKeypoints();
    this.resetKalmanToCurrent();
    for (const key of KEYPOINT_KEYS) {
      if (this.hasValidGrayFrame) {
        this.capturePatchTemplate(key, this.anchorQuad[key]);
      } else {
        this.templateInitialized[key] = false;
      }
    }
    this.trackingConfidence = 0.96;
    this.isFallbackFrozen = false;
  }

  /**
   * Captura el frame actual de video en el buffer de luminancia (escala de grises 1 byte/píxel),
   * respetando el modo espejo y la relación de aspecto para que las coordenadas normalizadas
   * coincidan exactamente con las del canvas principal.
   */
  private captureGrayscaleFrame(video: HTMLVideoElement): boolean {
    if (!this.offscreenCtx || video.readyState < 2) return false;

    const vw = video.videoWidth || this.procWidth;
    const vh = video.videoHeight || this.procHeight;
    const videoAspect = vw / vh;
    const procAspect = this.procWidth / this.procHeight;

    let sx = 0, sy = 0, sw = vw, sh = vh;
    if (videoAspect > procAspect) {
      sw = vh * procAspect;
      sx = (vw - sw) * 0.5;
    } else {
      sh = vw / procAspect;
      sy = (vh - sh) * 0.5;
    }

    this.offscreenCtx.save();
    if (this.mirrorVideo) {
      this.offscreenCtx.translate(this.procWidth, 0);
      this.offscreenCtx.scale(-1, 1);
    }
    this.offscreenCtx.drawImage(video, sx, sy, sw, sh, 0, 0, this.procWidth, this.procHeight);
    this.offscreenCtx.restore();

    const rgba = this.offscreenCtx.getImageData(0, 0, this.procWidth, this.procHeight).data;
    const totalPixels = this.procWidth * this.procHeight;
    for (let i = 0, p = 0; i < totalPixels; i++, p += 4) {
      // Luminancia rápida en entero: (77*R + 150*G + 29*B) >> 8
      this.grayBuffer[i] = (77 * rgba[p] + 150 * rgba[p + 1] + 29 * rgba[p + 2]) >> 8;
    }

    this.hasValidGrayFrame = true;
    return true;
  }

  /**
   * Extrae el parche de referencia de 24x24 píxeles alrededor de una coordenada normalizada (x, y)
   */
  private capturePatchTemplate(key: keyof NeckKeypoints, normPt: Point2D) {
    const cx = Math.round(normPt.x * this.procWidth);
    const cy = Math.round(normPt.y * this.procHeight);

    const clampedCx = Math.max(HALF_PATCH + 1, Math.min(this.procWidth - HALF_PATCH - 2, cx));
    const clampedCy = Math.max(HALF_PATCH + 1, Math.min(this.procHeight - HALF_PATCH - 2, cy));

    const patch = this.templates[key];
    let idx = 0;
    for (let py = -HALF_PATCH; py < HALF_PATCH; py++) {
      const rowOffset = (clampedCy + py) * this.procWidth;
      for (let px = -HALF_PATCH; px < HALF_PATCH; px++) {
        patch[idx++] = this.grayBuffer[rowOffset + clampedCx + px];
      }
    }
    this.templateInitialized[key] = true;
  }

  /**
   * 2. AUTO-AJUSTE DINÁMICO DEL MÁSTIL (ÁNGULOS REALES):
   * Detecta bordes (Sobel direccional) y ejecuta una Transformada de Hough lineal + regresión
   * sobre el corredor dominante para encontrar el eje diagonal real del mástil (ej. -40° a +40°),
   * su grosor transversal y proyectar automáticamente los 4 keypoints (nutTop, bridgeTop, bridgeBottom, nutBottom).
   */
  public autoScanNeckFromVideo(video: HTMLVideoElement): boolean {
    if (!this.captureGrayscaleFrame(video)) return false;

    const w = this.procWidth;
    const h = this.procHeight;
    const gray = this.grayBuffer;

    // 1. Mapa de magnitud de bordes y orientación para detectar líneas largas del mástil + trastes
    const edgeMag = new Float32Array(w * h);
    const edgeGx = new Float32Array(w * h);
    const edgeGy = new Float32Array(w * h);

    const marginX = Math.floor(w * 0.08);
    const marginY = Math.floor(h * 0.08);

    for (let y = marginY; y < h - marginY; y++) {
      const row = y * w;
      for (let x = marginX; x < w - marginX; x++) {
        const idx = row + x;
        // Operador Sobel 3x3
        const gx =
          -gray[idx - w - 1] + gray[idx - w + 1] -
          2 * gray[idx - 1] + 2 * gray[idx + 1] -
          gray[idx + w - 1] + gray[idx + w + 1];

        const gy =
          -gray[idx - w - 1] - 2 * gray[idx - w] - gray[idx - w + 1] +
          gray[idx + w - 1] + 2 * gray[idx + w] + gray[idx + w + 1];

        const mag = Math.hypot(gx, gy);
        if (mag > 45) {
          edgeMag[idx] = mag;
          edgeGx[idx] = gx;
          edgeGy[idx] = gy;
        }
      }
    }

    // 2. Transformada de Hough en el rango de ángulos reales de ejecución de guitarra [-42°, +42°]
    // El ángulo theta representa la inclinación del eje longitudinal del mástil respecto a la horizontal.
    const minAngleDeg = -42;
    const maxAngleDeg = 42;
    const angleStepDeg = 1.5;
    const numAngles = Math.floor((maxAngleDeg - minAngleDeg) / angleStepDeg) + 1;

    const maxRho = Math.ceil(Math.hypot(w, h));
    const rhoStep = 2;
    const numRhos = Math.ceil((2 * maxRho) / rhoStep) + 1;

    const houghAccumulator = new Float32Array(numAngles * numRhos);
    const cosTable = new Float32Array(numAngles);
    const sinTable = new Float32Array(numAngles);

    for (let a = 0; a < numAngles; a++) {
      const deg = minAngleDeg + a * angleStepDeg;
      const rad = (deg * Math.PI) / 180;
      cosTable[a] = Math.cos(rad);
      sinTable[a] = Math.sin(rad);
    }

    // Votación en el acumulador de Hough por los píxeles de alto contraste cuyo gradiente
    // es perpendicular al eje del mástil (cuerdas y bordes de madera)
    for (let y = marginY; y < h - marginY; y += 2) {
      const row = y * w;
      for (let x = marginX; x < w - marginX; x += 2) {
        const idx = row + x;
        const mag = edgeMag[idx];
        if (mag < 65) continue;

        const gx = edgeGx[idx];
        const gy = edgeGy[idx];

        for (let a = 0; a < numAngles; a++) {
          // Vector director del mástil u = (cos, sin), normal n = (-sin, cos)
          // Un borde longitudinal del mástil tiene gradiente alineado con n: |gx*(-sin) + gy*(cos)| alto
          const normalAlignment = Math.abs(-gx * sinTable[a] + gy * cosTable[a]) / mag;
          if (normalAlignment > 0.78) {
            // Recta parametrizada por su distancia normal al centro de la imagen
            const dx = x - w * 0.5;
            const dy = y - h * 0.5;
            const rho = -dx * sinTable[a] + dy * cosTable[a];
            const rIdx = Math.round((rho + maxRho) / rhoStep);
            if (rIdx >= 0 && rIdx < numRhos) {
              houghAccumulator[a * numRhos + rIdx] += mag * normalAlignment;
            }
          }
        }
      }
    }

    // 3. Buscar el ángulo (theta) y corredor radial (rho) con máxima energía de líneas paralelas
    // (el mástil tiene borde superior, cuerdas y borde inferior paralelos separados entre 14 y 38 píxeles)
    let bestAngleIdx = Math.floor(numAngles / 2);
    let bestCenterRhoIdx = Math.floor(numRhos / 2);
    let bestCorridorScore = 0;

    const corridorHalfBins = Math.ceil(16 / rhoStep);

    for (let a = 0; a < numAngles; a++) {
      const rowOffset = a * numRhos;
      for (let r = corridorHalfBins + 4; r < numRhos - corridorHalfBins - 4; r++) {
        let corridorEnergy = 0;
        for (let dr = -corridorHalfBins; dr <= corridorHalfBins; dr++) {
          corridorEnergy += houghAccumulator[rowOffset + r + dr];
        }
        if (corridorEnergy > bestCorridorScore) {
          bestCorridorScore = corridorEnergy;
          bestAngleIdx = a;
          bestCenterRhoIdx = r;
        }
      }
    }

    if (bestCorridorScore < 3500) {
      return false;
    }

    // 4. Refinar mediante regresión lineal ponderada todos los puntos de alto contraste dentro del corredor ganador
    const initialThetaRad = ((minAngleDeg + bestAngleIdx * angleStepDeg) * Math.PI) / 180;
    const u0x = Math.cos(initialThetaRad);
    const u0y = Math.sin(initialThetaRad);
    const n0x = -u0y;
    const n0y = u0x;
    const winningRho = bestCenterRhoIdx * rhoStep - maxRho;

    let sumW = 0;
    let sumX = 0;
    let sumY = 0;

    for (let y = marginY; y < h - marginY; y++) {
      const row = y * w;
      for (let x = marginX; x < w - marginX; x++) {
        const idx = row + x;
        const mag = edgeMag[idx];
        if (mag < 60) continue;

        const dx = x - w * 0.5;
        const dy = y - h * 0.5;
        const rho = dx * n0x + dy * n0y;

        if (Math.abs(rho - winningRho) <= 22) {
          sumW += mag;
          sumX += x * mag;
          sumY += y * mag;
        }
      }
    }

    if (sumW < 1000) return false;

    const centroidX = sumX / sumW;
    const centroidY = sumY / sumW;

    // Momentos de segundo orden (PCA / Regresión ortogonal) para obtener el ángulo exacto continuo
    let sXX = 0;
    let sYY = 0;
    let sXY = 0;

    for (let y = marginY; y < h - marginY; y++) {
      const row = y * w;
      for (let x = marginX; x < w - marginX; x++) {
        const idx = row + x;
        const mag = edgeMag[idx];
        if (mag < 60) continue;

        const dx0 = x - w * 0.5;
        const dy0 = y - h * 0.5;
        const rho = dx0 * n0x + dy0 * n0y;

        if (Math.abs(rho - winningRho) <= 22) {
          const dx = x - centroidX;
          const dy = y - centroidY;
          sXX += mag * dx * dx;
          sYY += mag * dy * dy;
          sXY += mag * dx * dy;
        }
      }
    }

    let refinedTheta = 0.5 * Math.atan2(2 * sXY, sXX - sYY);
    // Limitar a un ángulo físico razonable de ejecución [-44°, +44°]
    const maxRad = (44 * Math.PI) / 180;
    refinedTheta = Math.max(-maxRad, Math.min(maxRad, refinedTheta));

    const ux = Math.cos(refinedTheta);
    const uy = Math.sin(refinedTheta);
    const nx = -uy;
    const ny = ux;

    // 5. Estimar la extensión longitudinal (cejuela a traste 24) y el grosor transversal del diapasón
    const transHist = new Float32Array(61); // [-30..+30] píxeles en dirección normal
    let longMin = -w * 0.34;
    let longMax = w * 0.34;

    const longProfile = new Float32Array(w);
    const halfW = Math.floor(w * 0.44);

    for (let y = marginY; y < h - marginY; y++) {
      const row = y * w;
      for (let x = marginX; x < w - marginX; x++) {
        const mag = edgeMag[row + x];
        if (mag < 55) continue;

        const dx = x - centroidX;
        const dy = y - centroidY;
        const uCoord = dx * ux + dy * uy;
        const vCoord = dx * nx + dy * ny;

        if (Math.abs(vCoord) <= 28 && Math.abs(uCoord) <= halfW) {
          const vBin = Math.round(vCoord + 30);
          if (vBin >= 0 && vBin <= 60) {
            transHist[vBin] += mag;
          }
          const uBin = Math.min(w - 1, Math.max(0, Math.round(uCoord + w * 0.5)));
          longProfile[uBin] += mag;
        }
      }
    }

    // Encontrar bordes superior (v < 0) e inferior (v > 0) del diapasón
    let topOffsetPx = -11;
    let maxTopVal = 0;
    for (let v = -24; v <= -6; v++) {
      const val = transHist[v + 30];
      if (val > maxTopVal) {
        maxTopVal = val;
        topOffsetPx = v;
      }
    }

    let bottomOffsetPx = 11;
    let maxBotVal = 0;
    for (let v = 6; v <= 24; v++) {
      const val = transHist[v + 30];
      if (val > maxBotVal) {
        maxBotVal = val;
        bottomOffsetPx = v;
      }
    }

    const halfThicknessPx = Math.max(8, Math.min(22, (bottomOffsetPx - topOffsetPx) * 0.5));
    const nutHalfWidthPx = halfThicknessPx * 0.86;    // Cejuela ligeramente más estrecha
    const bridgeHalfWidthPx = halfThicknessPx * 1.08; // Traste 24 ligeramente más ancho

    // Proyectar los 4 puntos ancla a lo largo del eje diagonal real detectado
    longMin = -w * 0.35;
    longMax = w * 0.35;

    const toNormPoint = (uDistPx: number, vDistPx: number): Point2D => {
      const px = centroidX + uDistPx * ux + vDistPx * nx;
      const py = centroidY + uDistPx * uy + vDistPx * ny;
      return {
        x: Math.max(0.05, Math.min(0.95, px / w)),
        y: Math.max(0.05, Math.min(0.95, py / h)),
      };
    };

    this.anchorQuad = {
      nutTop: toNormPoint(longMin, -nutHalfWidthPx),
      bridgeTop: toNormPoint(longMax, -bridgeHalfWidthPx),
      bridgeBottom: toNormPoint(longMax, bridgeHalfWidthPx),
      nutBottom: toNormPoint(longMin, nutHalfWidthPx),
    };

    this.lastValidQuad = this.getNormalizedKeypoints();
    this.resetKalmanToCurrent();

    // Capturar los parches de referencia 24x24 iniciales en los 4 keypoints detectados
    for (const key of KEYPOINT_KEYS) {
      this.capturePatchTemplate(key, this.anchorQuad[key]);
    }

    this.trackingConfidence = 0.96;
    this.isFallbackFrozen = false;
    return true;
  }

  /**
   * Busca la nueva posición 2D (X, Y) de un punto clave mediante Template Matching SAD
   * (Sum of Absolute Differences) en un parche de 24x24 píxeles dentro de una ventana de búsqueda 2D.
   */
  private matchKeypointTemplate2D(
    key: keyof NeckKeypoints,
    currentNormPt: Point2D
  ): { point: Point2D; confidence: number } {
    const w = this.procWidth;
    const h = this.procHeight;
    const gray = this.grayBuffer;
    const template = this.templates[key];

    const startX = Math.round(currentNormPt.x * w);
    const startY = Math.round(currentNormPt.y * h);

    // Si aún no hay template inicializado para este punto, lo capturamos ahora
    if (!this.templateInitialized[key]) {
      this.capturePatchTemplate(key, currentNormPt);
      return { point: currentNormPt, confidence: 0.95 };
    }

    const minX = Math.max(HALF_PATCH + 1, startX - SEARCH_RADIUS);
    const maxX = Math.min(w - HALF_PATCH - 2, startX + SEARCH_RADIUS);
    const minY = Math.max(HALF_PATCH + 1, startY - SEARCH_RADIUS);
    const maxY = Math.min(h - HALF_PATCH - 2, startY + SEARCH_RADIUS);

    if (minX > maxX || minY > maxY) {
      return { point: currentNormPt, confidence: 0.4 };
    }

    let bestSad = Infinity;
    let bestX = startX;
    let bestY = startY;

    // Paso 1: Búsqueda en cuadrícula con paso 2 (Coarse search) + centro exacto
    for (let cy = minY; cy <= maxY; cy += 2) {
      for (let cx = minX; cx <= maxX; cx += 2) {
        let sad = 0;
        let tIdx = 0;
        // Penalización suave por desplazamiento para preferir estabilidad ante zonas uniformes
        const distPenalty = (Math.abs(cx - startX) + Math.abs(cy - startY)) * 18;
        sad += distPenalty;

        for (let py = -HALF_PATCH; py < HALF_PATCH; py++) {
          const rowOffset = (cy + py) * w + cx;
          for (let px = -HALF_PATCH; px < HALF_PATCH; px++) {
            sad += Math.abs(gray[rowOffset + px] - template[tIdx++]);
          }
          if (sad >= bestSad) break; // Early exit para mantener 60 FPS
        }

        if (sad < bestSad) {
          bestSad = sad;
          bestX = cx;
          bestY = cy;
        }
      }
    }

    // Paso 2: Refinamiento fino de 1 píxel alrededor del mejor candidato (Fine search 3x3)
    const fineMinX = Math.max(HALF_PATCH + 1, bestX - 1);
    const fineMaxX = Math.min(w - HALF_PATCH - 2, bestX + 1);
    const fineMinY = Math.max(HALF_PATCH + 1, bestY - 1);
    const fineMaxY = Math.min(h - HALF_PATCH - 2, bestY + 1);

    for (let cy = fineMinY; cy <= fineMaxY; cy++) {
      for (let cx = fineMinX; cx <= fineMaxX; cx++) {
        let sad = (Math.abs(cx - startX) + Math.abs(cy - startY)) * 18;
        let tIdx = 0;
        for (let py = -HALF_PATCH; py < HALF_PATCH; py++) {
          const rowOffset = (cy + py) * w + cx;
          for (let px = -HALF_PATCH; px < HALF_PATCH; px++) {
            sad += Math.abs(gray[rowOffset + px] - template[tIdx++]);
          }
          if (sad >= bestSad) break;
        }
        if (sad < bestSad) {
          bestSad = sad;
          bestX = cx;
          bestY = cy;
        }
      }
    }

    const avgPixelDiff = bestSad / (PATCH_SIZE * PATCH_SIZE);
    // Confianza normalizada en [0..1] según el error medio por píxel del parche 24x24
    const confidence = Math.max(0, Math.min(1, 1 - avgPixelDiff / 65));

    const updatedPoint: Point2D = {
      x: Math.max(0.04, Math.min(0.96, bestX / w)),
      y: Math.max(0.04, Math.min(0.96, bestY / h)),
    };

    // Actualización adaptativa muy suave del template (Learning rate 8%) cuando la confianza es alta
    // para adaptarse a cambios graduales de iluminación sin perder el anclaje
    if (confidence > 0.72) {
      let tIdx = 0;
      for (let py = -HALF_PATCH; py < HALF_PATCH; py++) {
        const rowOffset = (bestY + py) * w + bestX;
        for (let px = -HALF_PATCH; px < HALF_PATCH; px++) {
          const currentVal = gray[rowOffset + px];
          template[tIdx] = Math.round(template[tIdx] * 0.92 + currentVal * 0.08);
          tIdx++;
        }
      }
    }

    return { point: updatedPoint, confidence };
  }

  /**
   * 3. TRACKING 2D REAL (SEGUIMIENTO FRAME A FRAME):
   * Ejecuta Template Matching (SAD 24x24) en X e Y para cada uno de los 4 keypoints,
   * filtra las nuevas coordenadas (X, Y) con el Filtro de Kalman 2D y preserva la coherencia
   * geométrica del mástil.
   */
  private updateTrackingStep(video: HTMLVideoElement | null, dt: number): NeckKeypoints {
    if (video && video.readyState >= 2 && this.trackingMode === 'hybrid-auto') {
      const captured = this.captureGrayscaleFrame(video);
      if (captured) {
        let totalConfidence = 0;

        for (const key of KEYPOINT_KEYS) {
          const match = this.matchKeypointTemplate2D(key, this.anchorQuad[key]);
          totalConfidence += match.confidence;
          // Pasar las nuevas coordenadas 2D (X, Y) al Filtro de Kalman correspondiente
          this.anchorQuad[key] = this.kalmanFilters[key].update(match.point, dt);
        }

        const meanConfidence = totalConfidence / 4;

        // Evaluar ángulo real del eje del mástil
        const axisDx =
          (this.anchorQuad.bridgeTop.x + this.anchorQuad.bridgeBottom.x) * 0.5 -
          (this.anchorQuad.nutTop.x + this.anchorQuad.nutBottom.x) * 0.5;
        const axisDy =
          (this.anchorQuad.bridgeTop.y + this.anchorQuad.bridgeBottom.y) * 0.5 -
          (this.anchorQuad.nutTop.y + this.anchorQuad.nutBottom.y) * 0.5;
        const angleDeg = Math.abs((Math.atan2(axisDy, axisDx) * 180) / Math.PI);

        if (angleDeg > 55 || meanConfidence < 0.38) {
          this.trackingConfidence = Math.max(0.25, this.trackingConfidence - 0.05);
        } else {
          this.trackingConfidence = Math.min(
            0.99,
            this.trackingConfidence * 0.85 + meanConfidence * 0.15
          );
        }

        if (this.trackingConfidence < 0.44 || angleDeg > 55) {
          this.isFallbackFrozen = true;
          return this.lastValidQuad;
        } else {
          this.isFallbackFrozen = false;
          this.lastValidQuad = this.getNormalizedKeypoints();
        }
      }
    } else {
      // Modo Kalman-Locked o Calibración Manual (con cámara apagada o bloqueada)
      for (const key of KEYPOINT_KEYS) {
        this.anchorQuad[key] = this.kalmanFilters[key].update(this.anchorQuad[key], dt);
      }
      const dx = this.anchorQuad.bridgeTop.x - this.anchorQuad.nutTop.x;
      const dy = this.anchorQuad.bridgeTop.y - this.anchorQuad.nutTop.y;
      const angleDeg = Math.abs((Math.atan2(dy, dx) * 180) / Math.PI);
      this.isFallbackFrozen = angleDeg > 55;
      this.trackingConfidence = this.isFallbackFrozen ? 0.38 : 0.97;
    }

    return this.anchorQuad;
  }

  /**
   * Renderiza el frame de video + el overlay AR con proyección homográfica 3D del diapasón
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
    const instantFps = 1 / dt;
    this.smoothedFps = this.smoothedFps * 0.9 + instantFps * 0.1;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // 1. Dibujar el stream de cámara manteniendo proporción exacta (object-fit: cover) y espejo
    if (video && video.readyState >= 2) {
      ctx.save();
      if (this.mirrorVideo) {
        ctx.translate(canvasWidth, 0);
        ctx.scale(-1, 1);
      }
      const vw = video.videoWidth || canvasWidth;
      const vh = video.videoHeight || canvasHeight;
      const videoAspect = vw / vh;
      const canvasAspect = canvasWidth / canvasHeight;

      let sx = 0;
      let sy = 0;
      let sw = vw;
      let sh = vh;

      if (videoAspect > canvasAspect) {
        sw = vh * canvasAspect;
        sx = (vw - sw) * 0.5;
      } else {
        sh = vw / canvasAspect;
        sy = (vh - sh) * 0.5;
      }

      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvasWidth, canvasHeight);
      ctx.restore();

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

    // 2. Actualizar pose 2D (SAD 24x24 + Filtro de Kalman) y comprobar Fallback
    const normQuad = this.updateTrackingStep(video, dt);

    const screenQuad: NeckKeypoints = {
      nutTop: { x: normQuad.nutTop.x * canvasWidth, y: normQuad.nutTop.y * canvasHeight },
      bridgeTop: { x: normQuad.bridgeTop.x * canvasWidth, y: normQuad.bridgeTop.y * canvasHeight },
      bridgeBottom: { x: normQuad.bridgeBottom.x * canvasWidth, y: normQuad.bridgeBottom.y * canvasHeight },
      nutBottom: { x: normQuad.nutBottom.x * canvasWidth, y: normQuad.nutBottom.y * canvasHeight },
    };

    // 3. Calcular Matriz de Homografía 3x3
    const H = computeUnitSquareHomography(screenQuad);

    const dx = screenQuad.bridgeTop.x - screenQuad.nutTop.x;
    const dy = screenQuad.bridgeTop.y - screenQuad.nutTop.y;
    const neckAngleDeg = Math.round(((Math.atan2(dy, dx) * 180) / Math.PI) * 10) / 10;

    const masterAlpha = this.isFallbackFrozen ? 0.42 : 0.95;
    ctx.save();
    ctx.globalAlpha = masterAlpha;

    // 4. Dibujar la superficie del diapasón proyectada con perspectiva
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

    ctx.strokeStyle = this.isFallbackFrozen ? 'rgba(251, 191, 36, 0.7)' : 'rgba(56, 189, 248, 0.65)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 5. Dibujar trastes proyectados por homografía (espaciado logarítmico real 1 - 2^(-f/12))
    const inlayFrets = new Set([3, 5, 7, 9, 12, 15, 17, 19, 21, 24]);

    for (let f = 0; f <= totalFrets; f++) {
      const u = getNormalizedFretPosition(f, totalFrets);
      const topPt = projectHomographyPoint(H, u, 0);
      const botPt = projectHomographyPoint(H, u, 1);

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

        const labelPt = projectHomographyPoint(H, uCenter, -0.16);
        ctx.fillStyle = f === 12 || f === 24 ? '#38bdf8' : 'rgba(226, 232, 240, 0.85)';
        ctx.font = 'bold 10px Orbitron, monospace, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(f), labelPt.x, labelPt.y);

        if (f === 12 || f === 24) {
          const p1 = projectHomographyPoint(H, uCenter, 0.3);
          const p2 = projectHomographyPoint(H, uCenter, 0.7);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
          ctx.beginPath();
          ctx.arc(p1.x, p1.y, 4, 0, Math.PI * 2);
          ctx.arc(p2.x, p2.y, 4, 0, Math.PI * 2);
          ctx.fill();
        } else {
          const pMid = projectHomographyPoint(H, uCenter, 0.5);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
          ctx.beginPath();
          ctx.arc(pMid.x, pMid.y, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 6. Dibujar las 6 cuerdas proyectadas con perspectiva
    for (let s = 0; s < 6; s++) {
      const vIndex = this.invertStringsVertical ? s : 5 - s;
      const v = 0.08 + (vIndex / 5) * 0.84;
      const startPt = projectHomographyPoint(H, 0, v);
      const endPt = projectHomographyPoint(H, 1, v);

      ctx.beginPath();
      ctx.moveTo(startPt.x, startPt.y);
      ctx.lineTo(endPt.x, endPt.y);
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.55)';
      ctx.lineWidth = 1 + (5 - s) * 0.28;
      ctx.stroke();
    }

    // 7. Dibujar los nodos de la escala / notas activas sobre el mástil AR
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

        const pt = projectHomographyPoint(H, u, v);

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

    // 8. Dibujar Keypoints de Anclaje (Cejuela, Traste 12, Traste 24) y HUD de visión
    const fret12U = getNormalizedFretPosition(12, totalFrets);
    const fret12Top = projectHomographyPoint(H, fret12U, 0);
    const fret12Bot = projectHomographyPoint(H, fret12U, 1);

    if (this.showVisionDebug || this.trackingMode === 'manual-calibration' || hoveredKeypoint) {
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(fret12Top.x, fret12Top.y - 12);
      ctx.lineTo(fret12Bot.x, fret12Bot.y + 12);
      ctx.stroke();
      ctx.restore();

      const anchorEntries: [keyof NeckKeypoints, Point2D, string][] = [
        ['nutTop', screenQuad.nutTop, 'CEJUELA SUP'],
        ['nutBottom', screenQuad.nutBottom, 'CEJUELA INF'],
        ['bridgeTop', screenQuad.bridgeTop, `TRASTE ${totalFrets} SUP`],
        ['bridgeBottom', screenQuad.bridgeBottom, `TRASTE ${totalFrets} INF`],
      ];

      for (const [key, pt, label] of anchorEntries) {
        const isHovered = hoveredKeypoint === key;
        // Halo táctil y recuadro indicador del parche 24x24 de Template Matching
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, isHovered ? 18 : 14, 0, Math.PI * 2);
        ctx.fillStyle = isHovered ? 'rgba(250, 204, 21, 0.25)' : 'rgba(16, 185, 129, 0.22)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(pt.x, pt.y, isHovered ? 10 : 7.5, 0, Math.PI * 2);
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
        ctx.fillText(label, pt.x, pt.y - 19);
      }
    }

    if (this.isFallbackFrozen) {
      ctx.fillStyle = 'rgba(245, 158, 11, 0.18)';
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.75)';
      ctx.lineWidth = 1.5;
      ctx.fillRect(16, canvasHeight - 54, 340, 36);
      ctx.strokeRect(16, canvasHeight - 54, 340, 36);
      ctx.fillStyle = '#fde68a';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('FALLBACK ACTIVO: POSE CONGELADA (ÁNGULO / TRACKING)', 28, canvasHeight - 32);
    }

    return {
      fps: Math.round(this.smoothedFps),
      confidence: Math.round(this.trackingConfidence * 100),
      neckAngleDeg,
      isFallbackFrozen: this.isFallbackFrozen,
      trackingMode: this.trackingMode,
      keypoints: normQuad,
      homographyMatrix: H,
    };
  }
}
