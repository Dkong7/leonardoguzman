import { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faPause, faStepForward, faStepBackward, faCompactDisc } from '@fortawesome/free-solid-svg-icons';

const MusicPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [tracks, setTracks] = useState<any[]>([]);
  const [currentTrack, setCurrentTrack] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const fetchMusic = async () => {
      const { data } = await supabase.from('musica').select('*').order('orden', { ascending: true });
      if (data) setTracks(data);
    };
    fetchMusic();
  }, []);

  useEffect(() => {
    if (audioRef.current) {
       if (isPlaying) audioRef.current.play();
       else audioRef.current.pause();
    }
  }, [isPlaying, currentTrack]);

  const handleTrackChange = (index: number) => {
     setCurrentTrack(index);
     setIsPlaying(true);
  };

  if (tracks.length === 0) return null;
  const track = tracks[currentTrack];

  return (
    <div className='w-full max-w-7xl mx-auto -mt-32 relative z-30 px-4 mb-20'>
      <audio ref={audioRef} src={track.url_audio} onEnded={() => setIsPlaying(false)} />
      
      <div className='bg-black/80 backdrop-blur-2xl border border-nardo-800 rounded-3xl p-8 shadow-2xl flex flex-col md:flex-row gap-10 items-center'>
        <div className='relative shrink-0'>
          <img src={track.url_cover} alt={track.titulo} className={`w-64 h-64 md:w-80 md:h-80 rounded shadow-2xl object-cover border-2 border-nardo-900 transition-transform duration-700 ${isPlaying ? 'scale-105' : 'grayscale'}`} />
        </div>

        <div className='flex-1 w-full flex flex-col justify-center'>
          <h2 className='text-sm font-bold text-nardo-500 tracking-[0.3em] mb-2 uppercase flex items-center gap-2'>
             <FontAwesomeIcon icon={faCompactDisc} className={isPlaying ? 'animate-spin' : ''} /> Now Listening
          </h2>
          <h1 className='text-4xl md:text-5xl font-serif font-bold text-white mb-2'>{track.titulo}</h1>
          <p className='text-xl text-gray-400 mb-8'>{track.artista}</p>

          <div className='flex items-center gap-8 mb-8'>
            <button onClick={() => handleTrackChange(currentTrack > 0 ? currentTrack - 1 : tracks.length - 1)} className='text-gray-500 hover:text-white'><FontAwesomeIcon icon={faStepBackward} size='2x' /></button>
            <button onClick={() => setIsPlaying(!isPlaying)} className='w-20 h-20 bg-nardo-500 text-white rounded-full flex items-center justify-center hover:bg-white hover:text-nardo-900 transition-all shadow-[0_0_20px_#9d4edd]'>
              <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} size='2x' />
            </button>
            <button onClick={() => handleTrackChange(currentTrack < tracks.length - 1 ? currentTrack + 1 : 0)} className='text-gray-500 hover:text-white'><FontAwesomeIcon icon={faStepForward} size='2x' /></button>
          </div>
          
          <div className='w-full h-32 overflow-y-auto custom-scrollbar border-t border-nardo-800 pt-4'>
             {tracks.map((t, i) => (
                <div key={t.id} onClick={() => handleTrackChange(i)} className={`cursor-pointer p-2 rounded flex justify-between ${currentTrack === i ? 'text-nardo-400 font-bold' : 'text-gray-500 hover:bg-white/5'}`}>
                   <span>{i + 1}. {t.titulo}</span>
                   {currentTrack === i && <span className='text-xs'>PLAYING</span>}
                </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
};
export default MusicPlayer;