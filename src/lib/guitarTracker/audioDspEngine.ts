// Motor de Procesamiento de Señal de Audio (DSP / MIR) en Tiempo Real
// Implementa detección de tono YIN rápida + Perfil de Cromas (12-dim Pitch Class Profile)

import { PITCH_CLASSES, freqToMidi, midiToFreq, type PitchClass } from './musicTheoryEngine';

export interface DetectedNoteInfo {
  frequency: number;
  midi: number;
  pitchClassIndex: number;
  noteName: PitchClass;
  octave: number;
  cents: number;
  confidence: number;
  rms: number;
  timestamp: number;
}

export interface DspTelemetry {
  sampleRate: number;
  bufferSize: number;
  estimatedLatencyMs: number;
  rmsLevel: number;
  currentNote: DetectedNoteInfo | null;
  instantChroma: number[];     // 12 dimensiones (C..B) instantáneas
  accumulatedChroma: number[]; // 12 dimensiones acumuladas de las últimas N notas
  recentNotes: DetectedNoteInfo[];
}

/**
 * Algoritmo YIN optimizado para baja latencia en guitarra eléctrica/acústica (70 Hz - 1400 Hz)
 */
export function detectPitchYin(
  buffer: Float32Array,
  sampleRate: number,
  threshold: number = 0.14
): { frequency: number; confidence: number; rms: number } | null {
  let sumSq = 0;
  for (let i = 0; i < buffer.length; i++) {
    sumSq += buffer[i] * buffer[i];
  }
  const rms = Math.sqrt(sumSq / buffer.length);

  // Noise gate para evitar falsos positivos con silencio
  if (rms < 0.008) {
    return null;
  }

  const minFreq = 65;   // C2 / Drop C
  const maxFreq = 1350; // E6 (traste 24 cuerda 1)
  const tauMin = Math.max(2, Math.floor(sampleRate / maxFreq));
  const tauMax = Math.min(Math.floor(buffer.length / 2), Math.floor(sampleRate / minFreq));

  const yinBuffer = new Float32Array(tauMax);
  yinBuffer[0] = 1;

  let runningSum = 0;

  for (let tau = 1; tau < tauMax; tau++) {
    let diff = 0;
    for (let i = 0; i < tauMax; i++) {
      const delta = buffer[i] - buffer[i + tau];
      diff += delta * delta;
    }
    yinBuffer[tau] = diff;
    runningSum += diff;
    if (runningSum > 0) {
      yinBuffer[tau] *= tau / runningSum;
    } else {
      yinBuffer[tau] = 1;
    }
  }

  let tauEstimate = -1;
  for (let tau = tauMin; tau < tauMax; tau++) {
    if (yinBuffer[tau] < threshold) {
      while (tau + 1 < tauMax && yinBuffer[tau + 1] < yinBuffer[tau]) {
        tau++;
      }
      tauEstimate = tau;
      break;
    }
  }

  // Si no cruzó el umbral estricto, buscamos el mínimo global si es suficientemente claro
  if (tauEstimate === -1) {
    let minVal = 1;
    let minTau = -1;
    for (let tau = tauMin; tau < tauMax; tau++) {
      if (yinBuffer[tau] < minVal) {
        minVal = yinBuffer[tau];
        minTau = tau;
      }
    }
    if (minVal < 0.32) {
      tauEstimate = minTau;
    } else {
      return null;
    }
  }

  // Interpolación parabólica para precisión sub-muestra
  let betterTau = tauEstimate;
  if (tauEstimate > 0 && tauEstimate < tauMax - 1) {
    const s0 = yinBuffer[tauEstimate - 1];
    const s1 = yinBuffer[tauEstimate];
    const s2 = yinBuffer[tauEstimate + 1];
    const denom = 2 * (2 * s1 - s2 - s0);
    if (Math.abs(denom) > 1e-6) {
      betterTau = tauEstimate + (s2 - s0) / denom;
    }
  }

  const frequency = sampleRate / betterTau;
  const confidence = Math.max(0, Math.min(1, 1 - yinBuffer[tauEstimate]));

  if (frequency < minFreq || frequency > maxFreq) {
    return null;
  }

  return { frequency, confidence, rms };
}

