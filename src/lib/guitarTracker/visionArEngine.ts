// Motor de Visión por Computador AR — Arquitectura de "Cuerpo Rígido Pivotante"
// 1. Máquina de Estados: 'idle' | 'calibrating_vertical' | 'tracking'
// 2. Ancla Maestra Única (Centroide / Traste 12) con Template Matching SAD (24x24 px) + Filtro de Kalman 2D
// 3. Calculador de Ángulo Rotacional en ventana de 60x60 px (Gradientes Direccionales Sobel + Acumulador de Hough Local)
// 4. Proyección Sintética Rígida de los 4 esquineros (nutTop, bridgeTop, bridgeBottom, nutBottom)

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
}

const PATCH_SIZE = 24;
const HALF_PATCH = 12; // Parche 24x24 px para el Ancla Maestra
const SEARCH_RADIUS = 12; // Radio de búsqueda 2D [-12..+12] alrededor del Ancla Maestra
const ANGLE_WINDOW_SIZE = 60;
const HALF_ANGLE_WIN = 30; // Ventana 60x60 px alrededor del Ancla Maestra para cálculo de rotación
const REQUIRED_CALIBRATION_FRAMES = 45; // ~1.5 segundos continuos en calibración vertical

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
 * Filtro de Kalman 2D con estado [x, y, vx, vy] para suavizar la traslación del Ancla Maestra
 */
class KalmanPoint2D {
  private x = 0.5;
  private y = 0.5;
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
    const predX = this.x + this.vx * safeDt;
    const predY = this.y + this.vy * safeDt;

    const rx = measured.x - predX;
    const ry = measured.y - predY;

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
 * Filtro de Kalman Angular 1D (con desenvolvimiento circular de fase) para suavizar la rotación del mástil
 */
class KalmanAngle1D {
  private angleRad = 0;
  private omega = 0;
  private initialized = false;
  private alpha: number;
  private beta: number;

  constructor(alpha = 0.35, beta = 0.08) {
    this.alpha = alpha;
    this.beta = beta;
  }

  public reset(angleRad: number) {
    this.angleRad = angleRad;
    this.omega = 0;
    this.initialized = true;
  }

  public update(measuredRad: number, dt: number = 1 / 60): number {
    if (!this.initialized) {
      this.reset(measuredRad);
      return this.angleRad;
    }

    const safeDt = Math.max(0.005, Math.min(0.1, dt));
    const predAngle = this.angleRad + this.omega * safeDt;

    // Diferencia angular más corta en [-PI, PI]
    let diff = measuredRad - predAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    this.angleRad = predAngle + this.alpha * diff;
    this.omega = (this.omega + (this.beta / safeDt) * diff * 0.15) * 0.82;

    return this.angleRad;
  }

  public getCurrent(): number {
    return this.angleRad;
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
  // --- Modelo de Cuerpo Rígido Pivotante (1 Ancla Maestra + Ángulo + Geometría Fija) ---
  private masterAnchor: Point2D = { x: 0.50, y: 0.48 };
  private neckAngleRad: number = -0.18; // ~ -10.3° por defecto

  // Dimensiones rígidas establecidas en la calibración (en unidades normalizadas isotrópicas)
  private rigidHalfLength = 0.35;       // Mitad de la longitud del mástil desde el Ancla Maestra
  private rigidNutHalfWidth = 0.052;    // Mitad del grosor en la cejuela
  private rigidBridgeHalfWidth = 0.064; // Mitad del grosor en el traste 24

  // Filtros de Kalman para el Ancla Maestra (X, Y) y para el Ángulo de rotación (Theta)
  private masterKalman = new KalmanPoint2D(0.45, 0.14);
  private angleKalman = new KalmanAngle1D(0.36, 0.09);

  // Parche único de 24x24 píxeles (576 bytes) para el Ancla Maestra (Centro / Traste 12)
  private masterTemplate = new Uint8Array(PATCH_SIZE * PATCH_SIZE);
  private masterTemplateInitialized = false;

  // Cuadrilátero rígido derivado sintéticamente en cada frame
  private anchorQuad: NeckKeypoints = {
    nutTop: { x: 0.14, y: 0.48 },
    bridgeTop: { x: 0.84, y: 0.34 },
    bridgeBottom: { x: 0.86, y: 0.50 },
    nutBottom: { x: 0.16, y: 0.61 },
  };

  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D | null;
  private procWidth = 320;
  private procHeight = 180;
  private grayBuffer: Uint8Array;
  private hasValidGrayFrame = false;

  private trackingConfidence = 0.95;
  private isFallbackFrozen = false;
  private lastFrameTime = performance.now();
  private smoothedFps = 60;

  // Máquina de estados: 'idle' | 'calibrating_vertical' | 'tracking'
  public state: EngineState = 'idle';
  private calibrationHoldFrames = 0;
  private calibCorridor = {
    leftX: 0.45,
    rightX: 0.55,
    topY: 0.14,
    bottomY: 0.86,
  };

  public trackingMode: 'hybrid-auto' | 'kalman-locked' | 'manual-calibration' = 'hybrid-auto';
  public showVisionDebug = true;
  public mirrorVideo = true;
  public invertStringsVertical = false;

  constructor() {
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = this.procWidth;
    this.offscreenCanvas.height = this.procHeight;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });
    this.grayBuffer = new Uint8Array(this.procWidth * this.procHeight);

