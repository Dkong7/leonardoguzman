import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Camera,
  CameraOff,
  Mic,
  MicOff,
  Sparkles,
  GraduationCap,
  Cpu,
  Sliders,
  RefreshCw,
  Play,
  Square,
  Eye,
  FlipHorizontal,
  ArrowLeft,
  Download,
  PlugZap,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  Layers,
  Crosshair,
  Activity,
  SwitchCamera,
  Smartphone,
  Lock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import {
  PITCH_CLASSES,
  TUNINGS,
  SCALES,
  generateFretboardMatrix,
  identifyScaleFromChroma,
  getBoxFretRange,
  type FretNode,
  type ScaleCandidate,
} from '../lib/guitarTracker/musicTheoryEngine';
import {
  GuitarAudioDspEngine,
  type DspTelemetry,
} from '../lib/guitarTracker/audioDspEngine';
import {
  GuitarVisionArEngine,
  type NeckKeypoints,
  type VisionTelemetry,
} from '../lib/guitarTracker/visionArEngine';
import {
  GuitarVstBridge,
  VST_CPP_ARCHITECTURE_CODE,
  type VstBridgeStatus,
} from '../lib/guitarTracker/vstBridgeEngine';

const INLAY_FRETS = new Set([3, 5, 7, 9, 12, 15, 17, 19, 21, 24]);

// Re-renderizar este componente a 60 Hz roba al hilo principal el tiempo que necesita el flujo óptico.
const UI_TELEMETRY_INTERVAL_MS = 66;
const FRET_SPAN_WINDOW_MS = 1800;