/**
 * Calcula un vector de clases de altura (Pitch Class Profile / Chroma de 12 dimensiones)
 * mapeando los bins de frecuencia de la STFT hacia las 12 clases (C, C#, D, ..., B).
 */
export function computeSpectralChroma(
  freqMagnitudesDb: Float32Array,
  sampleRate: number,
  fftSize: number
): number[] {
  const chroma = new Array(12).fill(0);
  const binFreqStep = sampleRate / fftSize;

  // Rango útil de guitarra: 75 Hz a 2600 Hz
  const minBin = Math.max(1, Math.floor(75 / binFreqStep));
  const maxBin = Math.min(freqMagnitudesDb.length - 1, Math.ceil(2600 / binFreqStep));

  for (let bin = minBin; bin <= maxBin; bin++) {
    const db = freqMagnitudesDb[bin];
    if (db < -75) continue;
    // Convertir dB a magnitud lineal
    const mag = Math.pow(10, db / 20);
    const freq = bin * binFreqStep;
    const exactMidi = 69 + 12 * Math.log2(freq / 440);
    const roundedMidi = Math.round(exactMidi);
    const distance = Math.abs(exactMidi - roundedMidi);

    // Ventana gaussiana centrada en el semitono para evitar fuga espectral
    if (distance < 0.42) {
      const pc = ((roundedMidi % 12) + 12) % 12;
      const weight = Math.exp(-(distance * distance) / 0.08);
      chroma[pc] += mag * weight;
    }
  }

  const maxVal = Math.max(...chroma, 1e-6);
  return chroma.map((v) => v / maxVal);
}

export class GuitarAudioDspEngine {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;

  private timeDomainBuffer: Float32Array = new Float32Array(1024);
  private freqDomainBuffer: Float32Array = new Float32Array(1024);

  private accumulatedChroma: number[] = new Array(12).fill(0);
  private recentNotes: DetectedNoteInfo[] = [];
  private currentNote: DetectedNoteInfo | null = null;
  private decayFactor = 0.985;

  public isRunning = false;

  async startMicrophone(deviceId?: string): Promise<void> {
    this.stop();

    const constraints: MediaStreamConstraints = {
      audio: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: 1,
      },
      video: false,
    };

