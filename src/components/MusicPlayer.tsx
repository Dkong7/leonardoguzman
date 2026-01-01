import { useState, useEffect, useRef } from 'react';
import pb from '../lib/pocketbase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPlay, faPause, faStepForward, faStepBackward, 
  faShareAlt 
} from '@fortawesome/free-solid-svg-icons';
import { 
  faSpotify, faApple, faYoutube, faAmazon, faSoundcloud 
} from '@fortawesome/free-brands-svg-icons';
import { useLanguage } from '../context/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';

// --- CANVAS DEL RAYO (Ajustado para ser más visible) ---
const LightningProgress = ({ progress, duration, onSeek }: { progress: number, duration: number, onSeek: (time: number) => void }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        let animationFrameId: number;
        
        const drawLightning = () => {
            if (containerRef.current) {
                canvas.width = containerRef.current.clientWidth;
                canvas.height = 50; // Un poco más alto para el efecto
            }
            const width = canvas.width;
            const height = canvas.height;
            const centerY = height / 2;
            const progressWidth = (progress / (duration || 1)) * width;

            ctx.clearRect(0, 0, width, height);
            
            // Línea base
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 2;
            ctx.moveTo(0, centerY);
            ctx.lineTo(width, centerY);
            ctx.stroke();

            if (progressWidth > 0) {
                ctx.beginPath();
                ctx.moveTo(0, centerY);
                let currentX = 0;
                while (currentX < progressWidth) {
                    currentX += Math.random() * 15 + 5;
                    const offset = (Math.random() - 0.5) * 20; 
                    const y = currentX >= progressWidth ? centerY : centerY + offset;
                    ctx.lineTo(Math.min(currentX, progressWidth), y);
                }
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#d946ef'; 
                ctx.strokeStyle = '#f0abfc'; 
                ctx.lineWidth = 2.5 + Math.random(); 
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.stroke();

                // Cabeza del rayo
                ctx.beginPath();
                ctx.arc(progressWidth, centerY, 5 + Math.random() * 2, 0, Math.PI * 2);
                ctx.fillStyle = '#fff';
                ctx.shadowBlur = 20;
                ctx.shadowColor = '#a855f7'; 
                ctx.fill();
            }
            animationFrameId = requestAnimationFrame(drawLightning);
        };
        drawLightning();
        return () => cancelAnimationFrame(animationFrameId);
    }, [progress, duration]);

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!containerRef.current || !duration) return;
        const rect = containerRef.current.getBoundingClientRect();
        onSeek(((e.clientX - rect.left) / rect.width) * duration);
    };

    return (
        <div ref={containerRef} onClick={handleClick} className="w-full h-[50px] cursor-pointer relative group">
            <canvas ref={canvasRef} className="absolute inset-0 z-10" />
        </div>
    );
};

const MusicPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [tracks, setTracks] = useState<any[]>([]);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showShareTooltip, setShowShareTooltip] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { t } = useLanguage(); 

  useEffect(() => {
    const fetchMusic = async () => {
      try {
        const records = await pb.collection('musica').getFullList({ sort: 'orden' });
        const mappedTracks = records.map((r: any) => ({
            ...r,
            url_audio: r.audio ? pb.files.getUrl(r, r.audio) : r.url_audio,
            url_cover: r.cover ? pb.files.getUrl(r, r.cover) : r.url_cover
        }));
        setTracks(mappedTracks);
      } catch (e) {
        console.error("Error cargando música:", e);
      }
    };
    fetchMusic();
  }, []);

  useEffect(() => {
    if (audioRef.current) {
       if (isPlaying) audioRef.current.play().catch(() => setIsPlaying(false));
       else audioRef.current.pause();
    }
  }, [isPlaying, currentTrack]);

  const onTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (!isNaN(audioRef.current.duration)) setDuration(audioRef.current.duration);
    }
  };

  const handleTrackChange = (index: number) => {
     setCurrentTrack(index);
     setIsPlaying(true);
  };

  const handleSeek = (time: number) => {
    if (audioRef.current) {
        audioRef.current.currentTime = time;
        setCurrentTime(time);
    }
  };

  const handleShare = () => {
    const textToShare = `Escucha a Nardo - ${tracks[currentTrack].titulo}`;
    navigator.clipboard.writeText(textToShare);
    setShowShareTooltip(true);
    setTimeout(() => setShowShareTooltip(false), 2000);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "00:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  if (tracks.length === 0) return null;
  const track = tracks[currentTrack];

  return (
    <div className='w-full max-w-7xl mx-auto -mt-20 relative z-30 px-4 mb-20'>
      <audio 
        ref={audioRef} src={track.url_audio} 
        onTimeUpdate={onTimeUpdate} onLoadedMetadata={onTimeUpdate}
        onEnded={() => handleTrackChange(currentTrack < tracks.length - 1 ? currentTrack + 1 : 0)} 
      />
      
      <div className='bg-[#030303]/90 backdrop-blur-3xl border border-nardo-900/40 rounded-[3rem] p-8 md:p-16 shadow-2xl flex flex-col items-center text-center relative overflow-hidden'>
        
        {/* FONDO DECORATIVO */}
        <div className='absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-nardo-600/5 rounded-full blur-[120px] pointer-events-none'></div>

        {/* 1. COVER ART (GIGANTE - Mantenido) */}
        <motion.div 
            className="relative w-80 h-80 md:w-[38rem] md:h-[38rem] mb-12 rounded-2xl overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.9)] z-10"
            whileHover={{ scale: 1.005 }}
            transition={{ duration: 0.5 }}
        >
            <motion.img 
                src={track.url_cover} alt={track.titulo} 
                className="w-full h-full object-cover"
                animate={{ filter: isPlaying ? 'grayscale(0%)' : 'grayscale(100%)' }}
                whileHover={{ filter: 'grayscale(0%)' }}
                transition={{ duration: 0.8 }}
            />
            <div className="absolute inset-0 border border-white/5 rounded-2xl pointer-events-none"></div>
        </motion.div>

        {/* 2. CONTENEDOR INFERIOR (Ahora más amplio) */}
        <div className="w-full max-w-3xl z-10">
             
             {/* Títulos Grandes */}
             <div className='mb-6'>
                <h1 className='text-3xl md:text-5xl font-serif font-bold text-white tracking-wide mb-2 drop-shadow-lg'>{track.titulo}</h1>
                <p className='text-sm md:text-base text-nardo-400 font-bold uppercase tracking-[0.3em]'>{track.artista}</p>
             </div>

             {/* Rayo & Tiempos */}
             <div className="w-full mb-2 px-4">
                <LightningProgress progress={currentTime} duration={duration} onSeek={handleSeek} />
             </div>
             <div className='flex justify-between text-xs text-gray-500 font-mono -mt-1 px-4 mb-8 tracking-widest'>
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
             </div>

             {/* Botonera (Más grande y cómoda) */}
             <div className='flex items-center justify-center gap-12 mb-10'>
                 <button onClick={() => handleTrackChange(currentTrack > 0 ? currentTrack - 1 : tracks.length - 1)} 
                         className='text-gray-500 hover:text-white transition transform hover:-translate-x-1 p-2'>
                    <FontAwesomeIcon icon={faStepBackward} size='2x' />
                 </button>

                 <button onClick={() => setIsPlaying(!isPlaying)} 
                    className='w-20 h-20 bg-white text-black rounded-full flex items-center justify-center hover:bg-nardo-400 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_40px_#d946ef] hover:scale-105'
                 >
                    <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} size='2x' className="ml-1" />
                 </button>

                 <button onClick={() => handleTrackChange(currentTrack < tracks.length - 1 ? currentTrack + 1 : 0)} 
                         className='text-gray-500 hover:text-white transition transform hover:translate-x-1 p-2'>
                    <FontAwesomeIcon icon={faStepForward} size='2x' />
                 </button>
             </div>

             {/* Playlist (Más grande y legible) */}
             <div className='w-full border-t border-b border-nardo-900/30 py-6 mb-10'>
                <div className="flex flex-col gap-2 max-h-60 overflow-y-auto custom-scrollbar px-2">
                    {tracks.map((t, i) => (
                        <div key={t.id} onClick={() => handleTrackChange(i)} 
                            className={`cursor-pointer p-3 rounded-lg flex justify-between items-center text-sm md:text-base transition-colors duration-300
                                ${currentTrack === i 
                                    ? 'bg-nardo-900/20 text-nardo-300 font-bold border-l-4 border-nardo-500 pl-3' 
                                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5 border-l-4 border-transparent'}`}>
                            <div className="flex items-center gap-4">
                                <span className="opacity-30 w-4 text-xs">{i + 1}</span>
                                <span className="truncate">{t.titulo}</span>
                            </div>
                            {currentTrack === i && (
                                <div className="w-2 h-2 bg-nardo-500 rounded-full animate-pulse shadow-[0_0_10px_#d946ef]"></div>
                            )}
                        </div>
                    ))}
                </div>
             </div>

             {/* 3. FOOTER DSPs + CTA */}
             <div className="flex flex-col items-center gap-4">
                 <p className="text-[10px] md:text-xs font-bold text-gray-500 tracking-[0.2em] uppercase mb-2">{t('listen_on')}</p>
                 
                 <div className="flex items-center gap-8 text-gray-500 mb-4">
                    {/* Iconos más grandes */}
                    <a href="#" className="hover:text-[#1DB954] hover:scale-110 transition-all duration-300"><FontAwesomeIcon icon={faSpotify} size="2x" /></a>
                    <a href="#" className="hover:text-white hover:scale-110 transition-all duration-300"><FontAwesomeIcon icon={faApple} size="2x" /></a>
                    <a href="#" className="hover:text-[#FF0000] hover:scale-110 transition-all duration-300"><FontAwesomeIcon icon={faYoutube} size="2x" /></a>
                    <a href="#" className="hover:text-[#00A8E1] hover:scale-110 transition-all duration-300"><FontAwesomeIcon icon={faAmazon} size="2x" /></a>
                    <a href="#" className="hover:text-[#ff7700] hover:scale-110 transition-all duration-300"><FontAwesomeIcon icon={faSoundcloud} size="2x" /></a>
                 </div>

                 {/* Compartir + Tooltip */}
                 <div className="relative">
                    <button onClick={handleShare} className="text-xs md:text-sm flex items-center gap-3 text-nardo-500 border border-nardo-900 px-6 py-2 rounded-full hover:bg-nardo-900 transition-colors uppercase font-bold tracking-widest shadow-lg hover:shadow-nardo-900/50">
                       <FontAwesomeIcon icon={faShareAlt} /> {t('share')}
                    </button>
                    <AnimatePresence>
                        {showShareTooltip && (
                            <motion.div 
                               initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                               className='absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-white text-black text-xs font-bold px-4 py-2 rounded shadow-lg whitespace-nowrap z-50'
                            >
                                {t('copied')}
                            </motion.div>
                        )}
                    </AnimatePresence>
                 </div>
             </div>

        </div>
      </div>
    </div>
  );
};

export default MusicPlayer;