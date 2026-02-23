import { useState, useEffect, useRef } from 'react';
import pb from '../lib/pocketbase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faPause, faStepForward, faStepBackward, faCog, faTimes, faList } from '@fortawesome/free-solid-svg-icons';
import { faSpotify, faApple, faYoutube, faAmazon } from '@fortawesome/free-brands-svg-icons';
import { motion, AnimatePresence } from 'framer-motion';

const LightningProgress = ({ progress, duration, onSeek }: { progress: number, duration: number, onSeek: (time: number) => void }) => {
    return (
        <div className="w-full h-2 bg-white/10 rounded-full cursor-pointer relative group" onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            onSeek(((e.clientX - rect.left) / rect.width) * duration);
        }}>
            <div className="absolute top-0 left-0 h-full bg-purple-500 rounded-full" style={{ width: `${(progress / (duration || 1)) * 100}%` }}>
               <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-[0_0_10px_#d946ef] opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
        </div>
    );
};

const MusicPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false); 
  const [tracks, setTracks] = useState<any[]>([]);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const [devMode, setDevMode] = useState(false);
  
  const [mWidth, setMWidth] = useState(800);
  const [mHeight, setMHeight] = useState(687);
  const [mX, setMX] = useState(231);      
  const [mY, setMY] = useState(32);     
  const [pWidth, setPWidth] = useState(336);
  const [pHeight, setPHeight] = useState(450);
  const [pLeft, setPLeft] = useState(236); 
  const [pTop, setPTop] = useState(124);   
  const [cSize, setCSize] = useState(191);
  const [cX, setCX] = useState(0);        
  const [cY, setCY] = useState(0);        

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
    window.dispatchEvent(new CustomEvent('estadoMusica', { detail: isPlaying }));
    
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

  // RESTAURADO: Función necesaria para LightningProgress
  const handleSeek = (time: number) => {
    if (audioRef.current) {
        audioRef.current.currentTime = time;
        setCurrentTime(time);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "00:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  if (tracks.length === 0) return null;
  const track = tracks[currentTrack];

  const CONFIGURACION = {
    "--m-w": `${mWidth}px`, "--m-h": `${mHeight}px`, "--m-x": `${mX}px`, "--m-y": `${mY}px`, 
    "--p-w": `${pWidth}px`, "--p-h": `${pHeight}px`, "--p-x": `${pLeft}px`, "--p-y": `${pTop}px`, 
    "--c-s": `${cSize}px`, "--c-x": `${cX}px`, "--c-y": `${cY}px`,
  } as React.CSSProperties;

  return (
    <>
      <div style={CONFIGURACION} className="relative z-30 mx-auto flex justify-center contenedor-maestro">

        <style>{`
          .contenedor-maestro { margin-top: calc(var(--m-y) * 0.45); transform: translateX(0); }
          .bloque-marco { width: calc(var(--m-w) * 0.45); height: calc(var(--m-h) * 0.45); position: relative; }
          .bloque-contenido {
            position: absolute; width: calc(var(--p-w) * 0.45); height: calc(var(--p-h) * 0.45);
            top: calc(var(--p-y) * 0.45); left: calc(var(--p-x) * 0.45);
            z-index: 10; display: flex; flex-direction: column; align-items: center; justify-content: space-between; padding: 0.5rem;
          }
          .bloque-caratula { width: calc(var(--c-s) * 0.45); height: calc(var(--c-s) * 0.45); flex-shrink: 0; transform: translate(calc(var(--c-x) * 0.45), calc(var(--c-y) * 0.45)); }
          .bloque-playlist { width: 90%; height: calc(var(--c-s) * 0.45); flex-shrink: 0; transform: translate(calc(var(--c-x) * 0.45), calc(var(--c-y) * 0.45)); }

          .playlist-scroll::-webkit-scrollbar { width: 3px; }
          .playlist-scroll::-webkit-scrollbar-track { background: rgba(0,0,0,0.3); border-radius: 4px; }
          .playlist-scroll::-webkit-scrollbar-thumb { background: rgba(217,70,239,0.5); border-radius: 4px; }

          .texto-titulo { font-size: 14px; }
          .texto-artista { font-size: 8px; }
          .texto-tiempo { font-size: 8px; }
          .iconos-dsp { transform: scale(0.8); }
          .botones-control { transform: scale(0.8); }

          @media (min-width: 1024px) {
            .contenedor-maestro { margin-top: var(--m-y); transform: translateX(var(--m-x)); }
            .bloque-marco { width: var(--m-w); height: var(--m-h); }
            .bloque-contenido { width: var(--p-w); height: var(--p-h); top: var(--p-y); left: var(--p-x); padding: 1rem; }
            .bloque-caratula { width: var(--c-s); height: var(--c-s); transform: translate(var(--c-x), var(--c-y)); }
            .bloque-playlist { width: 90%; height: var(--c-s); transform: translate(var(--c-x), var(--c-y)); }
            .texto-titulo { font-size: 24px; }
            .texto-artista { font-size: 10px; }
            .texto-tiempo { font-size: 10px; }
            .iconos-dsp { transform: scale(1); }
            .botones-control { transform: scale(1); }
          }
        `}</style>

        <audio ref={audioRef} src={track.url_audio} onTimeUpdate={onTimeUpdate} onLoadedMetadata={onTimeUpdate} onEnded={() => handleTrackChange(currentTrack < tracks.length - 1 ? currentTrack + 1 : 0)} />
        
        <div className={`bloque-marco`}>
          <img src="/frame-player.png" alt="Marco Reproductor" className="absolute inset-0 w-full h-full object-fill z-20 pointer-events-none drop-shadow-[0_0_25px_rgba(138,43,226,0.6)] transition-all duration-500 opacity-70" />

          <div className={`bloque-contenido`}>
            
            <div className="player-bg-inner absolute inset-0 bg-white/5 backdrop-blur-[16px] rounded-[2rem] z-[-1] border border-white/10 shadow-[inset_1px_1px_10px_rgba(255,255,255,0.05),0_15px_35px_rgba(0,0,0,0.5)] transition-colors duration-500"></div>

            <button onClick={() => setShowPlaylist(!showPlaylist)} className="absolute top-4 right-4 z-30 text-purple-400 hover:text-white transition-all hover:scale-110 p-2" title="Ver Playlist">
                <FontAwesomeIcon icon={showPlaylist ? faTimes : faList} size="sm" />
            </button>

            <AnimatePresence mode="wait">
              {showPlaylist ? (
                <motion.div key="playlist" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                    className={`bloque-playlist relative rounded-xl shadow-[inset_2px_2px_10px_rgba(0,0,0,0.3),0_10px_30px_rgba(0,0,0,0.5)] z-10 border border-white/10 bg-black/40 backdrop-blur-md p-1 overflow-y-auto playlist-scroll transition-colors duration-500`}
                >
                    {tracks.map((t, index) => (
                        <div key={index} onClick={() => { handleTrackChange(index); setShowPlaylist(false); }}
                            className={`playlist-item-active flex items-center gap-2 lg:gap-3 p-1.5 lg:p-2 rounded cursor-pointer transition-colors mb-1 border ${currentTrack === index ? 'bg-purple-600/40 border-purple-500/50' : 'hover:bg-white/10 border-transparent'}`}
                        >
                            <img src={t.url_cover} alt={t.titulo} className="w-6 h-6 lg:w-8 lg:h-8 rounded object-cover" />
                            <div className="flex-1 text-left overflow-hidden">
                                <p className={`playlist-item-title text-[8px] lg:text-[10px] font-bold truncate ${currentTrack === index ? 'text-white' : 'text-gray-300'}`}>{t.titulo}</p>
                                <p className="playlist-item-artist text-[6px] lg:text-[8px] text-purple-400 truncate uppercase tracking-widest">{t.artista}</p>
                            </div>
                            {currentTrack === index && (<FontAwesomeIcon icon={isPlaying ? faPause : faPlay} className="text-purple-400 text-[8px] mr-1" />)}
                        </div>
                    ))}
                </motion.div>
              ) : (
                <motion.div key="cover" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                    className={`bloque-caratula relative rounded-xl overflow-hidden shadow-[5px_5px_15px_rgba(0,0,0,0.6)] z-10 border border-white/10`}
                    whileHover={{ scale: 1.02 }} transition={{ duration: 0.5 }}
                >
                    <motion.img src={track.url_cover} alt={track.titulo} className="w-full h-full object-cover" animate={{ filter: isPlaying ? 'grayscale(0%)' : 'grayscale(100%)' }} whileHover={{ filter: 'grayscale(0%)' }} transition={{ duration: 0.8 }} />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center justify-center gap-3 lg:gap-4 text-gray-400 z-10 w-full mt-2 iconos-dsp transition-colors">
                <a href="#" className="hover:text-[#1DB954] hover:scale-110 transition-all drop-shadow-md"><FontAwesomeIcon icon={faSpotify} size="lg" /></a>
                <a href="#" className="hover:text-white hover:scale-110 transition-all drop-shadow-md"><FontAwesomeIcon icon={faApple} size="lg" /></a>
                <a href="#" className="hover:text-[#FF0000] hover:scale-110 transition-all drop-shadow-md"><FontAwesomeIcon icon={faYoutube} size="lg" /></a>
                <a href="#" className="hover:text-[#00A8E1] hover:scale-110 transition-all drop-shadow-md"><FontAwesomeIcon icon={faAmazon} size="lg" /></a>
                <a href="#" className="hover:text-gray-100 hover:scale-110 transition-all text-[9px] font-black border border-gray-400 px-1.5 py-0.5 rounded drop-shadow-md">TIDAL</a>
            </div>

            <div className="w-full z-10 text-center px-2">
                <h1 className='font-serif font-bold text-white tracking-wide truncate drop-shadow-[0_0_10px_rgba(217,70,239,0.5)] texto-titulo transition-colors'>{track.titulo}</h1>
                <p className='text-purple-300 font-black uppercase tracking-[0.2em] mt-1 texto-artista transition-colors'>{track.artista}</p>
            </div>

            <div className="w-full z-10 flex flex-col gap-1 px-4 mt-2">
                <LightningProgress progress={currentTime} duration={duration} onSeek={handleSeek} />
                <div className='flex justify-between text-gray-400 font-mono tracking-widest mt-1 texto-tiempo transition-colors'>
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>

            <div className='flex items-center justify-center gap-4 lg:gap-6 z-10 w-full mb-1 botones-control transition-colors'>
                <button onClick={() => handleTrackChange(currentTrack > 0 ? currentTrack - 1 : tracks.length - 1)} className='text-purple-400 hover:text-white transition transform hover:-translate-x-1 p-2'>
                    <FontAwesomeIcon icon={faStepBackward} size='lg' />
                </button>

                <button onClick={() => setIsPlaying(!isPlaying)} 
                    className='w-12 h-12 lg:w-14 lg:h-14 rounded-full flex items-center justify-center transition-all shrink-0 text-white'
                    style={{ 
                        background: isPlaying ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.1)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        boxShadow: isPlaying 
                            ? 'inset 4px 4px 10px rgba(0,0,0,0.8), inset -4px -4px 10px rgba(255,255,255,0.05), 0 0 20px rgba(217,70,239,0.2)' 
                            : '4px 4px 15px rgba(0,0,0,0.6), -2px -2px 10px rgba(255,255,255,0.1)' 
                    }}
                >
                    <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} size='lg' className={isPlaying ? "" : "ml-1"} />
                </button>

                <button onClick={() => handleTrackChange(currentTrack < tracks.length - 1 ? currentTrack + 1 : 0)} className='text-purple-400 hover:text-white transition transform hover:translate-x-1 p-2'>
                    <FontAwesomeIcon icon={faStepForward} size='lg' />
                </button>
            </div>

          </div>
        </div>
      </div>
    </>
  );
};

export default MusicPlayer;