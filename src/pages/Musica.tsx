import { useEffect, useState, useContext, useRef } from 'react';
import pb from '../lib/pocketbase';
import SpaceBackground from '../components/SpaceBackground';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faPlay, faPause, faStepForward, faStepBackward, faVolumeUp,
    faVideo, faGraduationCap, faHeadphones, faCompactDisc,
    faChevronLeft, faChevronRight, faLayerGroup
} from '@fortawesome/free-solid-svg-icons';
import { faSpotify, faApple, faYoutube, faAmazon } from '@fortawesome/free-brands-svg-icons';
import { useLanguage } from '../context/LanguageContext';
import { ThemeContext } from '../context/ThemeContext';

// --- DATA VIDEOS ---
const academicVideos = [
  { id: 'zp3bM82SEYI', title: 'Mis Guitarras | Leonardo Guzman', cat: 'GEAR' },
  { id: 'Wb03MZJ3uNI', title: 'Mi lick favorito de Dimebag', cat: 'LESSON' },
  { id: 'cFRjPeJfJnM', title: 'James Labrie\'s "Alone" Solo', cat: 'BREAKDOWN' },
  { id: 'SGZRebnG9P4', title: 'CAGED vs 3 NPS', cat: 'THEORY' },
  { id: '_rtBPOL64yA', title: 'La Imitación en la Música', cat: 'MINDSET' },
  { id: 'BHoptNWfGG4', title: 'Neural DSP & Omega Amps', cat: 'REVIEW' },
  { id: 'zlGCi8jSaNo', title: 'Paul Gilbert Best Solo', cat: 'LESSON' },
];

const musicVideos = [
  { id: 'ZDStgP8Dh18', title: 'Afuera (Caifanes Cover)', cat: 'COVER' },
  { id: 'HMXtvfbi2nA', title: 'Te Vengo a Cantar', cat: 'ORIGINAL' },
  { id: 'kvJWg0IN--k', title: 'I Can\'t Get Enough (Remix)', cat: 'REMIX' },
  { id: 'p29RYxp-TMk', title: 'El Animal', cat: 'ORIGINAL' },
  { id: 'foeuc-pv2v8', title: 'El Torcido', cat: 'ORIGINAL' },
  { id: 'PoH9mPQe9J0', title: 'Perdón (Camila Cover)', cat: 'COVER' },
  { id: 'W47kF3boE0U', title: 'Cali Pachanguero Metal', cat: 'METAL' },
  { id: 'NcB-66RYPv0', title: 'Como No Voy a Decirlo', cat: 'ORIGINAL' },
  { id: 'Kc-zU21PjsM', title: 'Se Morir (feat. Gabriel Rondón)', cat: 'COLLAB' },
];

// Formato de tiempo (mm:ss)
const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

// ==========================================
// COMPONENTE INTERNO: MUSIC PLAYER (CRT STYLE)
// ==========================================
interface PlayerProps {
    isDark: boolean;
    currentTrack: any;
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    onTogglePlay: () => void;
    onSeek: (e: any) => void;
    onNext: () => void;
    onPrev: () => void;
}

