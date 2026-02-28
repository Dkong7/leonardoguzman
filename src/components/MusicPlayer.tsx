import { useState, useEffect, useRef, useContext } from 'react';
import pb from '../lib/pocketbase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faPause, faStepForward, faStepBackward } from '@fortawesome/free-solid-svg-icons';
import { faSpotify, faApple, faYoutube, faAmazon } from '@fortawesome/free-brands-svg-icons';
import { ThemeContext } from '../context/ThemeContext';

const LightningProgress = ({ progress, duration, onSeek, isDark }: { progress: number, duration: number, onSeek: (time: number) => void, isDark: boolean }) => {
    return (
        <div className={`w-full h-1.5 rounded-full cursor-pointer relative group transition-colors ${isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-300 hover:bg-gray-400 shadow-inner'}`} onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            onSeek(((e.clientX - rect.left) / rect.width) * duration);
        }}>
            <div className={`absolute top-0 left-0 h-full rounded-full transition-all duration-150 ${isDark ? 'bg-purple-500 shadow-[0_0_10px_#a855f7]' : 'bg-purple-600'}`} style={{ width: `${(progress / (duration || 1)) * 100}%` }}>
               <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg scale-0 group-hover:scale-100 transition-transform"></div>
            </div>
        </div>
    );
};

const MusicPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [tracks, setTracks] = useState<any[]>([]);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'purple';

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

  // ESTILOS DINÁMICOS FASE 2
  const containerClass = isDark
      ? 'bg-[#120b18]/80 backdrop-blur-[20px] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]'
      : 'bg-white/80 backdrop-blur-xl border border-white shadow-[0_15px_40px_rgba(0,0,0,0.1)]';

  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';
  const textHighlight = isDark ? 'text-purple-400' : 'text-purple-600';

  return (
    <div className={`w-full max-w-2xl rounded-[2.5rem] overflow-hidden flex flex-col md:flex-row transition-all duration-500 ${containerClass}`}>
        
        <audio ref={audioRef} src={track.url_audio} onTimeUpdate={onTimeUpdate} onLoadedMetadata={onTimeUpdate} onEnded={() => handleTrackChange(currentTrack < tracks.length - 1 ? currentTrack + 1 : 0)} />

        {/* LADO IZQUIERDO: CONTROLES Y COVER */}
        <div className={`w-full md:w-5/12 p-6 md:p-8 flex flex-col items-center justify-between border-b md:border-b-0 md:border-r ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
            
            {/* CARÁTULA */}
            <div className={`w-full aspect-square rounded-[2rem] overflow-hidden shadow-2xl relative mb-6 ${isDark ? 'border border-white/10' : 'border-4 border-white'}`}>
                <img 
                    src={track.url_cover} 
                    alt={track.titulo} 
                    className={`w-full h-full object-cover transition-transform duration-[20s] ease-linear ${isPlaying ? 'scale-125' : 'scale-100'}`} 
                />
            </div>

            {/* INFO TRACK */}
            <div className="text-center w-full mb-6">
                <h1 className={`text-xl md:text-2xl font-serif font-bold truncate tracking-wide ${textPrimary}`}>{track.titulo}</h1>
                <p className={`text-[10px] font-black uppercase tracking-[0.2em] mt-1 ${textHighlight}`}>{track.artista}</p>
            </div>

            {/* PROGRESS BAR */}
            <div className="w-full mb-6">
                <LightningProgress progress={currentTime} duration={duration} onSeek={handleSeek} isDark={isDark} />
                <div className={`flex justify-between text-[9px] font-mono font-bold mt-2 tracking-widest ${textSecondary}`}>
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>

            {/* CONTROLS */}
            <div className="flex items-center justify-center gap-6 w-full">
                <button onClick={() => handleTrackChange(currentTrack > 0 ? currentTrack - 1 : tracks.length - 1)} className={`${textSecondary} hover:${isDark?'text-white':'text-black'} transition-colors active:scale-90`}>
                    <FontAwesomeIcon icon={faStepBackward} size='lg' />
                </button>

                <button onClick={() => setIsPlaying(!isPlaying)} 
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg active:scale-95 shrink-0
                        ${isDark 
                            ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_20px_rgba(147,51,234,0.4)]' 
                            : 'bg-gray-900 hover:bg-black text-white shadow-xl'
                        }
                    `}
                >
                    <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} size='lg' className={isPlaying ? "" : "ml-0.5"} />
                </button>

                <button onClick={() => handleTrackChange(currentTrack < tracks.length - 1 ? currentTrack + 1 : 0)} className={`${textSecondary} hover:${isDark?'text-white':'text-black'} transition-colors active:scale-90`}>
                    <FontAwesomeIcon icon={faStepForward} size='lg' />
                </button>
            </div>
        </div>

        {/* LADO DERECHO: PLAYLIST FIJA */}
        <div className="w-full md:w-7/12 flex flex-col h-[400px] md:h-auto">
            
            {/* HEADER PLAYLIST */}
            <div className={`px-6 py-5 border-b flex justify-between items-center ${isDark ? 'border-white/5 bg-white/5' : 'border-gray-200 bg-gray-50'}`}>
                <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] font-espacial ${textSecondary}`}>
                    Discografía Selecta
                </h3>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${isDark ? 'bg-white/10 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
                    {tracks.length} Tracks
                </span>
            </div>

            {/* LISTA DE TRACKS (SCROLLABLE) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
                {tracks.map((t, index) => {
                    const isActive = currentTrack === index;
                    
                    const itemStyle = isActive
                        ? (isDark ? 'bg-purple-600/20 border-purple-500/30' : 'bg-purple-50 border-purple-200')
                        : (isDark ? 'hover:bg-white/5 border-transparent' : 'hover:bg-gray-50 border-transparent');

                    return (
                        <div key={index} onClick={() => handleTrackChange(index)}
                            className={`flex items-center gap-4 p-2.5 rounded-xl cursor-pointer transition-all border ${itemStyle}`}
                        >
                            {/* Número o Icono de Play */}
                            <div className="w-4 text-center shrink-0">
                                {isActive ? (
                                    <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} className={`text-[10px] ${textHighlight}`} />
                                ) : (
                                    <span className={`text-[10px] font-mono font-bold ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                                        {(index + 1).toString().padStart(2, '0')}
                                    </span>
                                )}
                            </div>

                            <img src={t.url_cover} alt={t.titulo} className="w-10 h-10 rounded-lg object-cover shadow-sm shrink-0" />
                            
                            <div className="flex-1 min-w-0">
                                <p className={`text-sm font-bold truncate ${isActive ? (isDark ? 'text-white' : 'text-purple-900') : textPrimary}`}>{t.titulo}</p>
                                <p className={`text-[9px] uppercase tracking-widest truncate mt-0.5 ${isActive ? textHighlight : textSecondary}`}>{t.artista}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* FOOTER: DSP LINKS */}
            <div className={`px-6 py-4 border-t flex justify-center gap-6 ${isDark ? 'border-white/5 bg-black/20' : 'border-gray-200 bg-white'}`}>
                <a href="#" className={`text-xl transition-all hover:-translate-y-1 ${isDark ? 'text-gray-500 hover:text-[#1DB954]' : 'text-gray-400 hover:text-[#1DB954]'}`}><FontAwesomeIcon icon={faSpotify} /></a>
                <a href="#" className={`text-xl transition-all hover:-translate-y-1 ${isDark ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-black'}`}><FontAwesomeIcon icon={faApple} /></a>
                <a href="#" className={`text-xl transition-all hover:-translate-y-1 ${isDark ? 'text-gray-500 hover:text-[#FF0000]' : 'text-gray-400 hover:text-[#FF0000]'}`}><FontAwesomeIcon icon={faYoutube} /></a>
                <a href="#" className={`text-xl transition-all hover:-translate-y-1 ${isDark ? 'text-gray-500 hover:text-[#00A8E1]' : 'text-gray-400 hover:text-[#00A8E1]'}`}><FontAwesomeIcon icon={faAmazon} /></a>
            </div>

        </div>

    </div>
  );
};

export default MusicPlayer;