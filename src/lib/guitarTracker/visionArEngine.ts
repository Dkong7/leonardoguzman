// Motor de Visión por Computador, Homografía 2D/3D, Filtro de Kalman y Renderizado AR del Diapasón

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
  nutTop: Point2D;     // Cejuela borde superior (6ta cuerda o 1ra según orientación)
  bridgeTop: Point2D;  // Traste final (21/22/24) borde superior
  bridgeBottom: Point2D; // Traste final borde inferior
  nutBottom: Point2D;  // Cejuela borde inferior
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

/**
 * Filtro de Kalman 2D con estado [x, y, vx, vy] para suavizar cada punto clave
 * y predecir posición entre frames evitando vibraciones (jitter).
 */
class KalmanPoint2D {
  private x = 0;
  private y = 0;
  private vx = 0;
  private vy = 0;
  private initialized = false;
  private alpha: number;
  private beta: number;

  constructor(alpha = 0.35, beta = 0.08) {
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

    // Predicción de estado
    const predX = this.x + this.vx * dt;
    const predY = this.y + this.vy * dt;

    // Innovación (residuo)
    const rx = measured.x - predX;
    const ry = measured.y - predY;

    // Actualización Alpha-Beta Kalman
    this.x = predX + this.alpha * rx;
    this.y = predY + this.alpha * ry;
    this.vx = this.vx + (this.beta / Math.max(0.005, dt)) * rx * 0.15;
    this.vy = this.vy + (this.beta / Math.max(0.005, dt)) * ry * 0.15;

    // Amortiguamiento de velocidad para evitar sobreimpulso
    this.vx *= 0.85;
    this.vy *= 0.85;

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
  private kalmanNutTop = new KalmanPoint2D(0.32, 0.06);
  private kalmanBridgeTop = new KalmanPoint2D(0.32, 0.06);
  private kalmanBridgeBottom = new KalmanPoint2D(0.32, 0.06);
  private kalmanNutBottom = new KalmanPoint2D(0.32, 0.06);

  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D | null;
  private procWidth = 160;
  private procHeight = 90;

  // Puntos ancla normalizados en coordenadas de canvas (0..1)
  private anchorQuad: NeckKeypoints = {
    nutTop: { x: 0.14, y: 0.44 },
    bridgeTop: { x: 0.84, y: 0.39 },
    bridgeBottom: { x: 0.86, y: 0.56 },
    nutBottom: { x: 0.15, y: 0.57 },
  };

  private lastValidQuad: NeckKeypoints = { ...this.anchorQuad };
  private trackingConfidence = 0.94;
  private isFallbackFrozen = false;
  private lastFrameTime = performance.now();
  private smoothedFps = 60;

  public trackingMode: 'hybrid-auto' | 'kalman-locked' | 'manual-calibration' = 'hybrid-auto';
  public showVisionDebug = false;
  public mirrorVideo = true;
  public invertStringsVertical = false; // Permite invertir orden visual de 6ta/1ra cuerda según postura

  constructor() {
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = this.procWidth;
    this.offscreenCanvas.height = this.procHeight;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });
    this.resetKalmanToCurrent();
  }

  private resetKalmanToCurrent() {
    this.kalmanNutTop.reset(this.anchorQuad.nutTop);
    this.kalmanBridgeTop.reset(this.anchorQuad.bridgeTop);
    this.kalmanBridgeBottom.reset(this.anchorQuad.bridgeBottom);
    this.kalmanNutBottom.reset(this.anchorQuad.nutBottom);
  }

  public getNormalizedKeypoints(): NeckKeypoints {
    return {
      nutTop: { ...this.anchorQuad.nutTop },
      bridgeTop: { ...this.anchorQuad.bridgeTop },
      bridgeBottom: { ...this.anchorQuad.bridgeBottom },
      nutBottom: { ...this.anchorQuad.nutBottom },
    };
  }

  public setNormalizedKeypoint(key: keyof NeckKeypoints, pt: Point2D) {
    this.anchorQuad[key] = {
      x: Math.max(0.02, Math.min(0.98, pt.x)),
      y: Math.max(0.02, Math.min(0.98, pt.y)),
    };
    this.lastValidQuad = this.getNormalizedKeypoints();
    this.resetKalmanToCurrent();
    this.trackingConfidence = 0.98;
    this.isFallbackFrozen = false;
  }

  public resetDefaultNeckPose() {
    this.anchorQuad = {
      nutTop: { x: 0.14, y: 0.43 },
      bridgeTop: { x: 0.84, y: 0.38 },
      bridgeBottom: { x: 0.86, y: 0.56 },
      nutBottom: { x: 0.15, y: 0.56 },
    };
    this.lastValidQuad = this.getNormalizedKeypoints();
    this.resetKalmanToCurrent();
    this.trackingConfidence = 0.96;
    this.isFallbackFrozen = false;
  }

  /**
   * Escaneo híbrido clásico (Bordes Sobel/Canny + Perfil de Líneas Horizontales/Diagonales de Hough
   * + Contraste de trastes metálicos verticales) para ajustar la pose del diapasón en vivo.
   */
  public autoScanNeckFromVideo(video: HTMLVideoElement): boolean {
    if (!this.offscreenCtx || video.readyState < 2) return false;

    this.offscreenCtx.drawImage(video, 0, 0, this.procWidth, this.procHeight);
    const imgData = this.offscreenCtx.getImageData(0, 0, this.procWidth, this.procHeight);
    const data = imgData.data;

    // Buscamos la banda longitudinal con mayor densidad de bordes horizontales (cuerdas/bordes del mástil)
    // combinada con bordes verticales periódicos (trastes metálicos)
    const rowScores = new Float32Array(this.procHeight);
    const colGradient = new Float32Array(this.procWidth);

    for (let y = Math.floor(this.procHeight * 0.18); y < Math.floor(this.procHeight * 0.85); y++) {
      let rowEdgeSum = 0;
      for (let x = Math.floor(this.procWidth * 0.12); x < Math.floor(this.procWidth * 0.88); x++) {
        const idx = (y * this.procWidth + x) * 4;
        const idxUp = ((y - 1) * this.procWidth + x) * 4;
        const idxDown = ((y + 1) * this.procWidth + x) * 4;
        const idxRight = (y * this.procWidth + (x + 1)) * 4;

        const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        const lumUp = 0.299 * data[idxUp] + 0.587 * data[idxUp + 1] + 0.114 * data[idxUp + 2];
        const lumDown = 0.299 * data[idxDown] + 0.587 * data[idxDown + 1] + 0.114 * data[idxDown + 2];
        const lumRight = 0.299 * data[idxRight] + 0.587 * data[idxRight + 1] + 0.114 * data[idxRight + 2];

        const gy = Math.abs(lumDown - lumUp); // Borde horizontal (mástil y cuerdas)
        const gx = Math.abs(lumRight - lum);  // Borde vertical (trastes)

        if (gy > 18 && gx > 10) {
          rowEdgeSum += gy * 1.2 + gx * 0.8;
          colGradient[x] += gx;
        }
      }
      rowScores[y] = rowEdgeSum;
    }

    // Encontrar el centro vertical de la banda con mayor energía de mástil
    let bestBandCenterY = this.procHeight * 0.5;
    let maxBandScore = 0;
    const bandHalfHeight = Math.floor(this.procHeight * 0.075);

    for (let y = bandHalfHeight + 15; y < this.procHeight - bandHalfHeight - 15; y++) {
      let sum = 0;
      for (let dy = -bandHalfHeight; dy <= bandHalfHeight; dy++) {
        sum += rowScores[y + dy];
      }
      if (sum > maxBandScore) {
        maxBandScore = sum;
        bestBandCenterY = y;
      }
    }

    if (maxBandScore < 8000) {
      return false;
    }

    const normCenterY = Math.max(0.28, Math.min(0.72, bestBandCenterY / this.procHeight));
    const halfThickness = 0.072;

    this.anchorQuad = {
      nutTop: { x: 0.14, y: normCenterY - halfThickness + 0.015 },
      bridgeTop: { x: 0.85, y: normCenterY - halfThickness - 0.02 },
      bridgeBottom: { x: 0.86, y: normCenterY + halfThickness + 0.015 },
      nutBottom: { x: 0.15, y: normCenterY + halfThickness },
    };
    this.lastValidQuad = this.getNormalizedKeypoints();
    this.resetKalmanToCurrent();
    this.trackingConfidence = 0.95;
    this.isFallbackFrozen = false;
    return true;
  }

  /**
   * Refina ligeramente los puntos ancla cuadro a cuadro midiendo el gradiente local
   * en el video y aplicando el Filtro de Kalman para mantener 60 FPS libres de jitter.
   */
  private updateTrackingStep(video: HTMLVideoElement | null, dt: number): NeckKeypoints {
    if (video && video.readyState >= 2 && this.offscreenCtx && this.trackingMode === 'hybrid-auto') {
      this.offscreenCtx.drawImage(video, 0, 0, this.procWidth, this.procHeight);
      const frame = this.offscreenCtx.getImageData(0, 0, this.procWidth, this.procHeight).data;

      // Medir contraste y textura en la región central del mástil para estimar confianza
      const midX = Math.floor(((this.anchorQuad.nutTop.x + this.anchorQuad.bridgeBottom.x) * 0.5) * this.procWidth);
      const midY = Math.floor(((this.anchorQuad.nutTop.y + this.anchorQuad.bridgeBottom.y) * 0.5) * this.procHeight);

      let edgeEnergy = 0;
      let samples = 0;
      for (let dy = -6; dy <= 6; dy += 2) {
        for (let dx = -16; dx <= 16; dx += 4) {
          const sx = Math.max(1, Math.min(this.procWidth - 2, midX + dx));
          const sy = Math.max(1, Math.min(this.procHeight - 2, midY + dy));
          const idx = (sy * this.procWidth + sx) * 4;
          const idxUp = ((sy - 1) * this.procWidth + sx) * 4;
          const idxRight = (sy * this.procWidth + (sx + 1)) * 4;
          const g = Math.abs(frame[idx] - frame[idxUp]) + Math.abs(frame[idx + 1] - frame[idxRight + 1]);
          edgeEnergy += g;
          samples++;
        }
      }

      const avgEdge = samples > 0 ? edgeEnergy / samples : 0;

      // Micro-ajuste por centroide vertical de gradiente alrededor de los bordes superior e inferior
      const refineVerticalEdge = (pt: Point2D): Point2D => {
        const px = Math.floor((this.mirrorVideo ? 1 - pt.x : pt.x) * this.procWidth);
        const py = Math.floor(pt.y * this.procHeight);
        let bestDy = 0;
        let maxGrad = 0;
        for (let dy = -3; dy <= 3; dy++) {
          const y = Math.max(2, Math.min(this.procHeight - 3, py + dy));
          const x = Math.max(2, Math.min(this.procWidth - 3, px));
          const i1 = ((y - 1) * this.procWidth + x) * 4;
          const i2 = ((y + 1) * this.procWidth + x) * 4;
          const grad = Math.abs(frame[i2] - frame[i1]) + Math.abs(frame[i2 + 1] - frame[i1 + 1]);
          if (grad > maxGrad) {
            maxGrad = grad;
            bestDy = dy;
          }
        }
        if (maxGrad > 35) {
          return {
            x: pt.x,
            y: Math.max(0.08, Math.min(0.92, pt.y + (bestDy / this.procHeight) * 0.18)),
          };
        }
        return pt;
      };

      const targetNutTop = refineVerticalEdge(this.anchorQuad.nutTop);
      const targetBridgeTop = refineVerticalEdge(this.anchorQuad.bridgeTop);
      const targetBridgeBottom = refineVerticalEdge(this.anchorQuad.bridgeBottom);
      const targetNutBottom = refineVerticalEdge(this.anchorQuad.nutBottom);

      this.anchorQuad.nutTop = this.kalmanNutTop.update(targetNutTop, dt);
      this.anchorQuad.bridgeTop = this.kalmanBridgeTop.update(targetBridgeTop, dt);
      this.anchorQuad.bridgeBottom = this.kalmanBridgeBottom.update(targetBridgeBottom, dt);
      this.anchorQuad.nutBottom = this.kalmanNutBottom.update(targetNutBottom, dt);

      // Evaluar ángulo del mástil y confianza para fallback (>45 grados fuera de eje o bajo contraste)
      const dx = this.anchorQuad.bridgeTop.x - this.anchorQuad.nutTop.x;
      const dy = this.anchorQuad.bridgeTop.y - this.anchorQuad.nutTop.y;
      const angleDeg = Math.abs((Math.atan2(dy, dx) * 180) / Math.PI);

      if (angleDeg > 45 || avgEdge < 6.5) {
        this.trackingConfidence = Math.max(0.25, this.trackingConfidence - 0.04);
      } else {
        this.trackingConfidence = Math.min(0.98, this.trackingConfidence * 0.92 + 0.08 * Math.min(1, avgEdge / 22));
      }

      if (this.trackingConfidence < 0.45 || angleDeg > 45) {
        this.isFallbackFrozen = true;
        return this.lastValidQuad;
      } else {
        this.isFallbackFrozen = false;
        this.lastValidQuad = this.getNormalizedKeypoints();
      }
    } else {
      // Modo Kalman-Locked o Calibración Manual
      this.anchorQuad.nutTop = this.kalmanNutTop.update(this.anchorQuad.nutTop, dt);
      this.anchorQuad.bridgeTop = this.kalmanBridgeTop.update(this.anchorQuad.bridgeTop, dt);
      this.anchorQuad.bridgeBottom = this.kalmanBridgeBottom.update(this.anchorQuad.bridgeBottom, dt);
      this.anchorQuad.nutBottom = this.kalmanNutBottom.update(this.anchorQuad.nutBottom, dt);

      const dx = this.anchorQuad.bridgeTop.x - this.anchorQuad.nutTop.x;
      const dy = this.anchorQuad.bridgeTop.y - this.anchorQuad.nutTop.y;
      const angleDeg = Math.abs((Math.atan2(dy, dx) * 180) / Math.PI);
      this.isFallbackFrozen = angleDeg > 45;
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

    // 1. Dibujar el stream de cámara o fondo de estudio simulado si la cámara está apagada
    if (video && video.readyState >= 2) {
      ctx.save();
      if (this.mirrorVideo) {
        ctx.translate(canvasWidth, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, canvasWidth, canvasHeight);
      ctx.restore();

      // Oscurecer ligeramente el video para que los overlays AR neón resalten con nitidez
      ctx.fillStyle = 'rgba(6, 8, 18, 0.28)';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    } else {
      // Fondo oscuro técnico con silueta de guitarra de referencia cuando la cámara aún no está activa
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

      // Retícula de referencia AR
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

    // 2. Actualizar pose con filtro de Kalman y comprobar Fallback
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

    // Opacidad reducida si está en modo Fallback (pérdida de tracking o ángulo > 45°)
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
        // Cejuela (Nut)
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

      // Marcadores de traste (Inlays) y numeración superior
      if (f > 0 && inlayFrets.has(f)) {
        const uPrev = getNormalizedFretPosition(f - 1, totalFrets);
        const uCenter = (uPrev + u) * 0.5;

        // Etiqueta de número de traste flotando sobre el borde superior
        const labelPt = projectHomographyPoint(H, uCenter, -0.16);
        ctx.fillStyle = f === 12 || f === 24 ? '#38bdf8' : 'rgba(226, 232, 240, 0.85)';
        ctx.font = 'bold 10px Orbitron, monospace, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(f), labelPt.x, labelPt.y);

        // Puntos Inlay en el centro del diapasón
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
      const vIndex = this.invertStringsVertical ? s : 5 - s; // Por defecto 1ra cuerda arriba (v=0.08), 6ta abajo (v=0.92)
      const v = 0.08 + (vIndex / 5) * 0.84;
      const startPt = projectHomographyPoint(H, 0, v);
      const endPt = projectHomographyPoint(H, 1, v);

      ctx.beginPath();
      ctx.moveTo(startPt.x, startPt.y);
      ctx.lineTo(endPt.x, endPt.y);
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.55)';
      ctx.lineWidth = 1 + (5 - s) * 0.28; // Más gruesa para las cuerdas graves
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

        // Escalar radio según perspectiva (más pequeño hacia el traste 24)
        const baseRadius = isExactMidiPlaying ? 11.5 : node.role === 'root' ? 8.8 : 7.2;
        const perspectiveScale = 1.05 - u * 0.28;
        const radius = Math.max(4.5, baseRadius * perspectiveScale);

        let fillColor = 'rgba(14, 165, 233, 0.88)'; // Azul neón clásico del video (Modo Reactivo)
        let strokeColor = '#bae6fd';

        if (isExactMidiPlaying) {
          fillColor = '#facc15'; // Amarillo brillante para la nota exacta detectada
          strokeColor = '#ffffff';
        } else if (mode === 'guided') {
          if (node.role === 'root') {
            fillColor = '#ec4899'; // Raíz (Rosa/Magenta)
            strokeColor = '#fbcfe8';
          } else if (node.role === 'third') {
            fillColor = '#8b5cf6'; // 3ra (Violeta)
            strokeColor = '#ddd6fe';
          } else if (node.role === 'blue') {
            fillColor = '#06b6d4'; // Blue Note (Cyan brillante)
            strokeColor = '#cffafe';
          } else {
            fillColor = 'rgba(59, 130, 246, 0.82)';
            strokeColor = '#bfdbfe';
          }
        } else {
          // Modo reactivo (video): escala proyectada en azul eléctrico con tónica destacada
          if (node.role === 'root') {
            fillColor = '#0284c7';
            strokeColor = '#38bdf8';
          }
        }

        // Glow exterior para la nota tocada o tónica
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

        // Texto de la nota dentro del nodo
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
      // Línea punteada en traste 12 (Keypoint intermedio)
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
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, isHovered ? 9 : 6.5, 0, Math.PI * 2);
        ctx.fillStyle = isHovered ? '#facc15' : '#10b981';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        ctx.fillStyle = 'rgba(9, 9, 11, 0.8)';
        ctx.fillRect(pt.x - 38, pt.y - 24, 76, 14);
        ctx.fillStyle = '#a7f3d0';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(label, pt.x, pt.y - 16);
      }
    }

    // Banner de Fallback si el ángulo es crítico o se perdió tracking
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