const InternalMusicPlayer = ({ isDark, currentTrack, isPlaying, currentTime, duration, onTogglePlay, onSeek, onNext, onPrev }: PlayerProps) => {
    const textPrimary = isDark ? 'text-white' : 'text-gray-900';
    const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';
    const iconHover = isDark ? 'hover:text-purple-300' : 'hover:text-purple-600';
    
    // Barras de progreso más visibles
    const progressBg = isDark ? 'bg-white/20' : 'bg-gray-300';
    const progressFill = isDark ? 'bg-purple-400 box-shadow-glow' : 'bg-purple-600';
    const progressPercent = duration ? (currentTime / duration) * 100 : 0;

    return (
        <div className={`relative w-full rounded-[2rem] p-8 overflow-hidden transition-all duration-500
            ${isDark 
                ? 'bg-[#1a1a24] border-2 border-purple-500/30 shadow-[0_0_40px_rgba(147,51,234,0.15)]' 
                : 'bg-gray-100 border border-white shadow-[inset_5px_5px_10px_#bebebe,inset_-5px_-5px_10px_#ffffff]'
            }
        `}>
            {/* EFECTO CRT (Solo Dark Mode) */}
            {isDark && (
                <>
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-0 bg-[length:100%_4px,6px_100%] pointer-events-none"></div>
                    <div className="absolute inset-0 bg-purple-500/5 animate-pulse pointer-events-none z-0"></div>
                </>
            )}

            <div className="relative z-10 flex flex-col h-full justify-between gap-6">
                
                {/* Track Info (Big) */}
                <div className="flex flex-col items-center text-center gap-4">
                    <div className={`w-40 h-40 rounded-2xl shadow-2xl overflow-hidden relative border-4 ${isDark ? 'border-purple-500/20' : 'border-white'} ${isPlaying ? 'animate-[pulse_4s_infinite]' : ''}`}>
                        {currentTrack ? (
                            <img src={currentTrack.url_cover} alt="Cover" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-black/20 text-gray-400">
                                <FontAwesomeIcon icon={faCompactDisc} size="4x" />
                            </div>
                        )}
                    </div>
                    <div className="w-full px-2">
                        {/* APLICADO FONT-ESPACIAL */}
                        <h4 className={`text-2xl font-espacial truncate leading-tight ${textPrimary} drop-shadow-md`}>
                            {currentTrack ? currentTrack.titulo : "SELECT TRACK"}
                        </h4>
                        <p className={`text-sm font-bold uppercase tracking-[0.2em] mt-2 ${textSecondary}`}>
                            {currentTrack ? "Leonardo Guzman" : "READY"}
                        </p>
                    </div>
                </div>

                {/* Controls (Big) */}
                <div className="flex flex-col gap-6 mt-2">
                     {/* Progress */}
                    <div className="w-full">
                        <div className="relative group cursor-pointer w-full h-4 flex items-center">
                            <input 
                                type="range" 
                                min="0" 
                                max={duration || 0} 
                                value={currentTime} 
                                onChange={onSeek}
                                className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer"
                            />
                            <div className={`h-2 w-full rounded-full ${progressBg} overflow-hidden`}>
                                <div className={`h-full ${progressFill} relative`} style={{ width: `${progressPercent}%` }}>
                                     {isDark && <div className="absolute right-0 top-0 bottom-0 w-2 bg-white blur-[2px]"></div>}
                                </div>
                            </div>
                        </div>
                        <div className={`flex justify-between text-[10px] font-mono font-bold mt-1 ${isDark ? 'text-purple-300' : 'text-gray-500'}`}>
                            <span>{formatTime(currentTime)}</span>
                            <span>{formatTime(duration)}</span>
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex items-center justify-between px-4">
                        <button onClick={onPrev} className={`${textSecondary} ${iconHover} transition-colors text-2xl active:scale-95`}>
                            <FontAwesomeIcon icon={faStepBackward} />
                        </button>
                        
                        <button 
                            onClick={onTogglePlay}
                            disabled={!currentTrack}
                            className={`w-20 h-20 rounded-full flex items-center justify-center text-white shadow-2xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                                ${isDark 
                                    ? 'bg-gradient-to-t from-purple-800 to-purple-500 border border-purple-400 shadow-[0_0_30px_rgba(168,85,247,0.4)]' 
                                    : 'bg-gradient-to-t from-purple-700 to-purple-500 shadow-purple-200'
                                }
                            `}
                        >
                            <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} className="ml-1 text-3xl" />
                        </button>
                        
                        <button onClick={onNext} className={`${textSecondary} ${iconHover} transition-colors text-2xl active:scale-95`}>
                            <FontAwesomeIcon icon={faStepForward} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ==========================================
// PÁGINA PRINCIPAL
// ==========================================
const Musica = () => {
  const { t } = useLanguage();
  const { theme } = useContext(ThemeContext);
  const [albums, setAlbums] = useState<any[]>([]);
  
  // --- ESTADO DEL REPRODUCTOR ---
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  
  const [activeVideo, setActiveVideo] = useState(musicVideos[0]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isDark = theme === 'purple';
  const scrollRefMusic = useRef<HTMLDivElement>(null);
  const scrollRefAcademic = useRef<HTMLDivElement>(null);

  useEffect(() => {
    audioRef.current = new Audio();
    const fetch = async () => {
       try {
           const records = await pb.collection('musica').getFullList({ sort: 'orden' });
           const mappedAlbums = records.map((a: any) => ({
               ...a,
               url_cover: a.cover ? pb.files.getUrl(a, a.cover) : '/placeholder.jpg',
               url_audio: a.audio ? pb.files.getUrl(a, a.audio) : ''
           }));
           setAlbums(mappedAlbums);
       } catch (e) { console.error(e); }
    };
    fetch();
    return () => { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; } };
  }, []);

  // Logica de Audio
  const playTrack = (track: any) => {
      if (!audioRef.current) return;
      if (currentTrack?.id === track.id) {
          if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); } 
          else { audioRef.current.play(); setIsPlaying(true); }
      } else {
          audioRef.current.src = track.url_audio;
          audioRef.current.load();
          audioRef.current.play().then(() => { setIsPlaying(true); setDuration(audioRef.current?.duration || 0); })
          .catch(e => console.error("Error playing:", e));
          setCurrentTrack(track);
      }
  };

  useEffect(() => {
      const audio = audioRef.current;
      if (audio) {
          const updateTime = () => setCurrentTime(audio.currentTime);
          const updateMeta = () => setDuration(audio.duration);
          const nextTrack = () => { /* Logica next simplificada */ setIsPlaying(false); };
          audio.addEventListener('timeupdate', updateTime);
          audio.addEventListener('loadedmetadata', updateMeta);
          audio.addEventListener('ended', nextTrack);
          return () => {
              audio.removeEventListener('timeupdate', updateTime);
              audio.removeEventListener('loadedmetadata', updateMeta);
              audio.removeEventListener('ended', nextTrack);
          };
      }
  }, [currentTrack]);

  const handleSeek = (e: any) => {
      const time = Number(e.target.value);
      if (audioRef.current) { audioRef.current.currentTime = time; setCurrentTime(time); }
  };

  const scroll = (ref: any, offset: number) => {
    if (ref.current) ref.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  const textPrimary = isDark ? 'text-white' : 'text-gray-900';

  // --- COMPONENTES UI HELPERS ---
  const VideoThumbnail = ({ video }: { video: any }) => (
    <div 
      onClick={() => { setActiveVideo(video); document.getElementById('video-display')?.scrollIntoView({ behavior: 'smooth' }); }}
      className={`relative flex-shrink-0 cursor-pointer group rounded-xl overflow-hidden w-[180px] md:w-[220px] aspect-video transition-all duration-300 border-2
        ${activeVideo.id === video.id ? 'border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.6)]' : 'border-transparent opacity-80 hover:opacity-100'}
      `}
    >
        <img src={`https://img.youtube.com/vi/${video.id}/mqdefault.jpg`} alt={video.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors flex items-center justify-center">
            <FontAwesomeIcon icon={faPlay} className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" size="lg" />
        </div>
    </div>
  );

  const VerticalVideoThumbnail = ({ video }: { video: any }) => (
    <div 
      onClick={() => { setActiveVideo(video); document.getElementById('video-display')?.scrollIntoView({ behavior: 'smooth' }); }}
      className={`relative flex-shrink-0 cursor-pointer group rounded-xl overflow-hidden w-[140px] md:w-[170px] aspect-[3/4] transition-all duration-300 border-2
        ${activeVideo.id === video.id ? 'border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.6)]' : 'border-transparent opacity-80 hover:opacity-100'}
      `}
    >
        <img src={`https://img.youtube.com/vi/${video.id}/mqdefault.jpg`} alt={video.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent flex flex-col justify-end p-3">
            <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest mb-1">{video.cat}</span>
            <p className="text-[10px] text-white leading-tight font-bold line-clamp-3">{video.title}</p>
        </div>
    </div>
  );

  return (
    // FONDO PRINCIPAL TRANSPARENTE PARA DEJAR VER LAS ESTRELLAS
    <div className={`min-h-screen relative font-sans pb-32 transition-colors duration-500 ${isDark ? 'bg-transparent' : 'bg-[#f0f2f5]'}`}>
      
      {/* FONDO DE ESTRELLAS FIJO */}
      {isDark && (
          <div className="fixed inset-0 -z-10 bg-[#050505]">
              <SpaceBackground />
          </div>
      )}
      
      {/* HEADER: APLICADO FONT-ESPACIAL */}
      <div className="relative pt-36 pb-16 text-center z-10">
          <h1 className={`text-6xl md:text-8xl font-espacial tracking-tighter uppercase mb-4 ${textPrimary} drop-shadow-[0_0_30px_rgba(168,85,247,0.3)]`}>
              {t('discography')}
          </h1>
          <div className={`h-1 w-24 mx-auto rounded-full ${isDark ? 'bg-purple-600 shadow-[0_0_15px_#9333ea]' : 'bg-purple-500'}`}></div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 md:px-8 relative z-10">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start mb-32">
              
              {/* IZQUIERDA: CONSOLA DIGITAL (PLAYER) */}
              <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-32 z-30">
                  <div className="flex items-center justify-between px-4 mb-4">
                      {/* APLICADO FONT-ESPACIAL */}
                      <h3 className={`text-xs font-espacial uppercase tracking-[0.3em] ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
                          <FontAwesomeIcon icon={faHeadphones} className="mr-2" /> {t('now_playing')}
                      </h3>
                      <div className="flex gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                          <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                          <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      </div>
                  </div>
                  
                  <InternalMusicPlayer 
                    isDark={isDark} 
                    currentTrack={currentTrack}
                    isPlaying={isPlaying}
                    currentTime={currentTime}
                    duration={duration}
                    onTogglePlay={() => currentTrack && playTrack(currentTrack)}
                    onSeek={handleSeek}
                    onNext={() => {}}
                    onPrev={() => {}}
                  />
              </div>

              {/* DERECHA: RELEASES */}
              <div className="lg:col-span-7 xl:col-span-8 grid grid-cols-1 gap-5">
                  {albums.map((album) => (
                      <div 
                        key={album.id} 
                        className={`group relative rounded-3xl p-5 flex gap-6 items-center transition-all duration-300 border
                            ${isDark 
                                ? 'bg-[#15101c]/80 border-purple-500/10 hover:border-purple-500/40 hover:bg-[#1f162b]' 
                                : 'bg-white border-white hover:border-purple-200 shadow-sm hover:shadow-lg'
                            }
                        `}
                      >
                          <div className="w-32 h-32 flex-shrink-0 rounded-2xl overflow-hidden shadow-2xl relative group-hover:scale-105 transition-transform duration-500">
                              <img src={album.url_cover} alt={album.titulo} className="w-full h-full object-cover" />
                              <div 
                                onClick={() => playTrack(album)}
                                className={`absolute inset-0 bg-black/50 flex items-center justify-center text-white cursor-pointer transition-opacity ${currentTrack?.id === album.id && isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                              >
                                  <FontAwesomeIcon icon={currentTrack?.id === album.id && isPlaying ? faPause : faPlay} size="2x" />
                              </div>
                          </div>

                          <div className="flex-grow min-w-0 flex flex-col justify-center">
                              <div className="flex justify-between items-start mb-2">
                                  <div>
                                      {/* APLICADO FONT-ESPACIAL */}
                                      <h3 className={`text-2xl font-espacial truncate leading-tight ${textPrimary} ${currentTrack?.id === album.id ? 'text-purple-500' : ''}`}>
                                          {album.titulo}
                                      </h3>
                                      <p className={`text-[10px] font-bold uppercase tracking-[0.2em] mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{t('single_album')}</p>
                                  </div>
                                  {currentTrack?.id === album.id && (
                                      <div className="hidden md:flex gap-1 h-4 items-end">
                                          <div className="w-1 bg-purple-500 animate-[bounce_1s_infinite]"></div>
                                          <div className="w-1 bg-purple-500 animate-[bounce_1.2s_infinite]"></div>
                                          <div className="w-1 bg-purple-500 animate-[bounce_0.8s_infinite]"></div>
                                      </div>
                                  )}
                              </div>
                              
                              <div className="flex gap-6 text-xl mt-4 opacity-60 group-hover:opacity-100 transition-opacity items-center">
                                  <a href="#" className="transition-colors hover:text-[#1DB954] hover:scale-110" title="Spotify"><FontAwesomeIcon icon={faSpotify} /></a>
                                  <a href="#" className="transition-colors hover:text-[#FA243C] hover:scale-110" title="Apple Music"><FontAwesomeIcon icon={faApple} /></a>
                                  <a href="#" className="transition-colors hover:text-[#FF0000] hover:scale-110" title="YouTube"><FontAwesomeIcon icon={faYoutube} /></a>
                                  <a href="#" className="transition-colors hover:text-[#00FFFF] hover:scale-110" title="Tidal"><FontAwesomeIcon icon={faLayerGroup} /></a>
                                  <a href="#" className="transition-colors hover:text-[#FF9900] hover:scale-110" title="Amazon Music"><FontAwesomeIcon icon={faAmazon} /></a>
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          </div>

          {/* SECCIÓN VIDEOS */}
          <div id="video-display" className="space-y-16">
              {/* VIDEO PLAYER: APLICADO FONT-ESPACIAL */}
              <div className={`max-w-5xl mx-auto rounded-[3rem] overflow-hidden p-3 transition-all ${isDark ? 'bg-white/5 border border-white/10' : 'bg-white shadow-xl'}`}>
                  <div className="relative w-full aspect-video rounded-[2.5rem] overflow-hidden bg-black shadow-2xl">
                      <iframe src={`https://www.youtube.com/embed/${activeVideo.id}?autoplay=0&rel=0&modestbranding=1`} title="Video Player" allowFullScreen className="w-full h-full border-none"></iframe>
                  </div>
                  <div className="mt-6 px-6 pb-4">
                      <span className="text-[10px] font-black text-purple-500 uppercase tracking-[0.4em] mb-1 block">{activeVideo.cat}</span>
                      <h2 className={`text-2xl md:text-3xl font-espacial ${textPrimary}`}>{activeVideo.title}</h2>
                  </div>
              </div>

              {/* CAROUSELS */}
              <div className="space-y-20 py-8 pl-2">
                  <div>
                      <div className="flex justify-between items-end mb-8 pr-4 border-b border-gray-800 pb-4">
                          {/* APLICADO FONT-ESPACIAL */}
                          <h3 className={`text-2xl font-espacial ${textPrimary}`}>
                            <FontAwesomeIcon icon={faVideo} className="mr-3 text-purple-500" /> {t('official_videos')}
                          </h3>
                          <div className="flex gap-3">
                              <button onClick={() => scroll(scrollRefMusic, -300)} className={`w-10 h-10 rounded-full border transition-all ${isDark ? 'border-white/20 hover:bg-white/10 text-white' : 'border-gray-300 hover:bg-gray-100 text-gray-600'}`}><FontAwesomeIcon icon={faChevronLeft}/></button>
                              <button onClick={() => scroll(scrollRefMusic, 300)} className={`w-10 h-10 rounded-full border transition-all ${isDark ? 'border-white/20 hover:bg-white/10 text-white' : 'border-gray-300 hover:bg-gray-100 text-gray-600'}`}><FontAwesomeIcon icon={faChevronRight}/></button>
                          </div>
                      </div>
                      <div ref={scrollRefMusic} className="flex overflow-x-auto gap-6 pb-6 hide-scrollbar scroll-smooth snap-x">
                          {musicVideos.map(v => <VideoThumbnail key={v.id} video={v} />)}
                      </div>
                  </div>

                  <div>
                      <div className="flex justify-between items-end mb-8 pr-4 border-b border-gray-800 pb-4">
                          {/* APLICADO FONT-ESPACIAL */}
                          <h3 className={`text-2xl font-espacial ${textPrimary}`}>
                            <FontAwesomeIcon icon={faGraduationCap} className="mr-3 text-red-500" /> {t('academic_gear')}
                          </h3>
                          <div className="flex gap-3">
                              <button onClick={() => scroll(scrollRefAcademic, -300)} className={`w-10 h-10 rounded-full border transition-all ${isDark ? 'border-white/20 hover:bg-white/10 text-white' : 'border-gray-300 hover:bg-gray-100 text-gray-600'}`}><FontAwesomeIcon icon={faChevronLeft}/></button>
                              <button onClick={() => scroll(scrollRefAcademic, 300)} className={`w-10 h-10 rounded-full border transition-all ${isDark ? 'border-white/20 hover:bg-white/10 text-white' : 'border-gray-300 hover:bg-gray-100 text-gray-600'}`}><FontAwesomeIcon icon={faChevronRight}/></button>
                          </div>
                      </div>
                      <div ref={scrollRefAcademic} className="flex overflow-x-auto gap-5 pb-6 hide-scrollbar scroll-smooth snap-x">
                          {academicVideos.map(v => <VerticalVideoThumbnail key={v.id} video={v} />)}
                      </div>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default Musica;