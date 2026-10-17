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

const GuitarTracker: React.FC = () => {
  // --- Motores instanciados ---
  const dspEngineRef = useRef<GuitarAudioDspEngine | null>(null);
  const visionEngineRef = useRef<GuitarVisionArEngine | null>(null);
  const vstBridgeRef = useRef<GuitarVstBridge | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const demoIntervalRef = useRef<number | null>(null);

  // --- Estado de Dispositivos (Webcam y Audio) ---
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoId, setSelectedVideoId] = useState<string>('');
  const [selectedAudioId, setSelectedAudioId] = useState<string>('');

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
  const [rootIndex, setRootIndex] = useState<number>(1); // C# por defecto como en el ejemplo del video
  const [scaleId, setScaleId] = useState<string>('minorPentatonic');
  const [boxFilter, setBoxFilter] = useState<number>(0); // 0 = Todo el mástil, 1..5 = Cajas pentatónicas

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

  // Inicializar motores
  useEffect(() => {
    dspEngineRef.current = new GuitarAudioDspEngine();
    visionEngineRef.current = new GuitarVisionArEngine();
    visionEngineRef.current.showVisionDebug = true;

    vstBridgeRef.current = new GuitarVstBridge();
    vstBridgeRef.current.setOnExternalNote((midi) => {
      dspEngineRef.current?.pluckNote(midi, 0.65);
    });

    // Enumerar cámaras y micrófonos disponibles
    const loadDevices = async () => {
      try {
        if (navigator.mediaDevices?.enumerateDevices) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const vids = devices.filter((d) => d.kind === 'videoinput');
          const auds = devices.filter((d) => d.kind === 'audioinput');
          setVideoDevices(vids);
          setAudioDevices(auds);
          if (vids[0] && !selectedVideoId) setSelectedVideoId(vids[0].deviceId);
          if (auds[0] && !selectedAudioId) setSelectedAudioId(auds[0].deviceId);
        }
      } catch {
        // Ignorar si aún no hay permisos
      }
    };
    loadDevices();

    return () => {
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

  // Matriz del diapasón calculada por el motor de teoría musical
  const fretMatrix: FretNode[][] = useMemo(() => {
    return generateFretboardMatrix(tuningId, totalFrets, rootIndex, scaleId, boxFilter);
  }, [tuningId, totalFrets, rootIndex, scaleId, boxFilter]);

  // Activar / Desactivar Webcam
  const toggleCamera = async (customDeviceId?: string) => {
    setCameraError(null);
    if (cameraActive && !customDeviceId) {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }
      setCameraActive(false);
      return;
    }

    try {
      const targetDevice = customDeviceId ?? selectedVideoId;
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: targetDevice ? { ideal: targetDevice } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 60 },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
      }

      // Actualizar nombres de dispositivos tras conceder permiso
      const devices = await navigator.mediaDevices.enumerateDevices();
      setVideoDevices(devices.filter((d) => d.kind === 'videoinput'));
      setAudioDevices(devices.filter((d) => d.kind === 'audioinput'));
    } catch (err: any) {
      setCameraError(
        err?.message || 'No se pudo acceder a la webcam. Verifica los permisos del navegador.'
      );
      setCameraActive(false);
    }
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
        err?.message || 'No se pudo abrir la entrada de audio. Verifica tu micrófono o interfaz USB.'
      );
      setMicActive(false);
    }
  };

  // Demo Lick Automático (Toca un fraseo real para demostrar la detección reactiva de escala y el cursor 2D/AR)
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
    // Fraseo en la escala actual (ej. C# Pentatónica Menor en Caja 1 / Trastes 9-12)
    const scaleNodes: FretNode[] = [];
    for (let s = 0; s < 6; s++) {
      for (let f = 1; f <= Math.min(15, totalFrets); f++) {
        const node = fretMatrix[s]?.[f];
        if (node && (boxFilter > 0 ? node.inBox : node.inScale) && f >= 4 && f <= 14) {
          scaleNodes.push(node);
        }
      }
    }

    let step = 0;
    demoIntervalRef.current = window.setInterval(() => {
      if (scaleNodes.length === 0) return;
      // Patrón ascendente/descendente musical
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

  // Bucle principal de 60 FPS (Coordina Hilo Audio DSP + Hilo Visión Homografía + Render UI)
  const renderLoop = useCallback(() => {
    const dsp = dspEngineRef.current;
    const vision = visionEngineRef.current;
    const canvas = canvasRef.current;
    const video = videoRef.current;

    if (dsp) {
      const telemetry = dsp.processFrame();
      setDspTelemetry(telemetry);

      // Correlación de escala contra máscaras binarias (Pitch Class Profile de 12 dimensiones)
      const candidates = identifyScaleFromChroma(telemetry.accumulatedChroma);
      setScaleCandidates(candidates);

      // En Modo Reactivo (video), si la correlación supera el umbral, actualiza la escala proyectada
      if (visualMode === 'reactive' && candidates.length > 0 && candidates[0].score > 0.52) {
        const top = candidates[0];
        setRootIndex(top.rootIndex);
        setScaleId(top.scaleId);
      }

      // Actualizar el cursor de posición temporal (barra amarilla vertical) cuando se detecta una nota
      if (telemetry.currentNote) {
        const activeMidi = telemetry.currentNote.midi;
        let bestFret = cursorFretPosition;
        let minDistance = 999;

        for (let s = 0; s < 6; s++) {
          for (let f = 0; f <= totalFrets; f++) {
            const node = fretMatrix[s]?.[f];
            if (node && node.midi === activeMidi) {
              const dist = Math.abs(f - cursorFretPosition);
              if (dist < minDistance) {
                minDistance = dist;
                bestFret = f;
              }
            }
          }
        }
        setCursorFretPosition((prev) => prev * 0.7 + bestFret * 0.3);

        // Contabilizar aciertos en Modo Profesor / Guiado
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

        // Enviar telemetría al puente VST3 si está activo
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
          dsp?.processFrame().currentNote || null,
          visualMode,
          boxFilter,
          hoveredKeypoint
        );
        setVisionTelemetry(vTelemetry);
      }
    }

    if (vstBridgeRef.current) {
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
    cursorFretPosition,
    rootIndex,
    scaleId,
  ]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(renderLoop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [renderLoop]);

  // Interacción con el Canvas AR para calibrar/arrastrar los 4 puntos ancla del mástil
  const getCanvasNormalizedCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const vision = visionEngineRef.current;
    if (!vision) return;
    const pt = getCanvasNormalizedCoords(e);
    const kps = vision.getNormalizedKeypoints();

    const entries = Object.entries(kps) as [keyof NeckKeypoints, { x: number; y: number }][];
    let closestKey: keyof NeckKeypoints | null = null;
    let minDist = 0.045;

    for (const [key, kp] of entries) {
      const d = Math.hypot(pt.x - kp.x, pt.y - kp.y);
      if (d < minDist) {
        minDist = d;
        closestKey = key;
      }
    }

    if (closestKey) {
      setDraggingKeypoint(closestKey);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const vision = visionEngineRef.current;
    if (!vision) return;
    const pt = getCanvasNormalizedCoords(e);

    if (draggingKeypoint) {
      vision.setNormalizedKeypoint(draggingKeypoint, pt);
      return;
    }

    const kps = vision.getNormalizedKeypoints();
    const entries = Object.entries(kps) as [keyof NeckKeypoints, { x: number; y: number }][];
    let found: keyof NeckKeypoints | null = null;
    for (const [key, kp] of entries) {
      if (Math.hypot(pt.x - kp.x, pt.y - kp.y) < 0.04) {
        found = key;
        break;
      }
    }
    setHoveredKeypoint(found);
  };

  const handleCanvasMouseUp = () => {
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

  return (
    <div className="min-h-screen bg-[#070812] text-slate-100 font-sans flex flex-col selection:bg-cyan-500 selection:text-black">
      {/* ELEMENTO DE VIDEO OCULTO QUE ALIMENTA EL MOTOR DE VISIÓN A 60 FPS */}
      <video ref={videoRef} className="hidden" playsInline muted />

      {/* =====================================================================
          BARRA SUPERIOR DE ESTUDIO (ACCESO RÁPIDO WEBCAM / AUDIO / CLASES / VST)
      ===================================================================== */}
      <header className="border-b border-slate-800/80 bg-[#0b0d1d]/95 backdrop-blur-xl px-4 lg:px-6 py-3 sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Izquierda: Navegación + Título */}
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/70 text-slate-300 hover:text-white hover:border-purple-500/60 text-xs font-bold transition-all"
              title="Volver al Inicio"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Inicio</span>
            </Link>
            <Link
              to="/clases"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-950/50 border border-purple-500/40 text-purple-200 hover:bg-purple-900/60 text-xs font-bold transition-all"
            >
              <GraduationCap className="w-3.5 h-3.5 text-purple-400" />
              <span>Dojo / Clases</span>
            </Link>

            <div className="h-5 w-[1px] bg-slate-800 mx-1 hidden sm:block" />

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <Crosshair className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm md:text-base font-black tracking-wider uppercase text-white">
                    GUITAR<span className="text-cyan-400">TRACKER</span>{' '}
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                      AR + DSP + VST3
                    </span>
                  </h1>
                </div>
                <p className="text-[11px] text-slate-400 hidden md:block">
                  Herramienta de apoyo en tiempo real para clases • Tracking Homográfico 3D & Pitch Class Profile
                </p>
              </div>
            </div>
          </div>

          {/* Centro: Controles Directos de Webcam, Micrófono y Demo */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Botón Webcam */}
            <button
              onClick={() => toggleCamera()}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                cameraActive
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 shadow-lg shadow-emerald-500/10'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 border-cyan-300 shadow-lg shadow-cyan-500/20'
              }`}
            >
              {cameraActive ? <Camera className="w-4 h-4 text-emerald-400" /> : <CameraOff className="w-4 h-4" />}
              <span>{cameraActive ? 'Webcam AR Activa' : 'Activar Webcam'}</span>
            </button>

            {/* Botón Audio / Interfaz */}
            <button
              onClick={() => toggleMicrophone()}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                micActive
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 shadow-lg shadow-emerald-500/10'
                  : 'bg-purple-600 hover:bg-purple-500 text-white border-purple-400 shadow-lg shadow-purple-600/20'
              }`}
            >
              {micActive ? <Mic className="w-4 h-4 text-emerald-400" /> : <MicOff className="w-4 h-4" />}
              <span>{micActive ? 'DSP Audio Activo' : 'Activar Audio / Guitarra'}</span>
            </button>

            {/* Botón Demo Lick para probar sin guitarra conectada */}
            <button
              onClick={toggleDemoLick}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                isDemoPlaying
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                  : 'bg-slate-800/90 hover:bg-slate-700 border-slate-700 text-slate-200'
              }`}
              title="Reproduce notas de guitarra sintetizadas para probar el detector de escalas y el mástil AR"
            >
              {isDemoPlaying ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isDemoPlaying ? 'Detener Demo' : 'Simular Guitarra'}</span>
            </button>
          </div>

          {/* Derecha: Selector de Vista (Estudio en Vivo vs Puente VST3 & Arquitectura) */}
          <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('studio')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'studio'
                  ? 'bg-cyan-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Estudio AR + 2D</span>
            </button>
            <button
              onClick={() => setActiveTab('vst-architecture')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'vst-architecture'
                  ? 'bg-purple-500 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>VST3 & Arquitectura</span>
            </button>
          </div>
        </div>
      </header>

      {/* Alertas de permisos de cámara o micrófono si ocurrieron */}
      {(cameraError || audioError) && (
        <div className="max-w-[1600px] w-full mx-auto px-4 pt-3">
          <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{cameraError || audioError}</span>
            </div>
            <button
              onClick={() => {
                setCameraError(null);
                setAudioError(null);
              }}
              className="text-amber-300 hover:text-white font-bold ml-4"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          VISTA 1: ESTUDIO EN VIVO (VISIÓN AR + DSP + FRETBOARD 2D SINCRONIZADO)
      ===================================================================== */}
      {activeTab === 'studio' ? (
        <div className="flex-1 max-w-[1600px] w-full mx-auto p-4 lg:px-6 flex flex-col gap-4">
          {/* FILA SUPERIOR: VIEWPORT AR (IZQUIERDA) + PANEL DE CONTROL Y CROMAS (DERECHA) */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
            {/* 1. VIEWPORT DE VISIÓN POR COMPUTADOR Y SEGUIMIENTO DEL DIAPASÓN (AR) */}
            <div className="xl:col-span-8 bg-[#0c0f20] border border-slate-800/90 rounded-2xl overflow-hidden flex flex-col shadow-2xl relative">
              {/* Sub-barra de estado AR y Telemetría de Hilos */}
              <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-2.5 py-0.5 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                    {visionTelemetry.fps} FPS AR
                  </span>
                  <span className="font-mono text-[11px] text-slate-300">
                    Confianza Pose: <strong className="text-emerald-400">{visionTelemetry.confidence}%</strong>
                  </span>
                  <span className="font-mono text-[11px] text-slate-300">
                    Ángulo Mástil: <strong className="text-sky-300">{visionTelemetry.neckAngleDeg}°</strong>
                  </span>
                  <span className="font-mono text-[11px] text-slate-300 hidden sm:inline">
                    Latencia DSP: <strong className="text-purple-300">{dspTelemetry.estimatedLatencyMs} ms</strong>
                  </span>
                </div>

                {/* Controles rápidos de Visión en el Viewport */}
                <div className="flex items-center gap-1.5">
                  {cameraActive && (
                    <button
                      onClick={() => visionEngineRef.current?.autoScanNeckFromVideo(videoRef.current!)}
                      className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-[11px] font-semibold flex items-center gap-1 transition-all"
                      title="Detecta bordes paralelos del mástil (Canny/Sobel + Hough)"
                    >
                      <Crosshair className="w-3 h-3" />
                      <span>Auto-Detectar Mástil</span>
                    </button>
                  )}
                  <button
                    onClick={() => setShowKeypointsHud((v) => !v)}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1 transition-all ${
                      showKeypointsHud
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                    title="Mostrar/Ocultar puntos ancla (Cejuela, Traste 12, Traste 24)"
                  >
                    <Eye className="w-3 h-3" />
                    <span>Keypoints</span>
                  </button>
                  <button
                    onClick={() => setMirrorCamera((v) => !v)}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1 transition-all ${
                      mirrorCamera
                        ? 'bg-purple-500/15 border-purple-500/40 text-purple-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                    title="Espejar imagen de la webcam"
                  >
                    <FlipHorizontal className="w-3 h-3" />
                    <span>Espejo</span>
                  </button>
                  <button
                    onClick={() => visionEngineRef.current?.resetDefaultNeckPose()}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[11px] font-semibold flex items-center gap-1 transition-all"
                    title="Restaurar pose homográfica inicial"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Reset Pose</span>
                  </button>
                </div>
              </div>

              {/* CANVAS DE REALIDAD AUMENTADA Y HOMOGRAFÍA */}
              <div className="relative flex-1 min-h-[340px] sm:min-h-[420px] flex items-center justify-center bg-black select-none">
                <canvas
                  ref={canvasRef}
                  width={960}
                  height={480}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseUp}
                  className={`w-full h-full object-contain ${
                    draggingKeypoint
                      ? 'cursor-grabbing'
                      : hoveredKeypoint
                      ? 'cursor-grab'
                      : 'cursor-crosshair'
                  }`}
                />

                {/* HUD Flotante Superior Izquierdo: Escala Proyectada y Modo */}
                <div className="absolute top-3 left-3 pointer-events-none flex flex-col gap-1.5">
                  <div className="bg-slate-950/85 backdrop-blur-md border border-cyan-500/40 rounded-xl px-3.5 py-2 shadow-lg">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" />
                      <span>
                        {visualMode === 'reactive'
                          ? 'Modo Reactivo (Auto-Escala por Audio)'
                          : 'Modo Profesor / Guiado'}
                      </span>
                    </div>
                    <div className="text-lg sm:text-xl font-black text-white tracking-tight mt-0.5">
                      {currentRootName} {currentScaleObj.name}
                    </div>
                    <div className="text-[11px] text-slate-300 flex items-center gap-2 mt-0.5">
                      <span>Afinación: {TUNINGS[tuningId]?.name}</span>
                      <span>•</span>
                      <span>
                        {boxFilter === 0
                          ? `Mástil Completo (${totalFrets} trastes)`
                          : `Caja Posición ${boxFilter} (Trastes ${activeBoxRange?.[0]} a ${activeBoxRange?.[1]})`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* HUD Flotante Superior Derecho: Nota Detectada en Tiempo Real */}
                <div className="absolute top-3 right-3 pointer-events-none">
                  <div className="bg-slate-950/85 backdrop-blur-md border border-slate-700/80 rounded-xl px-4 py-2 text-right shadow-lg min-w-[155px]">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                      Detector YIN / CQT
                    </div>
                    {dspTelemetry.currentNote ? (
                      <div>
                        <div className="flex items-baseline justify-end gap-1.5">
                          <span className="text-2xl font-black text-yellow-400">
                            {dspTelemetry.currentNote.noteName}
                            <sub className="text-xs text-yellow-200">{dspTelemetry.currentNote.octave}</sub>
                          </span>
                          <span className="text-xs font-mono text-emerald-400">
                            {dspTelemetry.currentNote.cents >= 0
                              ? `+${dspTelemetry.currentNote.cents}c`
                              : `${dspTelemetry.currentNote.cents}c`}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-300">
                          {dspTelemetry.currentNote.frequency.toFixed(1)} Hz • Conf{' '}
                          {Math.round(dspTelemetry.currentNote.confidence * 100)}%
                        </div>
                      </div>
                    ) : (
                      <div className="py-1">
                        <div className="text-sm font-bold text-slate-500">Esperando nota...</div>
                        <div className="text-[10px] text-slate-500">Toca tu guitarra o haz clic en un traste</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Instrucción rápida de calibración en la esquina inferior derecha del canvas */}
                <div className="absolute bottom-2.5 right-3 pointer-events-none hidden sm:flex items-center gap-2 bg-slate-950/80 border border-slate-800 px-3 py-1 rounded-lg text-[11px] text-slate-300">
                  <span>
                    Arrastra los <strong className="text-emerald-400">4 puntos verdes</strong> sobre las esquinas de tu diapasón para calibrar la homografía 3D
                  </span>
                </div>
              </div>
            </div>

            {/* 2. PANEL LATERAL DERECHO: MODOS DE CLASE, VECTOR CHROMA 12D Y HARDWARE */}
            <div className="xl:col-span-4 flex flex-col gap-4">
              {/* Tarjeta A: Selector de Modo (Reactivo vs Profesor/Guiado) y Escala */}
              <div className="bg-[#0c0f20] border border-slate-800/90 rounded-2xl p-4 flex flex-col gap-3.5 shadow-xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-cyan-400" />
                    <span>Motor de Teoría Musical y Modos</span>
                  </h2>
                  {visualMode === 'guided' && (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      Precisión: {guidedStats.total > 0 ? Math.round((guidedStats.hits / guidedStats.total) * 100) : 100}% ({guidedStats.hits}/{guidedStats.total})
                    </span>
                  )}
                </div>

                {/* Botones Modo Reactivo vs Modo Profesor */}
                <div className="grid grid-cols-2 gap-2 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setVisualMode('reactive')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      visualMode === 'reactive'
                        ? 'bg-cyan-500 text-slate-950 shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Modo Reactivo (Auto)</span>
                  </button>
                  <button
                    onClick={() => setVisualMode('guided')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      visualMode === 'guided'
                        ? 'bg-purple-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>Modo Profesor / Guiado</span>
                  </button>
                </div>

                {/* Selección de Tónica (12 notas) */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                    Tonalidad / Raíz (Pitch Class):
                  </label>
                  <div className="grid grid-cols-6 gap-1.5">
                    {PITCH_CLASSES.map((pc, idx) => (
                      <button
                        key={pc}
                        onClick={() => setRootIndex(idx)}
                        className={`py-1.5 rounded-lg text-xs font-black transition-all border ${
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

                {/* Selección de Escala y Caja/Posición */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Escala / Modo Griego:
                    </label>
                    <select
                      value={scaleId}
                      onChange={(e) => setScaleId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
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
                      Patrón / Caja (Posición):
                    </label>
                    <select
                      value={boxFilter}
                      onChange={(e) => setBoxFilter(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                    >
                      <option value={0}>Todo el Diapasón</option>
                      <option value={1}>Caja 1 (Posición Tónica 6ta)</option>
                      <option value={2}>Caja 2</option>
                      <option value={3}>Caja 3</option>
                      <option value={4}>Caja 4</option>
                      <option value={5}>Caja 5</option>
                    </select>
                  </div>
                </div>

                {/* Afinación y Número de Trastes */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Afinación:
                    </label>
                    <select
                      value={tuningId}
                      onChange={(e) => setTuningId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
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
                      Nº de Trastes:
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      {[21, 22, 24].map((num) => (
                        <button
                          key={num}
                          onClick={() => setTotalFrets(num)}
                          className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${
                            totalFrets === num
                              ? 'bg-purple-600 border-purple-400 text-white'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tarjeta B: Vector de Cromas de 12 Dimensiones e Identificador de Escala (DSP / MIR) */}
              <div className="bg-[#0c0f20] border border-slate-800/90 rounded-2xl p-4 flex flex-col gap-3 shadow-xl flex-1">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-purple-400" />
                    <span>Pitch Class Profile (Chroma 12-D)</span>
                  </h2>
                  <button
                    onClick={() => {
                      dspEngineRef.current?.resetChromaHistory();
                      setGuidedStats({ hits: 0, total: 0 });
                    }}
                    className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 bg-slate-900 px-2 py-1 rounded border border-slate-800"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Limpiar Memoria</span>
                  </button>
                </div>

                {/* Gráfico de Barras de las 12 Clases de Altura (C, C#, D, ..., B) */}
                <div className="grid grid-cols-12 gap-1 items-end h-24 pt-2 px-1 bg-slate-950/80 rounded-xl border border-slate-800/80 p-2">
                  {PITCH_CLASSES.map((pc, idx) => {
                    const accum = dspTelemetry.accumulatedChroma[idx] || 0;
                    const maxChroma = Math.max(...dspTelemetry.accumulatedChroma, 1);
                    const heightPct = Math.round((accum / maxChroma) * 100);
                    const semitone = (idx - rootIndex + 12) % 12;
                    const inActiveScale = currentScaleObj.mask[semitone] === 1;

                    return (
                      <div key={pc} className="flex flex-col items-center gap-1 h-full justify-end">
                        <div className="w-full bg-slate-900 rounded-t h-16 flex items-end overflow-hidden">
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
                          className={`text-[10px] font-mono font-bold ${
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

                {/* Ranking de Correlación de Escalas en Tiempo Real */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                    <span>Scoring por Correlación de Escala:</span>
                    <span className="font-mono text-[10px] text-cyan-400">
                      {scaleCandidates.length > 0
                        ? `Top: ${scaleCandidates[0].rootName} ${scaleCandidates[0].scaleName}`
                        : 'Toca notas para correlacionar'}
                    </span>
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
                              : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <span className="font-bold">
                            #{i + 1} {cand.rootName} {cand.scaleName}
                          </span>
                          <span className="font-mono text-[11px] text-emerald-400">
                            {Math.round(cand.score * 100)}% match
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500 bg-slate-900/50 rounded-lg p-2.5 border border-slate-800/60">
                      El acumulador de cromas escucha las últimas <em>N</em> notas y las compara contra las máscaras binarias para deducir la escala automáticamente.
                    </div>
                  )}
                </div>

                {/* Selectores rápidos de Dispositivos de Cámara e Interfaz de Audio */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                  <div>
                    <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1">
                      Fuente de Cámara:
                    </label>
                    <select
                      value={selectedVideoId}
                      onChange={(e) => {
                        setSelectedVideoId(e.target.value);
                        if (cameraActive) toggleCamera(e.target.value);
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-slate-200"
                    >
                      {videoDevices.length === 0 && <option value="">Webcam Predeterminada</option>}
                      {videoDevices.map((d, i) => (
                        <option key={d.deviceId || i} value={d.deviceId}>
                          {d.label || `Cámara ${i + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1">
                      Entrada de Audio / Interfaz:
                    </label>
                    <select
                      value={selectedAudioId}
                      onChange={(e) => {
                        setSelectedAudioId(e.target.value);
                        if (micActive) toggleMicrophone(e.target.value);
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-slate-200"
                    >
                      {audioDevices.length === 0 && <option value="">Interfaz / Mic Predeterminado</option>}
                      {audioDevices.map((d, i) => (
                        <option key={d.deviceId || i} value={d.deviceId}>
                          {d.label || `Entrada Audio ${i + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* =================================================================
              4. DIAGRAMA 2D SINCRONIZADO (FRETBOARD INTERACTIVO INFERIOR)
          ================================================================= */}
          <div className="bg-[#0c0f20] border border-slate-800/90 rounded-2xl p-4 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <h2 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-cyan-400" />
                  <span>Diagrama 2D Sincronizado (Haz clic en cualquier traste para sonar e inyectar al DSP)</span>
                </h2>
                <button
                  onClick={() => setInvertStrings((v) => !v)}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-all"
                >
                  Orden Cuerdas: {invertStrings ? '6ta Arriba (Vista Tab)' : '1ra Arriba (Estándar)'}
                </button>
              </div>

              {/* Leyenda de Código de Color */}
              <div className="flex flex-wrap items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-yellow-400 inline-block shadow shadow-yellow-400/50" />
                  <span className="text-slate-300">Nota Activa / Cursor</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-pink-500 inline-block" />
                  <span className="text-slate-300">Raíz (1)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-purple-500 inline-block" />
                  <span className="text-slate-300">Tercera (b3 / 3)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-cyan-400 inline-block" />
                  <span className="text-slate-300">Blue Note / Escala</span>
                </span>
              </div>
            </div>

            {/* Contenedor Horizontal del Diapasón 2D */}
            <div className="overflow-x-auto pb-2">
              <div className="min-w-[1050px] relative select-none bg-gradient-to-b from-[#171226] via-[#131020] to-[#171226] rounded-xl border border-slate-700/80 p-3 pt-7">
                {/* CURSOR DE POSICIÓN TEMPORAL (BARRA AMARILLA VERTICAL / CAJA ACTIVA) */}
                <div
                  className="absolute top-6 bottom-2 pointer-events-none transition-all duration-150 z-10 rounded-lg border-2 border-yellow-400/80 bg-yellow-400/10 shadow-[0_0_20px_rgba(250,204,21,0.2)]"
                  style={{
                    left: `calc(${(Math.max(0, cursorFretPosition) / (totalFrets + 1)) * 100}% + 10px)`,
                    width: boxFilter > 0 ? `${(4 / (totalFrets + 1)) * 100}%` : `${(1.2 / (totalFrets + 1)) * 100}%`,
                  }}
                >
                  <div className=" -top-5 left-1/2 -translate-x-1/2 absolute bg-yellow-400 text-slate-950 font-mono font-black text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap shadow">
                    POS {Math.round(cursorFretPosition)}
                  </div>
                </div>

                {/* Numeración de Trastes (0 a 24) */}
                <div
                  className="grid mb-2 text-center"
                  style={{ gridTemplateColumns: `repeat(${totalFrets + 1}, minmax(0, 1fr))` }}
                >
                  {Array.from({ length: totalFrets + 1 }, (_, f) => (
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
                      {f === 0 ? 'CEJ' : f}
                    </div>
                  ))}
                </div>

                {/* Filas de las 6 cuerdas */}
                <div className="flex flex-col gap-2 relative">
                  {(invertStrings ? [0, 1, 2, 3, 4, 5] : [5, 4, 3, 2, 1, 0]).map((sIdx) => {
                    const row = fretMatrix[sIdx] || [];
                    return (
                      <div
                        key={sIdx}
                        className="grid items-center relative h-8"
                        style={{ gridTemplateColumns: `repeat(${totalFrets + 1}, minmax(0, 1fr))` }}
                      >
                        {/* Línea física de la cuerda */}
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
                              'bg-yellow-400 border-white text-slate-950 scale-125 shadow-[0_0_15px_#facc15] z-20';
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
                              className={`h-full flex items-center justify-center relative group border-r ${
                                node.fret === 0
                                  ? 'border-r-4 border-r-slate-200 bg-slate-900/60'
                                  : 'border-r-slate-700/70'
                              }`}
                              title={`${node.fullNoteName} (${node.frequency.toFixed(1)} Hz) - Traste ${
                                node.fret
                              }, Cuerda ${node.stringNumber}`}
                            >
                              {showNode ? (
                                <span
                                  className={`w-6 h-6 rounded-full text-[10px] font-black flex items-center justify-center border transition-transform ${badgeClass}`}
                                >
                                  {visualMode === 'guided' && node.intervalLabel && !isPlayingExact
                                    ? node.intervalLabel
                                    : node.noteName}
                                </span>
                              ) : (
                                <span className="w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 bg-slate-700 text-slate-200 transition-opacity">
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
      ) : (
        /* =====================================================================
           VISTA 2: PUENTE VST3 EN TIEMPO REAL Y ARQUITECTURA DE 3 HILOS (60+ FPS)
        ===================================================================== */
        <div className="flex-1 max-w-[1600px] w-full mx-auto p-4 lg:p-6 flex flex-col gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Columna Izquierda: Conexión VST3 <-> Web Complemento (WebMIDI + WebSocket Local) */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="bg-[#0c0f20] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <PlugZap className="w-5 h-5 text-purple-400" />
                    <h2 className="text-sm font-black uppercase tracking-wider text-white">
                      Enlace VST3 & DAW en Tiempo Real
                    </h2>
                  </div>
                  <span
                    className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full border ${
                      vstStatus.wsConnected || vstStatus.midiConnected
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}
                  >
                    {vstStatus.wsConnected || vstStatus.midiConnected ? 'CONECTADO' : 'MODO STANDALONE WEB'}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Conecta este complemento web directamente con tu DAW (Reaper, Ableton, Cubase, Logic) o con el plugin{' '}
                  <strong>GuitarTracker VST3</strong> mediante <strong>WebMIDI</strong> o el puente local de baja latencia{' '}
                  <code>WebSocket</code>.
                </p>

                {/* Botón WebMIDI */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">Puerto WebMIDI (DAW / VST3)</div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">{vstStatus.midiDeviceName}</div>
                  </div>
                  <button
                    onClick={() => vstBridgeRef.current?.connectWebMidi()}
                    className="px-3.5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all"
                  >
                    Vincular MIDI
                  </button>
                </div>

                {/* Endpoint WebSocket VST3 */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Servidor Local del VST3 (WebSocket)</span>
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
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200"
                    />
                    <button
                      onClick={() => vstBridgeRef.current?.connectWebSocket(vstStatus.wsEndpoint)}
                      className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all"
                    >
                      Conectar
                    </button>
                  </div>
                </div>
              </div>

              {/* Separación de Hilos (Threading Architecture Monitor) */}
              <div className="bg-[#0c0f20] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-cyan-400">
                  Arquitectura Concurrente de 3 Hilos (Objetivo: 60+ FPS / &lt; 5ms)
                </h3>

                <div className="space-y-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                    <div className="flex items-center justify-between font-bold text-emerald-400">
                      <span>Hilo 1 (Audio DSP Lock-Free)</span>
                      <span className="font-mono">{dspTelemetry.estimatedLatencyMs} ms (64-128 samples)</span>
                    </div>
                    <p className="text-slate-400 text-[11px] mt-1">
                      Captura mono a 48 kHz sin bloqueos. Ejecuta YIN/pYIN + CQT alimentando el vector atómico de 12 cromas.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                    <div className="flex items-center justify-between font-bold text-cyan-400">
                      <span>Hilo 2 (Cámara, Keypoints & Homografía)</span>
                      <span className="font-mono">{visionTelemetry.fps} FPS</span>
                    </div>
                    <p className="text-slate-400 text-[11px] mt-1">
                      Detecta Cejuela, Traste 12 y Traste 24 (YOLOv8-pose / Canny+Hough), calcula matriz 3×3 y aplica Filtro de Kalman.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                    <div className="flex items-center justify-between font-bold text-purple-400">
                      <span>Hilo 3 (Render AR & Diagrama 2D)</span>
                      <span className="font-mono">60+ Hz VSync</span>
                    </div>
                    <p className="text-slate-400 text-[11px] mt-1">
                      Interpola las matrices de transformación del Hilo 2 y proyecta escalas y cajas pentatónicas sin jitter.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Columna Derecha: Código Base C++20 / JUCE + OpenCV para compilar el VST3 Nativo */}
            <div className="lg:col-span-7 bg-[#0c0f20] border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Código Base C++20 / JUCE + OpenCV (VST3 Nativo Lock-Free)</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Estructura lista para compilar el plugin VST3 y sincronizarlo con este complemento web.
                  </p>
                </div>
                <button
                  onClick={handleDownloadVstTemplate}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-cyan-500/20"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar Header C++ (.h)</span>
                </button>
              </div>

              <pre className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-4 text-[11px] font-mono text-cyan-200 overflow-x-auto leading-relaxed">
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