    this.masterKalman.reset(this.masterAnchor);
    this.angleKalman.reset(this.neckAngleRad);
    this.anchorQuad = this.computeSyntheticRigidQuad(this.masterAnchor, this.neckAngleRad);
  }

  /**
   * 4. Calcula los 4 puntos esquineros (nutTop, bridgeTop, bridgeBottom, nutBottom)
   * de forma SINTÉTICA Y RÍGIDA proyectando vectores desde el Ancla Maestra hacia los extremos
   * usando el ángulo actual y la longitud/grosor del cuerpo rígido.
   * El cuadrilátero jamás se deforma ni se cruza: solo se traslada y rota.
   */
  private computeSyntheticRigidQuad(center: Point2D, angleRad: number): NeckKeypoints {
    const ux = Math.cos(angleRad);
    const uy = Math.sin(angleRad);
    // Vector normal perpendicular al eje del mástil
    const nx = -uy;
    const ny = ux;

    // Compensación suave de relación de aspecto del buffer para mantener rigidez visual al rotar 90°
    const aspectY = this.procWidth / Math.max(1, this.procHeight); // ~1.77
    const scaleY = Math.min(1.45, Math.max(1.0, aspectY * 0.78));

    const projectRigidCorner = (alongOffset: number, perpOffset: number): Point2D => {
      const dx = alongOffset * ux + perpOffset * nx;
      const dy = (alongOffset * uy + perpOffset * ny) * scaleY;
      return {
        x: center.x + dx,
        y: center.y + dy,
      };
    };

    return {
      nutTop: projectRigidCorner(-this.rigidHalfLength, -this.rigidNutHalfWidth),
      bridgeTop: projectRigidCorner(this.rigidHalfLength, -this.rigidBridgeHalfWidth),
      bridgeBottom: projectRigidCorner(this.rigidHalfLength, this.rigidBridgeHalfWidth),
      nutBottom: projectRigidCorner(-this.rigidHalfLength, this.rigidNutHalfWidth),
    };
  }