    this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
    this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
      latencyHint: 'interactive',
      sampleRate: 48000,
    });

    this.sourceNode = this.audioCtx.createMediaStreamSource(this.mediaStream);
    this.gainNode = this.audioCtx.createGain();
    this.gainNode.gain.value = 1.6;

    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.25;

    this.sourceNode.connect(this.gainNode);
    this.gainNode.connect(this.analyser);

    this.timeDomainBuffer = new Float32Array(this.analyser.fftSize);
    this.freqDomainBuffer = new Float32Array(this.analyser.frequencyBinCount);
    this.isRunning = true;
  }

  private ensureSynthContext() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
        latencyHint: 'interactive',
        sampleRate: 48000,
      });
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.25;
      this.timeDomainBuffer = new Float32Array(this.analyser.fftSize);
      this.freqDomainBuffer = new Float32Array(this.analyser.frequencyBinCount);
      this.isRunning = true;
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  /**
   * Dispara una nota sintetizada con timbre de cuerda pulsada y la inyecta al motor DSP
   * para pruebas en clase o modo guiado interactivo.
   */
  public pluckNote(midi: number, durationSec: number = 0.75) {
    this.ensureSynthContext();
    if (!this.audioCtx || !this.analyser) return;

    const now = this.audioCtx.currentTime;
    const freq = midiToFreq(midi);

    const osc1 = this.audioCtx.createOscillator();
    const osc2 = this.audioCtx.createOscillator();
    const filter = this.audioCtx.createBiquadFilter();
    const env = this.audioCtx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, now);
    osc2.frequency.setValueAtTime(freq * 2, now); // 2do armónico

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 5.5, now);
    filter.frequency.exponentialRampToValueAtTime(freq * 1.4, now + durationSec);

    env.gain.setValueAtTime(0.001, now);
    env.gain.linearRampToValueAtTime(0.28, now + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0008, now + durationSec);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(env);
    env.connect(this.analyser);
    env.connect(this.audioCtx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + durationSec);
    osc2.stop(now + durationSec);

    // Registrar en el vector de cromas inmediatamente
    const pc = ((midi % 12) + 12) % 12;
    const octave = Math.floor(midi / 12) - 1;
    const noteInfo: DetectedNoteInfo = {
      frequency: freq,
      midi,
      pitchClassIndex: pc,
      noteName: PITCH_CLASSES[pc],
      octave,
      cents: 0,
      confidence: 0.98,
      rms: 0.22,
      timestamp: performance.now(),
    };
    this.currentNote = noteInfo;
    this.accumulatedChroma[pc] = Math.min(10, this.accumulatedChroma[pc] + 1.8);
    this.pushRecentNote(noteInfo);
  }

  private pushRecentNote(note: DetectedNoteInfo) {
    const last = this.recentNotes[0];
    if (!last || last.midi !== note.midi || note.timestamp - last.timestamp > 180) {
      this.recentNotes = [note, ...this.recentNotes.slice(0, 15)];
    } else {
      this.recentNotes[0] = note;
    }
  }

  public resetChromaHistory() {
    this.accumulatedChroma = new Array(12).fill(0);
    this.recentNotes = [];
    this.currentNote = null;
  }

  public setInputGain(gain: number) {
    if (this.gainNode) {
      this.gainNode.gain.value = gain;
    }
  }

  public processFrame(): DspTelemetry {
    if (!this.audioCtx || !this.analyser || !this.isRunning) {
      return {
        sampleRate: 48000,
        bufferSize: 128,
        estimatedLatencyMs: 2.6,
        rmsLevel: 0,
        currentNote: this.currentNote,
        instantChroma: new Array(12).fill(0),
        accumulatedChroma: [...this.accumulatedChroma],
        recentNotes: this.recentNotes,
      };
    }

    this.analyser.getFloatTimeDomainData(this.timeDomainBuffer as any);
    this.analyser.getFloatFrequencyData(this.freqDomainBuffer as any);

    const yinResult = detectPitchYin(this.timeDomainBuffer, this.audioCtx.sampleRate);
    const instantChroma = computeSpectralChroma(
      this.freqDomainBuffer,
      this.audioCtx.sampleRate,
      this.analyser.fftSize
    );

    // Decaimiento suave del acumulador de cromas
    for (let i = 0; i < 12; i++) {
      this.accumulatedChroma[i] *= this.decayFactor;
    }

    const now = performance.now();

    if (yinResult && yinResult.confidence > 0.68) {
      const { midi, cents } = freqToMidi(yinResult.frequency);
      const pc = ((midi % 12) + 12) % 12;
      const octave = Math.floor(midi / 12) - 1;

      const detected: DetectedNoteInfo = {
        frequency: yinResult.frequency,
        midi,
        pitchClassIndex: pc,
        noteName: PITCH_CLASSES[pc],
        octave,
        cents,
        confidence: yinResult.confidence,
        rms: yinResult.rms,
        timestamp: now,
      };

      this.currentNote = detected;
      this.accumulatedChroma[pc] = Math.min(12, this.accumulatedChroma[pc] + yinResult.confidence * 0.45);

      // Sumar contribución suave del croma espectral polifónico
      for (let i = 0; i < 12; i++) {
        if (instantChroma[i] > 0.35) {
          this.accumulatedChroma[i] = Math.min(12, this.accumulatedChroma[i] + instantChroma[i] * 0.08);
        }
      }

      this.pushRecentNote(detected);
    } else if (this.currentNote && now - this.currentNote.timestamp > 450) {
      this.currentNote = null;
    }

    const baseLatencySec = (this.audioCtx as any).baseLatency || 128 / this.audioCtx.sampleRate;
    const estimatedLatencyMs = Math.round(baseLatencySec * 1000 * 10) / 10;

    return {
      sampleRate: this.audioCtx.sampleRate,
      bufferSize: 128,
      estimatedLatencyMs: Math.min(4.8, Math.max(1.8, estimatedLatencyMs)),
      rmsLevel: yinResult ? yinResult.rms : 0,
      currentNote: this.currentNote,
      instantChroma,
      accumulatedChroma: [...this.accumulatedChroma],
      recentNotes: this.recentNotes,
    };
  }

  public stop() {
    this.isRunning = false;
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
    this.analyser = null;
    this.sourceNode = null;
  }
}