const GuitarTracker: React.FC = () => {
  // --- Motores instanciados ---
  const dspEngineRef = useRef<GuitarAudioDspEngine | null>(null);
  const visionEngineRef = useRef<GuitarVisionArEngine | null>(null);
  const vstBridgeRef = useRef<GuitarVstBridge | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const demoIntervalRef = useRef<number | null>(null);
  const wakeLockRef = useRef<any>(null);

  // 1. Bloqueo de Pantalla (Screen Wake Lock API) para evitar que el celular se apague mientras tocas
  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        wakeLockRef.current.addEventListener('release', () => {
          console.log('Wake Lock liberado');
        });
      } catch (err: any) {
        console.error(`Error WakeLock: ${err.name}, ${err.message}`);
      }
    }
  };

  const releaseWakeLock = () => {
    if (wakeLockRef.current !== null) {
      wakeLockRef.current.release().then(() => {
        wakeLockRef.current = null;
      });
    }
  };

  // --- Estado de Dispositivos (Webcam / Cámara Móvil y Audio) ---
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoId, setSelectedVideoId] = useState<string>('');
  const [selectedAudioId, setSelectedAudioId] = useState<string>('');
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('user');

  const [cameraActive, setCameraActive] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isDemoPlaying, setIsDemoPlaying] = useState(false);

  // --- Configuración Musical y Modos ---
  const [activeTab, setActiveTab] = useState<'studio' | 'vst-architecture'>('studio');
  const [visualMode, setVisualMode] = useState<'reactive' | 'guided'>('reactive');
  const [tuningId, setTuningId] = useState<string>('standard');
  const [totalFrets, setTotalFrets] = useState<number>(24);
  const [compactMobileFrets, setCompactMobileFrets] = useState<boolean>(false);
  const [rootIndex, setRootIndex] = useState<number>(1); // C# por defecto como en el video
  const [scaleId, setScaleId] = useState<string>('minorPentatonic');
  const [boxFilter, setBoxFilter] = useState<number>(0); // 0 = Todo el mástil, 1..5 = Cajas pentatónicas
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);

  // --- Opciones de Visión AR ---
  const [showKeypointsHud, setShowKeypointsHud] = useState<boolean>(true);
  const [mirrorCamera, setMirrorCamera] = useState<boolean>(true);
  const [invertStrings, setInvertStrings] = useState<boolean>(false);
  const [draggingKeypoint, setDraggingKeypoint] = useState<keyof NeckKeypoints | null>(null);
  const [hoveredKeypoint, setHoveredKeypoint] = useState<keyof NeckKeypoints | null>(null);

  // --- Telemetría en Tiempo Real ---
  const [dspTelemetry, setDspTelemetry] = useState<DspTelemetry>({
    sampleRate: 48000,
    bufferSize: 128,
    estimatedLatencyMs: 2.6,
    rmsLevel: 0,
    currentNote: null,
    instantChroma: new Array(12).fill(0),
    accumulatedChroma: new Array(12).fill(0),
    recentNotes: [],
  });

  const [scaleCandidates, setScaleCandidates] = useState<ScaleCandidate[]>([]);
  const [visionTelemetry, setVisionTelemetry] = useState<VisionTelemetry>({
    fps: 60,
    confidence: 95,
    neckAngleDeg: -3.2,
    isFallbackFrozen: false,
    trackingMode: 'hybrid-auto',
    keypoints: {
      nutTop: { x: 0.14, y: 0.43 },
      bridgeTop: { x: 0.84, y: 0.38 },
      bridgeBottom: { x: 0.86, y: 0.56 },
      nutBottom: { x: 0.15, y: 0.56 },
    },
    homographyMatrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
  });

  const [vstStatus, setVstStatus] = useState<VstBridgeStatus>({
    wsConnected: false,
    wsEndpoint: 'ws://127.0.0.1:8989/guitartracker',
    midiConnected: false,
    midiDeviceName: 'Sin dispositivo MIDI',
    packetsTransferred: 0,
    lastSyncMs: 1.4,
  });

  // Estadísticas de Modo Profesor/Guiado
  const [guidedStats, setGuidedStats] = useState({ hits: 0, total: 0 });
  const lastCountedTimestampRef = useRef<number>(0);

  // Cursor temporal (barra amarilla vertical en el diagrama 2D)
  const [cursorFretPosition, setCursorFretPosition] = useState<number>(4);
  const cursorFretRef = useRef<number>(4);
  const lastUiUpdateRef = useRef<number>(0);

  useEffect(() => {
    cursorFretRef.current = cursorFretPosition;
  }, [cursorFretPosition]);

  // Dimensiones dinámicas del Canvas AR (Vertical en celular vertical, Horizontal en PC/ horizontal)
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768 && window.innerHeight > window.innerWidth) {
      return { width: 540, height: 680 };
    }
    return { width: 960, height: 540 };
  });

  // Detectar orientación de pantalla en celular y ajustar el canvas vertical u horizontalmente
  useEffect(() => {
    const updateLayoutForViewport = () => {
      const isPortraitMobile = window.innerWidth < 768 && window.innerHeight > window.innerWidth;
      setCompactMobileFrets(window.innerWidth < 768);

      const vid = videoRef.current;
      if (vid && vid.videoWidth > 0 && vid.videoHeight > 0) {
        const aspect = vid.videoWidth / vid.videoHeight;
        if (isPortraitMobile) {
          const w = 540;
          const h = Math.min(760, Math.max(580, Math.round(w / aspect)));
          setCanvasSize({ width: w, height: h });
        } else {
          setCanvasSize({ width: 960, height: 540 });
        }
      } else {
        setCanvasSize(isPortraitMobile ? { width: 540, height: 680 } : { width: 960, height: 540 });
      }
    };

    updateLayoutForViewport();
    window.addEventListener('resize', updateLayoutForViewport);
    window.addEventListener('orientationchange', updateLayoutForViewport);
    return () => {
      window.removeEventListener('resize', updateLayoutForViewport);
      window.removeEventListener('orientationchange', updateLayoutForViewport);
    };
  }, []);

  // Inicializar motores
  useEffect(() => {
    dspEngineRef.current = new GuitarAudioDspEngine();
    visionEngineRef.current = new GuitarVisionArEngine();
    visionEngineRef.current.showVisionDebug = true;
    visionEngineRef.current.mirrorVideo = true;

    vstBridgeRef.current = new GuitarVstBridge();
    vstBridgeRef.current.setOnExternalNote((midi) => {
      dspEngineRef.current?.pluckNote(midi, 0.65);
    });

    const loadDevices = async () => {
      try {
        if (navigator.mediaDevices?.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const vids = devices.filter((d) => d.kind === 'videoinput');
          const auds = devices.filter((d) => d.kind === 'audioinput');
          setVideoDevices(vids);
          setAudioDevices(auds);
        }
      } catch {
        // Ignorar si aún no hay permisos
      }
    };
    loadDevices();

    return () => {
      releaseWakeLock();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (demoIntervalRef.current) window.clearInterval(demoIntervalRef.current);
      dspEngineRef.current?.stop();
      vstBridgeRef.current?.disconnect();
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Re-solicitar Wake Lock si el usuario vuelve a la pestaña mientras la cámara está activa
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && cameraActive) {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [cameraActive]);

  // Matriz del diapasón calculada por el motor de teoría musical
  const fretMatrix: FretNode[][] = useMemo(() => {
    return generateFretboardMatrix(tuningId, totalFrets, rootIndex, scaleId, boxFilter);
  }, [tuningId, totalFrets, rootIndex, scaleId, boxFilter]);

  // Activar / Desactivar Cámara (Cámara Frontal por defecto: facingMode: 'user', 1280x720)
  const startCameraStream = async (facing: 'user' | 'environment' = 'user', customDeviceId?: string) => {
    setCameraError(null);
    if (videoRef.current && videoRef.current.srcObject) {
      const oldStream = videoRef.current.srcObject as MediaStream;
      oldStream.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }

    try {
      let stream: MediaStream;

      try {
        const videoConstraints: MediaTrackConstraints = customDeviceId
          ? { deviceId: { exact: customDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } };

        stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          const vw = videoRef.current?.videoWidth || 0;
          const vh = videoRef.current?.videoHeight || 0;
          if (vw > 0 && vh > 0) {
            if (vh > vw || (window.innerWidth < 768 && window.innerHeight > window.innerWidth)) {
              const w = 540;
              const h = Math.min(760, Math.max(580, Math.round(w * (vh / vw))));
              setCanvasSize({ width: w, height: h });
            } else {
              setCanvasSize({ width: 960, height: Math.round(960 * (vh / vw)) || 540 });
            }
          }
        };
        await videoRef.current.play();
        setCameraActive(true);
        await requestWakeLock();
        const shouldMirror = facing === 'user' && !customDeviceId;
        setMirrorCamera(shouldMirror);
        visionEngineRef.current?.startCalibration();
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      setVideoDevices(devices.filter((d) => d.kind === 'videoinput'));
      setAudioDevices(devices.filter((d) => d.kind === 'audioinput'));
    } catch (err: any) {
      setCameraError(
        err?.message || 'No se pudo acceder a la cámara. Verifica los permisos del navegador en tu celular.'
      );
      setCameraActive(false);
    }
  };

  const toggleCamera = async () => {
    if (cameraActive) {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }
      setCameraActive(false);
      releaseWakeLock();
      return;
    }
    await startCameraStream(cameraFacingMode, selectedVideoId || undefined);
  };

  const switchMobileCameraFacing = async () => {
    const nextFacing = cameraFacingMode === 'environment' ? 'user' : 'environment';
    setCameraFacingMode(nextFacing);
    setSelectedVideoId('');
    await startCameraStream(nextFacing);
  };

  // Activar / Desactivar Micrófono / Interfaz de Audio
  const toggleMicrophone = async (customDeviceId?: string) => {
    setAudioError(null);
    if (micActive && !customDeviceId) {
      dspEngineRef.current?.stop();
      setMicActive(false);
      return;
    }

    try {
      const targetDevice = customDeviceId ?? selectedAudioId;
      await dspEngineRef.current?.startMicrophone(targetDevice || undefined);
      setMicActive(true);

      const devices = await navigator.mediaDevices.enumerateDevices();
      setAudioDevices(devices.filter((d) => d.kind === 'audioinput'));
    } catch (err: any) {
      setAudioError(
        err?.message || 'No se pudo abrir el micrófono. Acepta el permiso de audio en tu navegador.'
      );
      setMicActive(false);
    }
  };

  // Demo Lick Automático
  const toggleDemoLick = () => {
    if (isDemoPlaying) {
      if (demoIntervalRef.current) {
        window.clearInterval(demoIntervalRef.current);
        demoIntervalRef.current = null;
      }
      setIsDemoPlaying(false);
      return;
    }

    setIsDemoPlaying(true);
    const maxDemoFret = compactMobileFrets ? 12 : Math.min(15, totalFrets);
    const scaleNodes: FretNode[] = [];
    for (let s = 0; s < 6; s++) {
      for (let f = 1; f <= maxDemoFret; f++) {
        const node = fretMatrix[s]?.[f];
        if (node && (boxFilter > 0 ? node.inBox : node.inScale) && f >= 2 && f <= maxDemoFret) {
          scaleNodes.push(node);
        }
      }
    }

    let step = 0;
    demoIntervalRef.current = window.setInterval(() => {
      if (scaleNodes.length === 0) return;
      const idx = step % scaleNodes.length;
      const chosen = scaleNodes[idx];
      dspEngineRef.current?.pluckNote(chosen.midi, 0.42);
      setCursorFretPosition(chosen.fret);
      step++;
    }, 280);
  };

  // Sincronizar opciones con el motor de visión
  useEffect(() => {
    if (visionEngineRef.current) {
      visionEngineRef.current.showVisionDebug = showKeypointsHud;
      visionEngineRef.current.mirrorVideo = mirrorCamera;
      visionEngineRef.current.invertStringsVertical = invertStrings;
    }
  }, [showKeypointsHud, mirrorCamera, invertStrings]);

  // Bucle principal de 60 FPS
  const renderLoop = useCallback(() => {
    const dsp = dspEngineRef.current;
    const vision = visionEngineRef.current;
    const canvas = canvasRef.current;
    const video = videoRef.current;

    const now = performance.now();
    const pushUi = now - lastUiUpdateRef.current >= UI_TELEMETRY_INTERVAL_MS;
    if (pushUi) lastUiUpdateRef.current = now;

    // processFrame() avanza YIN y el decaimiento del cromagrama: debe llamarse una sola vez por frame.
    const telemetry = dsp ? dsp.processFrame() : null;

    if (telemetry) {
      if (pushUi) {
        setDspTelemetry(telemetry);

        const candidates = identifyScaleFromChroma(telemetry.accumulatedChroma);
        setScaleCandidates(candidates);

        if (visualMode === 'reactive' && candidates.length > 0 && candidates[0].score > 0.52) {
          const top = candidates[0];
          setRootIndex(top.rootIndex);
          setScaleId(top.scaleId);
        }
      }

      if (telemetry.currentNote) {
        const activeMidi = telemetry.currentNote.midi;
        const cursorFret = cursorFretRef.current;
        let bestFret = cursorFret;
        let minDistance = 999;

        for (let s = 0; s < 6; s++) {
          for (let f = 0; f <= totalFrets; f++) {
            const node = fretMatrix[s]?.[f];
            if (node && node.midi === activeMidi) {
              const dist = Math.abs(f - cursorFret);
              if (dist < minDistance) {
                minDistance = dist;
                bestFret = f;
              }
            }
          }
        }
        cursorFretRef.current = cursorFret * 0.7 + bestFret * 0.3;
        if (pushUi) setCursorFretPosition(cursorFretRef.current);

        if (
          visualMode === 'guided' &&
          telemetry.currentNote.timestamp !== lastCountedTimestampRef.current
        ) {
          lastCountedTimestampRef.current = telemetry.currentNote.timestamp;
          const pc = telemetry.currentNote.pitchClassIndex;
          const semitone = (pc - rootIndex + 12) % 12;
          const inTargetScale = SCALES[scaleId]?.mask[semitone] === 1;
          setGuidedStats((prev) => ({
            hits: prev.hits + (inTargetScale ? 1 : 0),
            total: prev.total + 1,
          }));
        }

        vstBridgeRef.current?.broadcastState({
          root: PITCH_CLASSES[rootIndex],
          scaleId,
          activeMidi: telemetry.currentNote.midi,
          chroma: telemetry.accumulatedChroma,
        });
      }
    }

    if (vision && canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const vTelemetry = vision.renderArFrame(
          ctx,
          canvas.width,
          canvas.height,
          cameraActive ? video : null,
          fretMatrix,
          totalFrets,
          telemetry?.currentNote ?? null,
          visualMode,
          boxFilter,
          hoveredKeypoint || draggingKeypoint,
          scaleId,
          rootIndex,
        );
        if (pushUi) setVisionTelemetry(vTelemetry);
      }
    }

    if (pushUi && vstBridgeRef.current) {
      setVstStatus(vstBridgeRef.current.getStatus());
    }

    rafRef.current = requestAnimationFrame(renderLoop);
  }, [
    cameraActive,
    fretMatrix,
    totalFrets,
    visualMode,
    boxFilter,
    hoveredKeypoint,
    draggingKeypoint,
    rootIndex,
    scaleId,
  ]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(renderLoop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [renderLoop]);

  // --- Coordenadas normalizadas para Mouse y Touch (Celular) ---
  const getNormalizedCoordsFromClient = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
    };
  };

  const findClosestKeypoint = (pt: { x: number; y: number }, maxDist: number) => {
    const vision = visionEngineRef.current;
    if (!vision) return null;
    const kps = vision.getNormalizedKeypoints();
    const entries = Object.entries(kps) as [keyof NeckKeypoints, { x: number; y: number }][];
    let closestKey: keyof NeckKeypoints | null = null;
    let minDist = maxDist;

    for (const [key, kp] of entries) {
      const d = Math.hypot(pt.x - kp.x, pt.y - kp.y);
      if (d < minDist) {
        minDist = d;
        closestKey = key;
      }
    }
    return closestKey;
  };

  // Eventos Mouse (Desktop)
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pt = getNormalizedCoordsFromClient(e.clientX, e.clientY);
    const closest = findClosestKeypoint(pt, 0.055);
    if (closest) setDraggingKeypoint(closest);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const vision = visionEngineRef.current;
    if (!vision) return;
    const pt = getNormalizedCoordsFromClient(e.clientX, e.clientY);
    if (draggingKeypoint) {
      vision.setNormalizedKeypoint(draggingKeypoint, pt);
      return;
    }
    setHoveredKeypoint(findClosestKeypoint(pt, 0.045));
  };

  const handleCanvasMouseUp = () => {
    setDraggingKeypoint(null);
  };

  // Eventos Touch (Celular / Tablet)
  const handleCanvasTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    const pt = getNormalizedCoordsFromClient(touch.clientX, touch.clientY);
    // Radio amplio (0.10) para facilitar arrastrar los puntos verdes con el dedo en el celular
    const closest = findClosestKeypoint(pt, 0.1);
    if (closest) {
      setDraggingKeypoint(closest);
    }
  };

  const handleCanvasTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!draggingKeypoint || e.touches.length === 0) return;
    const touch = e.touches[0];
    const pt = getNormalizedCoordsFromClient(touch.clientX, touch.clientY);
    visionEngineRef.current?.setNormalizedKeypoint(draggingKeypoint, pt);
  };

  const handleCanvasTouchEnd = () => {
    setDraggingKeypoint(null);
  };

  // Descargar plantilla C++ / JUCE del VST3
  const handleDownloadVstTemplate = () => {
    const blob = new Blob([VST_CPP_ARCHITECTURE_CODE], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'GuitarTrackerVST3_LockFreeArchitecture.h';
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeBoxRange = useMemo(
    () => getBoxFretRange(rootIndex, boxFilter),
    [rootIndex, boxFilter]
  );

  const currentScaleObj = SCALES[scaleId] || SCALES.minorPentatonic;
  const currentRootName = PITCH_CLASSES[rootIndex];
  const displayedFretsCount = compactMobileFrets ? Math.min(12, totalFrets) : totalFrets;

  const fretHandSpan = useMemo(() => {
    const now = performance.now();
    const fresh = dspTelemetry.recentNotes.filter(
      (note) => now - note.timestamp <= FRET_SPAN_WINDOW_MS
    );
    if (fresh.length === 0) return null;
    let hint = cursorFretPosition;
    let minFret = Infinity;
    let maxFret = -Infinity;
    for (const note of [...fresh].reverse()) {
      let bestFret = -1;
      let bestDist = 999;
      for (let s = 0; s < 6; s++) {
        const row = fretMatrix[s];
        if (!row) continue;
        for (let f = 0; f <= displayedFretsCount; f++) {
          const node = row[f];
          if (!node || node.midi !== note.midi) continue;
          const dist = Math.abs(f - hint);
          if (dist < bestDist) {
            bestDist = dist;
            bestFret = f;
          }
        }
      }
      if (bestFret < 0) continue;
      hint = bestFret;
      if (bestFret < minFret) minFret = bestFret;
      if (bestFret > maxFret) maxFret = bestFret;
    }
    if (minFret === Infinity) return null;
    return { min: minFret, max: maxFret };
  }, [dspTelemetry, fretMatrix, displayedFretsCount, cursorFretPosition]);

  return (
    <div className="min-h-screen bg-[#070812] text-slate-100 font-sans flex flex-col selection:bg-cyan-500 selection:text-black overflow-x-hidden">
      {/* VIDEO STREAM OCULTO */}
      <video ref={videoRef} className="hidden" playsInline muted />

      {/* =====================================================================
          HEADER RESPONSIVE (OPTIMIZADO PARA CELULAR Y DESKTOP)
      ===================================================================== */}
      <header className="border-b border-slate-800/80 bg-[#0b0d1d]/95 backdrop-blur-xl px-3 sm:px-6 py-2.5 sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto flex flex-col gap-2.5">
          {/* Fila 1: Navegación + Título + Pestañas */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Link
                to="/"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700/70 text-slate-300 hover:text-white text-xs font-bold transition-all"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Inicio</span>
              </Link>
              <Link
                to="/clases"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-950/60 border border-purple-500/40 text-purple-200 text-xs font-bold transition-all"
              >
                <GraduationCap className="w-3.5 h-3.5 text-purple-400" />
                <span>Clases</span>
              </Link>

              <div className="flex items-center gap-2 ml-1">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shadow-md shadow-cyan-500/20 shrink-0">
                  <Crosshair className="w-3.5 h-3.5 text-white" />
                </div>
                <h1 className="text-xs sm:text-base font-black tracking-wider uppercase text-white truncate">
                  GUITAR<span className="text-cyan-400">TRACKER</span>
                </h1>
              </div>
            </div>

            {/* Selector Estudio vs VST3 */}
            <div className="flex items-center bg-slate-900/90 p-0.5 rounded-xl border border-slate-800 shrink-0">
              <button
                onClick={() => setActiveTab('studio')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all ${
                  activeTab === 'studio'
                    ? 'bg-cyan-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Estudio AR</span>
              </button>
              <button
                onClick={() => setActiveTab('vst-architecture')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all ${
                  activeTab === 'vst-architecture'
                    ? 'bg-purple-500 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>VST3</span>
              </button>
            </div>
          </div>

          {/* Fila 2: Botones Grandes de Acción Rápida (Ideales para tocar con el pulgar en Celular) */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
            {/* 1. Activar Cámara */}
            <button
              onClick={toggleCamera}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                cameraActive
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 border-cyan-300 shadow-md shadow-cyan-500/20'
              }`}
            >
              {cameraActive ? (
                <Camera className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <CameraOff className="w-4 h-4 shrink-0" />
              )}
              <span className="truncate">{cameraActive ? 'Cámara Activa' : '1. Activar Cámara'}</span>
            </button>

            {/* 2. Activar Audio / Guitarra */}
            <button
              onClick={() => toggleMicrophone()}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                micActive
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                  : 'bg-purple-600 hover:bg-purple-500 text-white border-purple-400 shadow-md shadow-purple-600/20'
              }`}
            >
              {micActive ? (
                <Mic className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <MicOff className="w-4 h-4 shrink-0" />
              )}
              <span className="truncate">{micActive ? 'Mic Activo' : '2. Activar Mic/Audio'}</span>
            </button>

            {/* 3. Rotar Cámara Frontal/Trasera (Especial Celular) */}
            <button
              onClick={switchMobileCameraFacing}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-cyan-300 transition-all"
              title="Cambiar entre Cámara Trasera y Frontal en el celular"
            >
              <SwitchCamera className="w-4 h-4 shrink-0" />
              <span className="truncate">
                {cameraFacingMode === 'environment' ? 'Cám. Trasera' : 'Cám. Frontal'}
              </span>
            </button>

            {/* 4. Botón Recalibrar Mástil (Inicia Calibración Vertical 1.5s o limpia parches) */}
            <button
              onClick={() => {
                if (cameraActive) {
                  visionEngineRef.current?.startCalibration();
                } else {
                  visionEngineRef.current?.resetDefaultNeckPose();
                }
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/60 text-amber-200 transition-all shadow-sm"
              title="Iniciar calibración vertical de 1.5s y limpiar parches de referencia"
            >
              <RefreshCw className="w-4 h-4 text-amber-300 shrink-0" />
              <span className="truncate">
                {visionTelemetry.engineState === 'calibrating_vertical'
                  ? `Calibrando (${visionTelemetry.calibrationFrames || 0}/45)`
                  : 'Recalibrar'}
              </span>
            </button>

            {/* 5. Simular Guitarra (Demo Lick) */}
            <button
              onClick={toggleDemoLick}
              className={`col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                isDemoPlaying
                  ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                  : 'bg-slate-800/90 hover:bg-slate-700 border-slate-700 text-slate-200'
              }`}
            >
              {isDemoPlaying ? (
                <Square className="w-3.5 h-3.5 fill-current shrink-0" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current shrink-0" />
              )}
              <span className="truncate">{isDemoPlaying ? 'Parar Demo' : 'Simular Notas'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Alertas de permisos si ocurrieron */}
      {(cameraError || audioError) && (
        <div className="max-w-[1600px] w-full mx-auto px-3 pt-2">
          <div className="bg-amber-500/15 border border-amber-500/40 rounded-xl px-3 py-2 flex items-center justify-between text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{cameraError || audioError}</span>
            </div>
            <button
              onClick={() => {
                setCameraError(null);
                setAudioError(null);
              }}
              className="text-amber-300 hover:text-white font-bold ml-3"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          VISTA 1: ESTUDIO EN VIVO (RESPONSIVE: AR -> FRETBOARD 2D -> CONTROLES)
      ===================================================================== */}
      {activeTab === 'studio' ? (
        <div className="flex-1 max-w-[1600px] w-full mx-auto p-2.5 sm:p-4 lg:px-6 flex flex-col gap-3 sm:gap-4">
          <div className="fixed right-0 top-20 z-[110] pointer-events-none">
            <div
              className={`pointer-events-auto flex items-start transition-transform duration-200 ${
                isSidePanelOpen ? 'translate-x-0' : 'translate-x-[calc(100%-36px)]'
              }`}
            >
              <button
                type="button"
                onClick={() => setIsSidePanelOpen((open) => !open)}
                className="mt-3 h-28 w-9 shrink-0 rounded-l-xl border border-r-0 border-yellow-400/80 bg-yellow-400 text-slate-950 shadow-[0_0_18px_rgba(250,204,21,0.45)] flex items-center justify-center"
                aria-expanded={isSidePanelOpen}
                aria-label={isSidePanelOpen ? 'Cerrar panel de tonalidad' : 'Abrir panel de tonalidad'}
              >
                {isSidePanelOpen ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronLeft className="w-4 h-4" />
                )}
              </button>
              <aside className="w-[min(19rem,calc(100vw-36px))] max-h-[calc(100dvh-6.5rem)] overflow-y-auto bg-[#0c0f20]/95 backdrop-blur-md border border-yellow-400/40 rounded-bl-2xl shadow-2xl p-3 flex flex-col gap-3">
                <h2 className="text-[11px] font-black uppercase tracking-wider text-yellow-300">
                  Tonalidad rápida
                </h2>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1.5">Tonalidad / Raíz</label>
                  <div className="grid grid-cols-6 gap-1">
                    {PITCH_CLASSES.map((pc, idx) => (
                      <button
                        key={`side-${pc}`}
                        type="button"
                        onClick={() => setRootIndex(idx)}
                        className={`py-1.5 rounded-md text-[11px] font-black border ${
                          rootIndex === idx
                            ? 'bg-cyan-500 text-slate-950 border-cyan-300'
                            : 'bg-slate-900 text-slate-300 border-slate-800'
                        }`}
                      >
                        {pc}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Escala / Modo</label>
                  <select
                    value={scaleId}
                    onChange={(e) => setScaleId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-xs text-white"
                  >
                    {Object.values(SCALES).map((sc) => (
                      <option key={sc.id} value={sc.id}>
                        {sc.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Caja / Posición</label>
                  <select
                    value={boxFilter}
                    onChange={(e) => setBoxFilter(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-xs text-white"
                  >
                    <option value={0}>Todo el Diapasón</option>
                    <option value={1}>Caja 1 (Tónica 6ta)</option>
                    <option value={2}>Caja 2</option>
                    <option value={3}>Caja 3</option>
                    <option value={4}>Caja 4</option>
                    <option value={5}>Caja 5</option>
                  </select>
                </div>
              </aside>
            </div>
          </div>
          {/* CONTENEDOR PRINCIPAL: En Desktop 12 columnas; en Celular apilado ergonómico */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 sm:gap-4 items-stretch">
            {/* 1. VIEWPORT AR DE CÁMARA Y HOMOGRAFÍA 3D */}
            <div className="xl:col-span-8 bg-[#0c0f20] border border-slate-800/90 rounded-2xl overflow-hidden flex flex-col shadow-2xl relative">
              {/* Sub-barra de telemetría y botones de visión */}
              <div className="px-3 py-2 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <span className="inline-flex items-center gap-1 font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                    {visionTelemetry.fps} FPS
                  </span>
                  <span className="font-mono text-slate-300">
                    Estado:{' '}
                    <strong className="text-emerald-400 uppercase">
                      {visionTelemetry.engineState || 'idle'}
                    </strong>
                  </span>
                  <span className="font-mono text-slate-300">
                    Pose: <strong className="text-emerald-400">{visionTelemetry.confidence}%</strong>
                  </span>
                  <span className="font-mono text-slate-300">
                    Ángulo: <strong className="text-sky-300">{visionTelemetry.neckAngleDeg}°</strong>
                  </span>
                  {visionTelemetry.engineState === 'tracking' && visionTelemetry.featuresA !== undefined && (
                    <span
                      className="font-mono text-slate-300"
                      title="Puntos Lucas-Kanade vivos alrededor de la cejuela (A) y del traste 12 (B)"
                    >
                      LK:{' '}
                      <strong className={visionTelemetry.isFallbackFrozen ? 'text-amber-300' : 'text-emerald-400'}>
                        {visionTelemetry.featuresA}/{visionTelemetry.featuresB}
                      </strong>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {cameraActive && (
                    <button
                      onClick={() => visionEngineRef.current?.lockTracking()}
                      className="px-2 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-cyan-200 font-bold flex items-center gap-1"
                      title="Coloca los pines sobre el mástil y fija el flujo óptico en la cejuela y el traste 12"
                    >
                      <Lock className="w-3 h-3" />
                      <span>Fijar Tracking</span>
                    </button>
                  )}
                  {cameraActive && (
                    <button
                      onClick={() => visionEngineRef.current?.startCalibration()}
                      className="px-2 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/50 text-emerald-300 font-bold flex items-center gap-1"
                    >
                      <Crosshair className="w-3 h-3" />
                      <span>Calibrar Vertical</span>
                    </button>
                  )}
                  <button
                    onClick={() => setShowKeypointsHud((v) => !v)}
                    className={`px-2 py-1 rounded-lg border font-semibold flex items-center gap-1 ${
                      showKeypointsHud
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    <Eye className="w-3 h-3" />
                    <span>Puntos 3D</span>
                  </button>
                  <button
                    onClick={() => setMirrorCamera((v) => !v)}
                    className={`px-2 py-1 rounded-lg border font-semibold flex items-center gap-1 ${
                      mirrorCamera
                        ? 'bg-purple-500/15 border-purple-500/40 text-purple-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    <FlipHorizontal className="w-3 h-3" />
                    <span className="hidden xs:inline">Espejo</span>
                  </button>
                  <button
                    onClick={() => visionEngineRef.current?.resetDefaultNeckPose()}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-200 font-bold flex items-center gap-1"
                    title="Limpiar parches basura y restaurar pose base del mástil"
                  >
                    <RefreshCw className="w-3 h-3 text-amber-300" />
                    <span>Reset Pose</span>
                  </button>
                </div>
              </div>

              {/* CANVAS DE REALIDAD AUMENTADA (Vertical en Celular Vertical, Horizontal en PC/Horizontal) */}
              <div className="relative flex-1 flex items-center justify-center bg-black select-none overflow-hidden">
                <canvas
                  ref={canvasRef}
                  width={canvasSize.width}
                  height={canvasSize.height}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseUp}
                  onTouchStart={handleCanvasTouchStart}
                  onTouchMove={handleCanvasTouchMove}
                  onTouchEnd={handleCanvasTouchEnd}
                  className={`w-full h-auto block touch-none ${
                    draggingKeypoint
                      ? 'cursor-grabbing'
                      : hoveredKeypoint
                      ? 'cursor-grab'
                      : 'cursor-crosshair'
                  }`}
                />

                {/* HUD Flotante Superior Izquierdo: Escala Activa */}
                <div className="absolute top-2 left-2 sm:top-3 sm:left-3 pointer-events-none">
                  <div className="bg-slate-950/85 backdrop-blur-md border border-cyan-500/40 rounded-xl px-2.5 py-1.5 sm:px-3.5 sm:py-2 shadow-lg">
                    <div className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 shrink-0" />
                      <span>
                        {visualMode === 'reactive' ? 'Modo Reactivo (Auto)' : 'Modo Profesor'}
                      </span>
                    </div>
                    <div className="text-sm sm:text-xl font-black text-white tracking-tight">
                      {currentRootName} {currentScaleObj.name}
                    </div>
                    <div className="text-[10px] text-slate-300 hidden sm:block">
                      {boxFilter === 0
                        ? `Mástil Completo (${totalFrets} trastes)`
                        : `Caja ${boxFilter} (Trastes ${activeBoxRange?.[0]}–${activeBoxRange?.[1]})`}
                    </div>
                  </div>
                </div>

                {/* HUD Flotante Superior Derecho: Afinador / Nota Detectada */}
                <div className="absolute top-2 right-2 sm:top-3 sm:right-3 pointer-events-none">
                  <div className="bg-slate-950/85 backdrop-blur-md border border-slate-700/80 rounded-xl px-2.5 py-1.5 sm:px-4 sm:py-2 text-right shadow-lg min-w-[115px] sm:min-w-[155px]">
                    <div className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-slate-400">
                      Nota Detectada
                    </div>
                    {dspTelemetry.currentNote ? (
                      <div>
                        <div className="flex items-baseline justify-end gap-1">
                          <span className="text-lg sm:text-2xl font-black text-yellow-400">
                            {dspTelemetry.currentNote.noteName}
                            <sub className="text-[10px] text-yellow-200">
                              {dspTelemetry.currentNote.octave}
                            </sub>
                          </span>
                          <span className="text-[10px] sm:text-xs font-mono text-emerald-400">
                            {dspTelemetry.currentNote.cents >= 0
                              ? `+${dspTelemetry.currentNote.cents}c`
                              : `${dspTelemetry.currentNote.cents}c`}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-300">
                          {dspTelemetry.currentNote.frequency.toFixed(1)} Hz
                        </div>
                      </div>
                    ) : (
                      <div className="py-0.5">
                        <div className="text-xs sm:text-sm font-bold text-slate-500">Escuchando...</div>
                        <div className="text-[9px] text-slate-500 hidden sm:block">
                          Toca una cuerda o pulsa un traste 2D
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Guía táctil e indicación de distancia óptica (70-90 cm) inferior en el canvas */}
                <div className="absolute bottom-1.5 inset-x-2 pointer-events-none flex justify-center">
                  <div className="bg-slate-950/85 border border-slate-800/90 px-2.5 py-1 rounded-lg text-[10px] text-slate-300 text-center">
                    💡 Sitúa la cámara a <strong className="text-cyan-300">70–90 cm</strong>, arrastra los <strong className="text-emerald-400">4 pines</strong> a la cejuela y al último traste y pulsa <strong className="text-cyan-300">Fijar Tracking</strong> (o <strong className="text-amber-300">Recalibrar</strong>)
                  </div>
                </div>
              </div>
            </div>

            {/* 2. BARRA RÁPIDA DE TEORÍA Y CONTROLES (En Celular queda compacta y accesible) */}
            <div className="xl:col-span-4 flex flex-col gap-3 sm:gap-4 order-3 xl:order-2">
              {/* Tarjeta A: Modo, Tónica, Escala y Caja */}
              <div className="bg-[#0c0f20] border border-slate-800/90 rounded-2xl p-3.5 sm:p-4 flex flex-col gap-3 shadow-xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-cyan-400" />
                    <span>Escala, Tónica y Modo</span>
                  </h2>
                  {visualMode === 'guided' && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      Aciertos: {guidedStats.total > 0 ? Math.round((guidedStats.hits / guidedStats.total) * 100) : 100}% ({guidedStats.hits}/{guidedStats.total})
                    </span>
                  )}
                </div>

                {/* Botones Modo Reactivo vs Modo Profesor */}
                <div className="grid grid-cols-2 gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setVisualMode('reactive')}
                    className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      visualMode === 'reactive'
                        ? 'bg-cyan-500 text-slate-950 shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span>Reactivo (Auto)</span>
                  </button>
                  <button
                    onClick={() => setVisualMode('guided')}
                    className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      visualMode === 'guided'
                        ? 'bg-purple-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                    <span>Modo Profesor</span>
                  </button>
                </div>

                {/* Selección de Tónica (12 notas grandes para pantalla táctil) */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                    Tonalidad / Raíz:
                  </label>
                  <div className="grid grid-cols-6 gap-1.5">
                    {PITCH_CLASSES.map((pc, idx) => (
                      <button
                        key={pc}
                        onClick={() => setRootIndex(idx)}
                        className={`py-2 rounded-lg text-xs font-black transition-all border ${
                          rootIndex === idx
                            ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow shadow-cyan-500/30'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                        }`}
                      >
                        {pc}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Escala y Caja Pentatónica */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Escala / Modo:
                    </label>
                    <select
                      value={scaleId}
                      onChange={(e) => setScaleId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white"
                    >
                      {Object.values(SCALES).map((sc) => (
                        <option key={sc.id} value={sc.id}>
                          {sc.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Caja / Posición:
                    </label>
                    <select
                      value={boxFilter}
                      onChange={(e) => setBoxFilter(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white"
                    >
                      <option value={0}>Todo el Diapasón</option>
                      <option value={1}>Caja 1 (Tónica 6ta)</option>
                      <option value={2}>Caja 2</option>
                      <option value={3}>Caja 3</option>
                      <option value={4}>Caja 4</option>
                      <option value={5}>Caja 5</option>
                    </select>
                  </div>
                </div>

                {/* Afinación y Trastes */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Afinación:
                    </label>
                    <select
                      value={tuningId}
                      onChange={(e) => setTuningId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-xs text-white"
                    >
                      {Object.values(TUNINGS).map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Nº Trastes:
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      {[21, 22, 24].map((num) => (
                        <button
                          key={num}
                          onClick={() => setTotalFrets(num)}
                          className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                            totalFrets === num
                              ? 'bg-purple-600 border-purple-400 text-white'
                              : 'bg-slate-900 border-slate-800 text-slate-400'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tarjeta B: Vector de Cromas de 12 Dimensiones e Identificador de Escala */}
              <div className="bg-[#0c0f20] border border-slate-800/90 rounded-2xl p-3.5 sm:p-4 flex flex-col gap-3 shadow-xl flex-1">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-purple-400" />
                    <span>Chroma Vector (12 Notas)</span>
                  </h2>
                  <button
                    onClick={() => {
                      dspEngineRef.current?.resetChromaHistory();
                      setGuidedStats({ hits: 0, total: 0 });
                    }}
                    className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Limpiar</span>
                  </button>
                </div>

                {/* Gráfico de Barras de las 12 Clases de Altura */}
                <div className="grid grid-cols-12 gap-1 items-end h-20 pt-2 px-1 bg-slate-950/80 rounded-xl border border-slate-800/80 p-2">
                  {PITCH_CLASSES.map((pc, idx) => {
                    const accum = dspTelemetry.accumulatedChroma[idx] || 0;
                    const maxChroma = Math.max(...dspTelemetry.accumulatedChroma, 1);
                    const heightPct = Math.round((accum / maxChroma) * 100);
                    const semitone = (idx - rootIndex + 12) % 12;
                    const inActiveScale = currentScaleObj.mask[semitone] === 1;

                    return (
                      <div key={pc} className="flex flex-col items-center gap-1 h-full justify-end">
                        <div className="w-full bg-slate-900 rounded-t h-12 flex items-end overflow-hidden">
                          <div
                            className={`w-full transition-all duration-150 rounded-t ${
                              idx === rootIndex
                                ? 'bg-pink-500'
                                : inActiveScale
                                ? 'bg-cyan-400'
                                : 'bg-amber-500/70'
                            }`}
                            style={{ height: `${Math.max(4, heightPct)}%` }}
                          />
                        </div>
                        <span
                          className={`text-[9px] sm:text-[10px] font-mono font-bold ${
                            idx === rootIndex
                              ? 'text-pink-400'
                              : inActiveScale
                              ? 'text-cyan-300'
                              : 'text-slate-500'
                          }`}
                        >
                          {pc}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Candidatos de Escala Detectados */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                    <span>Escala deducida por correlación:</span>
                  </div>
                  {scaleCandidates.length > 0 ? (
                    <div className="space-y-1">
                      {scaleCandidates.slice(0, 3).map((cand, i) => (
                        <button
                          key={`${cand.rootName}-${cand.scaleId}`}
                          onClick={() => {
                            setRootIndex(cand.rootIndex);
                            setScaleId(cand.scaleId);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs border transition-all ${
                            i === 0
                              ? 'bg-cyan-950/50 border-cyan-500/40 text-cyan-200'
                              : 'bg-slate-900/70 border-slate-800 text-slate-300'
                          }`}
                        >
                          <span className="font-bold">
                            #{i + 1} {cand.rootName} {cand.scaleName}
                          </span>
                          <span className="font-mono text-[11px] text-emerald-400">
                            {Math.round(cand.score * 100)}%
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500 bg-slate-900/50 rounded-lg p-2 border border-slate-800/60">
                      Toca varias notas o pulsa <strong>"Simular Notas"</strong> para ver cómo el motor deduce la escala automáticamente.
                    </div>
                  )}
                </div>

                {/* Selectores de Hardware (Cámara e Interfaz de Audio) */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 mb-1">
                      Cámara:
                    </label>
                    <select
                      value={selectedVideoId}
                      onChange={(e) => {
                        setSelectedVideoId(e.target.value);
                        if (cameraActive) startCameraStream(cameraFacingMode, e.target.value || undefined);
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-[11px] text-slate-200"
                    >
                      <option value="">Automática ({cameraFacingMode === 'environment' ? 'Trasera' : 'Frontal'})</option>
                      {videoDevices.map((d, i) => (
                        <option key={d.deviceId || i} value={d.deviceId}>
                          {d.label || `Cámara ${i + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 mb-1">
                      Entrada Audio:
                    </label>
                    <select
                      value={selectedAudioId}
                      onChange={(e) => {
                        setSelectedAudioId(e.target.value);
                        if (micActive) toggleMicrophone(e.target.value);
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-[11px] text-slate-200"
                    >
                      <option value="">Micrófono Predeterminado</option>
                      {audioDevices.map((d, i) => (
                        <option key={d.deviceId || i} value={d.deviceId}>
                          {d.label || `Audio ${i + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* =================================================================
                3. DIAGRAMA 2D SINCRONIZADO (En Celular aparece justo debajo de la cámara AR: order-2 xl:order-3)
            ================================================================= */}
            <div className="xl:col-span-12 order-2 xl:order-3 bg-[#0c0f20] border border-slate-800/90 rounded-2xl p-3 sm:p-4 shadow-2xl">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Diapasón 2D Interactivo (Toca cualquier traste para sonar)</span>
                  </h2>

                  {/* Botón Modo Compacto 12 Trastes (Ideal para pantalla vertical de Celular) */}
                  <button
                    onClick={() => setCompactMobileFrets((v) => !v)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border font-bold flex items-center gap-1 transition-all ${
                      compactMobileFrets
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                        : 'bg-slate-900 border-slate-700 text-slate-300'
                    }`}
                  >
                    <Smartphone className="w-3 h-3" />
                    <span>{compactMobileFrets ? 'Vista Móvil (12 Trastes)' : `Vista Completa (${totalFrets} Trastes)`}</span>
                  </button>

                  <button
                    onClick={() => setInvertStrings((v) => !v)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300"
                  >
                    {invertStrings ? '6ta Arriba (Tab)' : '1ra Arriba'}
                  </button>
                </div>

                {/* Leyenda de Colores */}
                <div className="flex flex-wrap items-center gap-2.5 text-[10px] sm:text-[11px]">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" />
                    <span className="text-slate-300">Activa</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-pink-500 inline-block" />
                    <span className="text-slate-300">Raíz (1)</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
                    <span className="text-slate-300">3ra</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
                    <span className="text-slate-300">Escala / Blue</span>
                  </span>
                </div>
              </div>

              {/* Contenedor con scroll táctil suave */}
              <div className="overflow-x-auto pb-1 -mx-1 px-1">
                <div
                  className={`${
                    compactMobileFrets ? 'min-w-[540px]' : 'min-w-[980px]'
                  } relative select-none bg-gradient-to-b from-[#171226] via-[#131020] to-[#171226] rounded-xl border border-slate-700/80 p-2.5 sm:p-3 pt-6 sm:pt-7`}
                >
                  {/* CURSOR DE POSICIÓN TEMPORAL (BARRA AMARILLA VERTICAL) */}
                  <div
                    className="absolute top-5 bottom-1.5 pointer-events-none transition-all duration-150 z-10 rounded-lg border-2 border-yellow-400/80 bg-yellow-400/10 shadow-[0_0_20px_rgba(250,204,21,0.2)]"
                    style={{
                      left: `calc(${(Math.min(displayedFretsCount, Math.max(0, cursorFretPosition)) / (displayedFretsCount + 1)) * 100}% + 6px)`,
                      width:
                        boxFilter > 0
                          ? `${(3.5 / (displayedFretsCount + 1)) * 100}%`
                          : `${(1.1 / (displayedFretsCount + 1)) * 100}%`,
                    }}
                  >
                    <div className="-top-4 left-1/2 -translate-x-1/2 absolute bg-yellow-400 text-slate-950 font-mono font-black text-[8px] sm:text-[9px] px-1.5 py-0.2 rounded whitespace-nowrap shadow">
                      TR {Math.round(cursorFretPosition)}
                    </div>
                  </div>

                  {/* Numeración de Trastes */}
                  <div
                    className="grid mb-1.5 text-center"
                    style={{
                      gridTemplateColumns: `repeat(${displayedFretsCount + 1}, minmax(0, 1fr))`,
                    }}
                  >
                    {Array.from({ length: displayedFretsCount + 1 }, (_, f) => (
                      <div
                        key={f}
                        className={`text-[10px] font-mono font-bold ${
                          f === 0
                            ? 'text-white'
                            : f === 12 || f === 24
                            ? 'text-cyan-400'
                            : INLAY_FRETS.has(f)
                            ? 'text-slate-300'
                            : 'text-slate-600'
                        }`}
                      >
                        {f === 0 ? '0' : f}
                      </div>
                    ))}
                  </div>

                  {/* Filas de las 6 cuerdas */}
                  <div className="flex flex-col gap-1.5 sm:gap-2 relative">
                    {fretHandSpan && (
                      <div
                        className="absolute z-[6] pointer-events-none rounded-md border-[3px] border-[#fbbf24] bg-yellow-400/30 shadow-[0_0_22px_rgba(251,191,36,0.8)]"
                        style={{
                          top: '8%',
                          height: '84%',
                          left: `${(fretHandSpan.min / (displayedFretsCount + 1)) * 100}%`,
                          width: `${((fretHandSpan.max - fretHandSpan.min + 1) / (displayedFretsCount + 1)) * 100}%`,
                        }}
                      />
                    )}
                    {(invertStrings ? [0, 1, 2, 3, 4, 5] : [5, 4, 3, 2, 1, 0]).map((sIdx) => {
                      const row = (fretMatrix[sIdx] || []).slice(0, displayedFretsCount + 1);
                      return (
                        <div
                          key={sIdx}
                          className="grid items-center relative h-8 sm:h-9"
                          style={{
                            gridTemplateColumns: `repeat(${displayedFretsCount + 1}, minmax(0, 1fr))`,
                          }}
                        >
                          {/* Cuerda física */}
                          <div
                            className="absolute left-0 right-0 bg-slate-400/50 pointer-events-none"
                            style={{ height: `${1 + (5 - sIdx) * 0.35}px` }}
                          />

                          {row.map((node) => {
                            const isPlayingExact =
                              dspTelemetry.currentNote !== null &&
                              dspTelemetry.currentNote.midi === node.midi;
                            const isPlayingPitchClass =
                              dspTelemetry.currentNote !== null &&
                              dspTelemetry.currentNote.pitchClassIndex === node.pitchClassIndex;

                            const showNode =
                              isPlayingExact ||
                              isPlayingPitchClass ||
                              (boxFilter > 0 ? node.inBox : node.inScale);

                            let badgeClass =
                              'bg-sky-500 border-sky-300 text-white shadow-[0_0_8px_rgba(14,165,233,0.4)]';
                            if (isPlayingExact) {
                              badgeClass =
                                'bg-yellow-300 border-yellow-50 text-slate-950 scale-150 shadow-[0_0_28px_#facc15,0_0_8px_#fff] z-20';
                            } else if (node.role === 'root') {
                              badgeClass =
                                'bg-pink-500 border-pink-200 text-white shadow-[0_0_10px_rgba(236,72,153,0.5)]';
                            } else if (node.role === 'third') {
                              badgeClass = 'bg-purple-500 border-purple-200 text-white';
                            } else if (node.role === 'blue') {
                              badgeClass = 'bg-cyan-400 border-white text-slate-950';
                            } else if (!node.inScale && isPlayingPitchClass) {
                              badgeClass = 'bg-amber-500 border-amber-200 text-slate-950';
                            }

                            return (
                              <button
                                key={node.fret}
                                onClick={() => {
                                  dspEngineRef.current?.pluckNote(node.midi, 0.75);
                                  setCursorFretPosition(node.fret);
                                }}
                                className={`h-full flex items-center justify-center relative group border-r transition-all duration-75 ${
                                  isPlayingExact
                                    ? 'bg-yellow-400 scale-110 shadow-[0_0_32px_#facc15] z-30 border-yellow-200'
                                    : node.fret === 0
                                    ? 'border-r-4 border-r-slate-200 bg-slate-900/60 active:scale-110'
                                    : 'border-r-slate-700/70 active:scale-110'
                                }`}
                              >
                                {showNode ? (
                                  <span
                                    className={`w-6 h-6 sm:w-6 sm:h-6 rounded-full text-[10px] font-black flex items-center justify-center border transition-transform ${badgeClass}`}
                                  >
                                    {visualMode === 'guided' &&
                                    node.intervalLabel &&
                                    !isPlayingExact
                                      ? node.intervalLabel
                                      : node.noteName}
                                  </span>
                                ) : (
                                  <span className="w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center opacity-20 sm:opacity-0 group-hover:opacity-100 bg-slate-800 text-slate-300">
                                    {node.noteName}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* =====================================================================
           VISTA 2: PUENTE VST3 EN TIEMPO REAL Y ARQUITECTURA DE 3 HILOS (60+ FPS)
        ===================================================================== */
        <div className="flex-1 max-w-[1600px] w-full mx-auto p-3 sm:p-6 flex flex-col gap-4 sm:gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="bg-[#0c0f20] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PlugZap className="w-5 h-5 text-purple-400" />
                    <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                      Enlace VST3 & DAW en Tiempo Real
                    </h2>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                      vstStatus.wsConnected || vstStatus.midiConnected
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}
                  >
                    {vstStatus.wsConnected || vstStatus.midiConnected ? 'CONECTADO' : 'WEB STANDALONE'}
                  </span>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white">Puerto WebMIDI (DAW / VST3)</div>
                    <div className="text-[11px] text-slate-400 font-mono truncate">
                      {vstStatus.midiDeviceName}
                    </div>
                  </div>
                  <button
                    onClick={() => vstBridgeRef.current?.connectWebMidi()}
                    className="px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shrink-0"
                  >
                    Vincular MIDI
                  </button>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Servidor WebSocket VST3</span>
                    <span className="text-[11px] font-mono text-cyan-400">
                      Paquetes: {vstStatus.packetsTransferred}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={vstStatus.wsEndpoint}
                      onChange={(e) =>
                        setVstStatus((prev) => ({ ...prev, wsEndpoint: e.target.value }))
                      }
                      className="flex-1 min-w-0 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200"
                    />
                    <button
                      onClick={() => vstBridgeRef.current?.connectWebSocket(vstStatus.wsEndpoint)}
                      className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold shrink-0"
                    >
                      Conectar
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-[#0c0f20] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-cyan-400">
                  Arquitectura Concurrente de 3 Hilos (60+ FPS / &lt; 5ms)
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                    <div className="flex items-center justify-between font-bold text-emerald-400">
                      <span>Hilo 1 (Audio DSP Lock-Free)</span>
                      <span className="font-mono">{dspTelemetry.estimatedLatencyMs} ms</span>
                    </div>
                    <p className="text-slate-400 text-[11px] mt-1">
                      YIN/pYIN + CQT alimentando el búfer atómico de 12 cromas sin bloqueos.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                    <div className="flex items-center justify-between font-bold text-cyan-400">
                      <span>Hilo 2 (Cámara & Homografía)</span>
                      <span className="font-mono">{visionTelemetry.fps} FPS</span>
                    </div>
                    <p className="text-slate-400 text-[11px] mt-1">
                      Detección de Cejuela, Traste 12 y Traste 24 + Filtro de Kalman 2D.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                    <div className="flex items-center justify-between font-bold text-purple-400">
                      <span>Hilo 3 (Render AR & Diagrama 2D)</span>
                      <span className="font-mono">60+ Hz</span>
                    </div>
                    <p className="text-slate-400 text-[11px] mt-1">
                      Interpola la homografía 3×3 y sincroniza el cursor temporal amarillo.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 bg-[#0c0f20] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div>
                  <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Código Base C++20 / JUCE + OpenCV (VST3 Nativo)</span>
                  </h2>
                </div>
                <button
                  onClick={handleDownloadVstTemplate}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar Header C++ (.h)</span>
                </button>
              </div>

              <pre className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 sm:p-4 text-[10px] sm:text-[11px] font-mono text-cyan-200 overflow-x-auto leading-relaxed">
                <code>{VST_CPP_ARCHITECTURE_CODE}</code>
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuitarTracker;