  /**
   * Inicia la fase de calibración inicial vertical ('calibrating_vertical')
   */
  public startCalibration() {
    this.state = 'calibrating_vertical';
    this.calibrationHoldFrames = 0;
    this.isFallbackFrozen = false;
    this.trackingConfidence = 0.5;
    this.masterTemplate.fill(0);
    this.masterTemplateInitialized = false;
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
   * Si el usuario arrastra un pin en pantalla para ajuste manual (fine-tuning),
   * reposiciona el extremo arrastrado (Cejuela o Traste 24), recalcula el Ancla Maestra
   * en el punto medio exacto entre ambos extremos con longitud acotada [0.16..0.36]
   * y recaptura el parche 24x24 bajo la nueva posición real de la guitarra.
   */
  public setNormalizedKeypoint(key: keyof NeckKeypoints, pt: Point2D) {
    const clamped: Point2D = {
      x: Math.max(0.05, Math.min(0.95, pt.x)),
      y: Math.max(0.05, Math.min(0.95, pt.y)),
    };

    const currentNutCenter: Point2D = {
      x: (this.anchorQuad.nutTop.x + this.anchorQuad.nutBottom.x) * 0.5,
      y: (this.anchorQuad.nutTop.y + this.anchorQuad.nutBottom.y) * 0.5,
    };
    const currentBridgeCenter: Point2D = {
      x: (this.anchorQuad.bridgeTop.x + this.anchorQuad.bridgeBottom.x) * 0.5,
      y: (this.anchorQuad.bridgeTop.y + this.anchorQuad.bridgeBottom.y) * 0.5,
    };

    let newNut = currentNutCenter;
    let newBridge = currentBridgeCenter;

    if (key === 'nutTop' || key === 'nutBottom') {
      newNut = clamped;
    } else {
      newBridge = clamped;
    }

    const dx = newBridge.x - newNut.x;
    const dy = newBridge.y - newNut.y;
    const fullDist = Math.hypot(dx, dy);

    this.neckAngleRad = Math.atan2(dy, dx);
    // Acotar rigurosamente la semi-longitud del mástil para que jamás se vuelva gigante
    this.rigidHalfLength = Math.max(0.16, Math.min(0.36, fullDist * 0.5));

    // Trasladar el Ancla Maestra al nuevo centro geométrico entre Cejuela y Puente
    this.masterAnchor = {
      x: Math.max(0.12, Math.min(0.88, (newNut.x + newBridge.x) * 0.5)),
      y: Math.max(0.12, Math.min(0.88, (newNut.y + newBridge.y) * 0.5)),
    };

    this.masterKalman.reset(this.masterAnchor);
    this.angleKalman.reset(this.neckAngleRad);
    this.anchorQuad = this.computeSyntheticRigidQuad(this.masterAnchor, this.neckAngleRad);

    if (this.hasValidGrayFrame) {
      this.captureMasterPatchTemplate(this.masterAnchor);
    } else {
      this.masterTemplateInitialized = false;
    }

    this.state = 'tracking';
    this.trackingConfidence = 0.98;
    this.isFallbackFrozen = false;
  }

  public resetDefaultNeckPose() {
    this.masterAnchor = { x: 0.50, y: 0.47 };
    this.neckAngleRad = -0.18;
    this.rigidHalfLength = 0.35;
    this.rigidNutHalfWidth = 0.052;
    this.rigidBridgeHalfWidth = 0.064;

    this.masterKalman.reset(this.masterAnchor);
    this.angleKalman.reset(this.neckAngleRad);
    this.anchorQuad = this.computeSyntheticRigidQuad(this.masterAnchor, this.neckAngleRad);

    this.masterTemplate.fill(0);
    this.masterTemplateInitialized = false;
    if (this.hasValidGrayFrame) {
      this.captureMasterPatchTemplate(this.masterAnchor);
    }

    this.trackingConfidence = 0.96;
    this.isFallbackFrozen = false;
  }

  /**
   * Captura el frame actual de video en el buffer de luminancia (escala de grises 1 byte/píxel),
   * respetando el modo espejo y la relación de aspecto.
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
      this.grayBuffer[i] = (77 * rgba[p] + 150 * rgba[p + 1] + 29 * rgba[p + 2]) >> 8;
    }

    this.hasValidGrayFrame = true;
    return true;
  }

  /**
   * Captura el parche de referencia de 24x24 píxeles únicamente para el Ancla Maestra
   */
  private captureMasterPatchTemplate(normCenter: Point2D) {
    const cx = Math.round(normCenter.x * this.procWidth);
    const cy = Math.round(normCenter.y * this.procHeight);

    const clampedCx = Math.max(HALF_PATCH + 1, Math.min(this.procWidth - HALF_PATCH - 2, cx));
    const clampedCy = Math.max(HALF_PATCH + 1, Math.min(this.procHeight - HALF_PATCH - 2, cy));

    let idx = 0;
    for (let py = -HALF_PATCH; py < HALF_PATCH; py++) {
      const rowOffset = (clampedCy + py) * this.procWidth;
      for (let px = -HALF_PATCH; px < HALF_PATCH; px++) {
        this.masterTemplate[idx++] = this.grayBuffer[rowOffset + clampedCx + px];
      }
    }
    this.masterTemplateInitialized = true;
  }

  /**
   * 2. Trackea únicamente el Ancla Maestra (centroide / traste 12) usando Template Matching SAD (24x24 px)
   */
  private matchMasterAnchorTemplate2D(
    currentCenter: Point2D
  ): { point: Point2D; confidence: number } {
    const w = this.procWidth;
    const h = this.procHeight;
    const gray = this.grayBuffer;
    const template = this.masterTemplate;

    const startX = Math.round(currentCenter.x * w);
    const startY = Math.round(currentCenter.y * h);

    if (!this.masterTemplateInitialized) {
      this.captureMasterPatchTemplate(currentCenter);
      return { point: currentCenter, confidence: 0.95 };
    }

    const minX = Math.max(HALF_PATCH + 1, startX - SEARCH_RADIUS);
    const maxX = Math.min(w - HALF_PATCH - 2, startX + SEARCH_RADIUS);
    const minY = Math.max(HALF_PATCH + 1, startY - SEARCH_RADIUS);
    const maxY = Math.min(h - HALF_PATCH - 2, startY + SEARCH_RADIUS);

    if (minX > maxX || minY > maxY) {
      return { point: currentCenter, confidence: 0.5 };
    }

    let bestSad = Infinity;
    let bestX = startX;
    let bestY = startY;

    // Paso 1: Búsqueda en cuadrícula paso 2 (Coarse search)
    for (let cy = minY; cy <= maxY; cy += 2) {
      for (let cx = minX; cx <= maxX; cx += 2) {
        let sad = (Math.abs(cx - startX) + Math.abs(cy - startY)) * 16;
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

    // Paso 2: Refinamiento fino de 1 píxel (Fine search 3x3) alrededor del mejor candidato
    const fineMinX = Math.max(HALF_PATCH + 1, bestX - 1);
    const fineMaxX = Math.min(w - HALF_PATCH - 2, bestX + 1);
    const fineMinY = Math.max(HALF_PATCH + 1, bestY - 1);
    const fineMaxY = Math.min(h - HALF_PATCH - 2, bestY + 1);

    for (let cy = fineMinY; cy <= fineMaxY; cy++) {
      for (let cx = fineMinX; cx <= fineMaxX; cx++) {
        let sad = (Math.abs(cx - startX) + Math.abs(cy - startY)) * 16;
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
    const confidence = Math.max(0, Math.min(1, 1 - avgPixelDiff / 68));

    const updatedCenter: Point2D = {
      x: Math.max(0.12, Math.min(0.88, bestX / w)),
      y: Math.max(0.12, Math.min(0.88, bestY / h)),
    };

    // Actualización adaptativa suave (6%) del template del Ancla Maestra cuando la confianza es alta
    if (confidence > 0.74) {
      let tIdx = 0;
      for (let py = -HALF_PATCH; py < HALF_PATCH; py++) {
        const rowOffset = (bestY + py) * w + bestX;
        for (let px = -HALF_PATCH; px < HALF_PATCH; px++) {
          const currentVal = gray[rowOffset + px];
          template[tIdx] = Math.round(template[tIdx] * 0.94 + currentVal * 0.06);
          tIdx++;
        }
      }
    }

    return { point: updatedCenter, confidence };
  }

  /**
   * 3. Calculador de ángulo en cada frame dentro de una ventana de 60x60 px alrededor del Ancla Maestra.
   * Mide el gradiente direccional (Sobel) y acumula un histograma de orientación de Hough local
   * para determinar la rotación exacta actual del mástil.
   */
  private estimateNeckAngleInWindow60x60(
    centerNorm: Point2D,
    referenceAngleRad: number
  ): { angleRad: number; confidence: number } {
    const w = this.procWidth;
    const h = this.procHeight;
    const gray = this.grayBuffer;

    const cx = Math.round(centerNorm.x * w);
    const cy = Math.round(centerNorm.y * h);

    const minX = Math.max(2, cx - HALF_ANGLE_WIN);
    const maxX = Math.min(w - 3, cx + HALF_ANGLE_WIN);
    const minY = Math.max(2, cy - HALF_ANGLE_WIN);
    const maxY = Math.min(h - 3, cy + HALF_ANGLE_WIN);

    // 72 bins angulares en [-PI/2, +PI/2) (resolución de 2.5° por bin)
    const NUM_BINS = 72;
    const hist = new Float32Array(NUM_BINS);
    let totalGradEnergy = 0;

    for (let y = minY; y <= maxY; y++) {
      const row = y * w;
      for (let x = minX; x <= maxX; x++) {
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

        const mag = Math.hypot(gx, gy);
        if (mag < 38) continue;

        // La tangente del borde del mástil / cuerdas es perpendicular al gradiente: atan2(gx, -gy)
        let tangentAngle = Math.atan2(gx, -gy); // en [-PI, PI]
        // Plegar al dominio axial [-PI/2, PI/2)
        if (tangentAngle >= Math.PI * 0.5) tangentAngle -= Math.PI;
        if (tangentAngle < -Math.PI * 0.5) tangentAngle += Math.PI;

        const normBin = ((tangentAngle + Math.PI * 0.5) / Math.PI) * NUM_BINS;
        const binIdx = Math.max(0, Math.min(NUM_BINS - 1, Math.floor(normBin)));

        // Ponderación espacial más fuerte cerca del Ancla Maestra dentro de la ventana 60x60
        const distSq = (x - cx) * (x - cx) + (y - cy) * (y - cy);
        const spatialWeight = 1 / (1 + distSq / (ANGLE_WINDOW_SIZE * 10));

        const weight = mag * spatialWeight;
        hist[binIdx] += weight;
        totalGradEnergy += weight;
      }
    }

    if (totalGradEnergy < 450) {
      return { angleRad: referenceAngleRad, confidence: 0.4 };
    }

    // Suavizado circular del histograma angular (kernel [1, 2, 1] / 4)
    const smoothedHist = new Float32Array(NUM_BINS);
    for (let b = 0; b < NUM_BINS; b++) {
      const prev = hist[(b - 1 + NUM_BINS) % NUM_BINS];
      const curr = hist[b];
      const next = hist[(b + 1) % NUM_BINS];
      smoothedHist[b] = (prev + 2 * curr + next) * 0.25;
    }

    // Prior suave de continuidad temporal alrededor del ángulo previo para evitar saltos espurios
    let bestBin = 0;
    let bestScore = -Infinity;

    for (let b = 0; b < NUM_BINS; b++) {
      const binAngle = -Math.PI * 0.5 + ((b + 0.5) / NUM_BINS) * Math.PI;
      // Diferencia axial en [-PI/2, PI/2]
      let axialDiff = binAngle - referenceAngleRad;
      while (axialDiff > Math.PI * 0.5) axialDiff -= Math.PI;
      while (axialDiff < -Math.PI * 0.5) axialDiff += Math.PI;

      const continuityBias = Math.exp(-(axialDiff * axialDiff) / (2 * 0.55 * 0.55));
      const score = smoothedHist[b] * (0.65 + 0.35 * continuityBias);

      if (score > bestScore) {
        bestScore = score;
        bestBin = b;
      }
    }

    // Interpolación parabólica sub-bin para obtener el ángulo continuo exacto
    const prevVal = smoothedHist[(bestBin - 1 + NUM_BINS) % NUM_BINS];
    const currVal = smoothedHist[bestBin];
    const nextVal = smoothedHist[(bestBin + 1) % NUM_BINS];
    const denom = prevVal - 2 * currVal + nextVal;
    const offset = Math.abs(denom) > 1e-4 ? Math.max(-0.5, Math.min(0.5, (0.5 * (prevVal - nextVal)) / denom)) : 0;

    let detectedAxialRad = -Math.PI * 0.5 + ((bestBin + 0.5 + offset) / NUM_BINS) * Math.PI;

    // Desambiguar sentido del vector (+/- PI) para que sea continuo respecto a referenceAngleRad
    let delta = detectedAxialRad - referenceAngleRad;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;

    if (delta > Math.PI * 0.5) {
      detectedAxialRad -= Math.PI;
    } else if (delta < -Math.PI * 0.5) {
      detectedAxialRad += Math.PI;
    }

    const peakConfidence = Math.min(1, (currVal * NUM_BINS) / (totalGradEnergy * 2.8));
    return { angleRad: detectedAxialRad, confidence: Math.max(0.45, peakConfidence) };
  }

  /**
   * Auto-escaneo bajo demanda que localiza el centroide y ángulo del mástil y fija el Cuerpo Rígido
   */
  public autoScanNeckFromVideo(video: HTMLVideoElement): boolean {
    if (!this.captureGrayscaleFrame(video)) return false;

    const angleEst = this.estimateNeckAngleInWindow60x60(this.masterAnchor, this.neckAngleRad);
    this.neckAngleRad = angleEst.angleRad;
    this.angleKalman.reset(this.neckAngleRad);
    this.masterKalman.reset(this.masterAnchor);

    this.captureMasterPatchTemplate(this.masterAnchor);
    this.anchorQuad = this.computeSyntheticRigidQuad(this.masterAnchor, this.neckAngleRad);

    this.state = 'tracking';
    this.trackingConfidence = 0.96;
    this.isFallbackFrozen = false;
    return true;
  }

  /**
   * Fase de Calibración Inicial Vertical Endurecida (detectVerticalNeck):
   * 1. Filtro de Bordes Paralelos con Polaridad Opuesta: Busca un par de bordes verticales rectilíneos
   *    con signo de gradiente opuesto (borde izquierdo oscuro->claro y derecho claro->oscuro, o viceversa)
   *    separados estrictamente entre el 8% y el 20% del ancho del frame.
   * 2. Rechazo de Formas Orgánicas: Aplica un umbral de gradiente Sobel X estricto (|Gx| >= 95 y |Gx| > 1.75*|Gy|)
   *    y exige colinealidad en 3 tercios verticales para descartar rostros, cuellos y siluetas de camisetas.
   * 3. Filtro de Varianza Interna y Alta Frecuencia (Trastes/Cuerdas): Calcula la varianza de luminancia
   *    y la densidad de gradientes horizontales (Sobel Y de los trastes metálicos) dentro del corredor.
   *    Si el interior es plano o suave (piel, pecho o tela), descarta el candidato inmediatamente.
   */
  public detectVerticalNeck(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    video: HTMLVideoElement | null
  ): boolean {
    if (!video || video.readyState < 2 || !this.captureGrayscaleFrame(video)) {
      return false;
    }

    const w = this.procWidth;
    const h = this.procHeight;
    const gray = this.grayBuffer;

    const topRow = Math.floor(h * 0.14);
    const bottomRow = Math.floor(h * 0.86);
    const spanRows = bottomRow - topRow + 1;
    const minSearchX = Math.floor(w * 0.20);
    const maxSearchX = Math.floor(w * 0.80);

    // Perfiles 1D separados por polaridad de Sobel X (Positivo: oscuro->claro, Negativo: claro->oscuro)
    const rawPosX = new Float32Array(w);
    const rawNegX = new Float32Array(w);

    // Contadores de presencia en 3 segmentos verticales (superior, medio, inferior) para exigir paralelismo recto
    const segSpan = Math.floor(spanRows / 3);
    const posSegHits = [new Uint16Array(w), new Uint16Array(w), new Uint16Array(w)];
    const negSegHits = [new Uint16Array(w), new Uint16Array(w), new Uint16Array(w)];

    // 2. Umbral de gradiente Sobel estricto para ignorar bordes suaves de caras, brazos y camisetas
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

        // Solo acumular píxeles con borde vertical nítido (rechaza curvas orgánicas diagonales)
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

    // Suavizado estrecho [1, 2, 1] / 4 conservando la separación de polaridad
    const posProfileX = new Float32Array(w);
    const negProfileX = new Float32Array(w);
    for (let x = minSearchX; x <= maxSearchX; x++) {
      posProfileX[x] = (rawPosX[x - 1] + 2 * rawPosX[x] + rawPosX[x + 1]) * 0.25;
      negProfileX[x] = (rawNegX[x - 1] + 2 * rawNegX[x] + rawNegX[x + 1]) * 0.25;
    }

    // 1. Ancho lógico estricto del mástil: entre el 8% y el 20% del ancho del frame
    const minNeckWidthPx = Math.floor(w * 0.08);
    const maxNeckWidthPx = Math.floor(w * 0.20);
    const centerFrameX = w * 0.5;
    const minSegmentHits = Math.max(4, Math.floor(segSpan * 0.16));

    // Evaluador de colinealidad vertical: exige que el borde exista en los 3 tercios verticales
    const hasStraightVerticalSupport = (
      segArray: Uint16Array[],
      x: number
    ): boolean => {
      const s0 = segArray[0][x - 1] + segArray[0][x] + segArray[0][x + 1];
      const s1 = segArray[1][x - 1] + segArray[1][x] + segArray[1][x + 1];
      const s2 = segArray[2][x - 1] + segArray[2][x] + segArray[2][x + 1];
      return s0 >= minSegmentHits && s1 >= minSegmentHits && s2 >= minSegmentHits;
    };

    // 3. Evaluador de Varianza Interna de Luminancia + Frecuencia de Trastes Horizontales (Sobel Y)
    const evaluateInternalFretboardTexture = (
      lx: number,
      rx: number
    ): { valid: boolean; variance: number; fretRows: number } => {
      const innerLeft = lx + 2;
      const innerRight = rx - 2;
      if (innerRight <= innerLeft) {
        return { valid: false, variance: 0, fretRows: 0 };
      }

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

          // Gradiente vertical Sobel Y (detecta líneas horizontales de los trastes metálicos)
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

        if (rowGyPeak >= 80) {
          fretRows++;
        }
      }

      if (pixelCount === 0) return { valid: false, variance: 0, fretRows: 0 };

      const mean = sumLum / pixelCount;
      const variance = sumLumSq / pixelCount - mean * mean;

      // Exigir varianza interna alta (>= 240) y presencia de múltiples trastes horizontales (>= 10 filas)
      // Una camiseta, brazo o rostro tiene textura interna plana o carece de trastes periódicos
      const valid = variance >= 240 && fretRows >= 10;
      return { valid, variance, fretRows };
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
        // Caso A: Mástil más claro que el fondo (Izquierda Oscuro->Claro [Pos], Derecha Claro->Oscuro [Neg])
        let oppositePairEnergy = 0;
        if (
          leftStraightPos &&
          negProfileX[rx] >= minEdgeEnergy &&
          hasStraightVerticalSupport(negSegHits, rx)
        ) {
          const symmetry =
            1 - (Math.abs(posLeft - negProfileX[rx]) / (posLeft + negProfileX[rx] + 1e-3)) * 0.45;
          oppositePairEnergy = (posLeft + negProfileX[rx]) * 0.5 * symmetry;
        }

        // Caso B: Mástil oscuro sobre fondo claro (Izquierda Claro->Oscuro [Neg], Derecha Oscuro->Claro [Pos])
        if (
          leftStraightNeg &&
          posProfileX[rx] >= minEdgeEnergy &&
          hasStraightVerticalSupport(posSegHits, rx)
        ) {
          const symmetry =
            1 - (Math.abs(negLeft - posProfileX[rx]) / (negLeft + posProfileX[rx] + 1e-3)) * 0.45;
          const candidateB = (negLeft + posProfileX[rx]) * 0.5 * symmetry;
          if (candidateB > oppositePairEnergy) {
            oppositePairEnergy = candidateB;
          }
        }

        if (oppositePairEnergy < minEdgeEnergy) continue;

        const midX = (lx + rx) * 0.5;
        const centerBias = 1 - (Math.abs(midX - centerFrameX) / (w * 0.5)) * 0.35;
        const preliminaryScore = oppositePairEnergy * centerBias;

        if (preliminaryScore <= bestScore) continue;

        // Validar textura interna de trastes y varianza antes de aceptar el par de bordes
        const textureCheck = evaluateInternalFretboardTexture(lx, rx);
        if (!textureCheck.valid) continue;

        const textureBonus = Math.min(1.35, 1 + (textureCheck.fretRows / 40) * 0.35);
        const finalScore = preliminaryScore * textureBonus;

        if (finalScore > bestScore) {
          bestScore = finalScore;
          bestLeftX = lx;
          bestRightX = rx;
        }
      }
    }

    const isDetected = bestLeftX !== -1 && bestRightX !== -1 && bestScore >= minEdgeEnergy * 0.95;

    if (isDetected) {
      const normLeft = bestLeftX / w;
      const normRight = bestRightX / w;

      this.calibCorridor.leftX = this.calibCorridor.leftX * 0.65 + normLeft * 0.35;
      this.calibCorridor.rightX = this.calibCorridor.rightX * 0.65 + normRight * 0.35;
      this.calibCorridor.topY = 0.14;
      this.calibCorridor.bottomY = 0.86;

      this.calibrationHoldFrames = Math.min(
        REQUIRED_CALIBRATION_FRAMES,
        this.calibrationHoldFrames + 1
      );
      this.trackingConfidence = Math.min(
        0.99,
        0.55 + (this.calibrationHoldFrames / REQUIRED_CALIBRATION_FRAMES) * 0.44
      );
    } else {
      // Descartar inmediatamente si es una silueta orgánica sin trastes ni bordes paralelos
      this.calibrationHoldFrames = Math.max(0, this.calibrationHoldFrames - 3);
      this.trackingConfidence = Math.max(0.25, this.trackingConfidence - 0.04);
    }

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
      isDetected
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

    if (this.calibrationHoldFrames >= REQUIRED_CALIBRATION_FRAMES) {
      const centerX = (this.calibCorridor.leftX + this.calibCorridor.rightX) * 0.5;
      const centerY = (this.calibCorridor.topY + this.calibCorridor.bottomY) * 0.5;
      const halfWidth = Math.max(
        0.04,
        Math.min(0.10, (this.calibCorridor.rightX - this.calibCorridor.leftX) * 0.5)
      );

      // Fijar parámetros del Cuerpo Rígido Pivotante a partir del diapasón real verificado
      this.masterAnchor = { x: centerX, y: centerY };
      this.neckAngleRad = Math.PI * 0.5; // 90° vertical inicial
      this.rigidHalfLength = 0.32;
      this.rigidNutHalfWidth = halfWidth * 0.9;
      this.rigidBridgeHalfWidth = halfWidth * 1.06;

      this.masterKalman.reset(this.masterAnchor);
      this.angleKalman.reset(this.neckAngleRad);
      this.captureMasterPatchTemplate(this.masterAnchor);

      this.anchorQuad = this.computeSyntheticRigidQuad(this.masterAnchor, this.neckAngleRad);
      this.trackingConfidence = 0.98;
      this.isFallbackFrozen = false;
      this.state = 'tracking';
      return true;
    }

    return false;
  }

  /**
   * Paso de Tracking por Cuerpo Rígido Pivotante:
   * 1. Sigue únicamente el Ancla Maestra con SAD (24x24 px) + Kalman 2D.
   * 2. Calcula el ángulo actual en ventana de 60x60 px alrededor del Ancla Maestra + Kalman Angular.
   * 3. Deriva sintética y rígidamente los 4 esquineros (nutTop, bridgeTop, bridgeBottom, nutBottom).
   */
  private updateTrackingStep(video: HTMLVideoElement | null, dt: number): NeckKeypoints {
    if (video && video.readyState >= 2 && this.trackingMode === 'hybrid-auto') {
      const captured = this.captureGrayscaleFrame(video);
      if (captured) {
        // 1. Seguir el Ancla Maestra (Centroide / Traste 12) con Template Matching SAD 24x24
        const anchorMatch = this.matchMasterAnchorTemplate2D(this.masterAnchor);
        this.masterAnchor = this.masterKalman.update(anchorMatch.point, dt);

        // 2. Calcular ángulo del mástil en ventana de 60x60 px alrededor del Ancla Maestra
        const angleMatch = this.estimateNeckAngleInWindow60x60(
          this.masterAnchor,
          this.neckAngleRad
        );
        this.neckAngleRad = this.angleKalman.update(angleMatch.angleRad, dt);

        // 3. Derivar sintéticamente los 4 puntos esquineros de forma 100% rígida
        this.anchorQuad = this.computeSyntheticRigidQuad(
          this.masterAnchor,
          this.neckAngleRad
        );

        const combinedConfidence = anchorMatch.confidence * 0.65 + angleMatch.confidence * 0.35;
        this.trackingConfidence = Math.min(
          0.99,
          this.trackingConfidence * 0.85 + combinedConfidence * 0.15
        );
        this.isFallbackFrozen = anchorMatch.confidence < 0.38;
      }
    } else {
      this.masterAnchor = this.masterKalman.update(this.masterAnchor, dt);
      this.neckAngleRad = this.angleKalman.update(this.neckAngleRad, dt);
      this.anchorQuad = this.computeSyntheticRigidQuad(this.masterAnchor, this.neckAngleRad);
      this.isFallbackFrozen = false;
      this.trackingConfidence = 0.97;
    }

    return this.anchorQuad;
  }

  /**
   * Renderiza el frame de video + el overlay AR con proyección homográfica 3D del Cuerpo Rígido
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

    // 2. Máquina de estados del motor: 'idle' | 'calibrating_vertical' | 'tracking'
    if (this.state === 'calibrating_vertical') {
      this.detectVerticalNeck(ctx, canvasWidth, canvasHeight, video);

      const calibQuad = this.getNormalizedKeypoints();
      const calibScreenQuad: NeckKeypoints = {
        nutTop: { x: calibQuad.nutTop.x * canvasWidth, y: calibQuad.nutTop.y * canvasHeight },
        bridgeTop: { x: calibQuad.bridgeTop.x * canvasWidth, y: calibQuad.bridgeTop.y * canvasHeight },
        bridgeBottom: { x: calibQuad.bridgeBottom.x * canvasWidth, y: calibQuad.bridgeBottom.y * canvasHeight },
        nutBottom: { x: calibQuad.nutBottom.x * canvasWidth, y: calibQuad.nutBottom.y * canvasHeight },
      };

      return {
        fps: Math.round(this.smoothedFps),
        confidence: Math.round(this.trackingConfidence * 100),
        neckAngleDeg: 90,
        isFallbackFrozen: false,
        trackingMode: this.trackingMode,
        engineState: this.state,
        calibrationFrames: this.calibrationHoldFrames,
        keypoints: calibQuad,
        homographyMatrix: computeUnitSquareHomography(calibScreenQuad),
      };
    }

    // 3. Actualizar Cuerpo Rígido Pivotante (Ancla Maestra SAD 24x24 + Ángulo 60x60)
    const normQuad =
      this.state === 'tracking'
        ? this.updateTrackingStep(video, dt)
        : this.getNormalizedKeypoints();

    const screenQuad: NeckKeypoints = {
      nutTop: { x: normQuad.nutTop.x * canvasWidth, y: normQuad.nutTop.y * canvasHeight },
      bridgeTop: { x: normQuad.bridgeTop.x * canvasWidth, y: normQuad.bridgeTop.y * canvasHeight },
      bridgeBottom: { x: normQuad.bridgeBottom.x * canvasWidth, y: normQuad.bridgeBottom.y * canvasHeight },
      nutBottom: { x: normQuad.nutBottom.x * canvasWidth, y: normQuad.nutBottom.y * canvasHeight },
    };

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

    // 5. Dibujar trastes proyectados por homografía
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

    // 8. Dibujar el Ancla Maestra (Traste 12 / Centroide) y los 4 esquineros rígidos
    const masterScreenX = this.masterAnchor.x * canvasWidth;
    const masterScreenY = this.masterAnchor.y * canvasHeight;

    if (this.showVisionDebug || this.trackingMode === 'manual-calibration' || hoveredKeypoint) {
      // Visualización del Ancla Maestra (parche SAD 24x24 + ventana rotacional 60x60)
      ctx.save();
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.75)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(masterScreenX - 24, masterScreenY - 24, 48, 48);
      ctx.restore();

      ctx.beginPath();
      ctx.arc(masterScreenX, masterScreenY, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#22d3ee';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      ctx.fillStyle = 'rgba(9, 9, 11, 0.88)';
      ctx.fillRect(masterScreenX - 48, masterScreenY - 26, 96, 15);
      ctx.fillStyle = '#67e8f9';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('ANCLA MAESTRA', masterScreenX, masterScreenY - 17);

      const anchorEntries: [keyof NeckKeypoints, Point2D, string][] = [
        ['nutTop', screenQuad.nutTop, 'CEJUELA SUP'],
        ['nutBottom', screenQuad.nutBottom, 'CEJUELA INF'],
        ['bridgeTop', screenQuad.bridgeTop, `TRASTE ${totalFrets} SUP`],
        ['bridgeBottom', screenQuad.bridgeBottom, `TRASTE ${totalFrets} INF`],
      ];

      for (const [key, pt, label] of anchorEntries) {
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
        ctx.fillText(label, pt.x, pt.y - 19);
      }
    }

    return {
      fps: Math.round(this.smoothedFps),
      confidence: Math.round(this.trackingConfidence * 100),
      neckAngleDeg,
      isFallbackFrozen: this.isFallbackFrozen,
      trackingMode: this.trackingMode,
      engineState: this.state,
      calibrationFrames: this.calibrationHoldFrames,
      keypoints: normQuad,
      homographyMatrix: H,
    };
  }
}
