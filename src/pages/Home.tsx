import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import GigsWidget from '../components/GigsWidget';
import MusicPlayer from '../components/MusicPlayer';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar, faQuoteLeft } from '@fortawesome/free-solid-svg-icons';

const Home = () => {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [qIndex, setQIndex] = useState(0);

  // 1. Cargar Quotes de la BD
  useEffect(() => {
    const fetchQuotes = async () => {
      const { data } = await supabase.from('testimonios').select('*').order('orden', { ascending: true });
      if (data && data.length > 0) setQuotes(data);
    };
    fetchQuotes();
  }, []);

  // 2. Rotación Automática (Solo si hay quotes cargados)
  useEffect(() => {
    if (quotes.length === 0) return;
    
    const interval = setInterval(() => {
      setQIndex((prev) => (prev + 1) % quotes.length);
    }, 7000); // 7 segundos exactos

    return () => clearInterval(interval);
  }, [quotes]);

  return (
    <div className='min-h-screen bg-nardo-950 text-white'>
      <section className='h-screen relative flex items-center justify-center overflow-hidden'>
        <div className='absolute inset-0 z-0'>
           <img src="/backgroundHero.gif" onError={(e) => e.currentTarget.src='https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=2070'} className='w-full h-full object-cover opacity-30 grayscale' />
           <div className='absolute inset-0 bg-gradient-to-t from-nardo-950 via-nardo-950/20 to-black/90'></div>
        </div>
        
        <div className='relative z-10 text-center px-4 w-full'>
          <h1 className='text-6xl md:text-9xl font-serif font-bold mb-4 tracking-tighter drop-shadow-[0_0_20px_rgba(255,255,255,0.2)] animate-fade-in'>
            LEONARDO <span className='text-transparent bg-clip-text bg-gradient-to-r from-nardo-500 to-purple-800'>GUZMAN</span>
          </h1>
          
          {/* Quotes Carousel Dinámico */}
          <div className='mt-16 h-32 relative max-w-3xl mx-auto'>
             {quotes.length > 0 && (
               <div className='absolute inset-0 flex items-center justify-center transition-opacity duration-1000'>
                 <div className='bg-black/60 backdrop-blur border border-nardo-500/30 p-6 rounded-2xl flex items-center gap-6 shadow-[0_0_30px_rgba(157,78,221,0.15)] hover:border-nardo-500 transition-all'>
                    <div className='relative shrink-0'>
                       <img 
                         src={quotes[qIndex].imagen_url} 
                         alt={quotes[qIndex].autor}
                         className='w-20 h-20 rounded-full border-2 border-nardo-500 object-cover'
                       />
                       <div className='absolute -bottom-2 -right-2 bg-nardo-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full'>
                         <FontAwesomeIcon icon={faStar} />
                       </div>
                    </div>
                    <div className='text-left'>
                       <FontAwesomeIcon icon={faQuoteLeft} className='text-nardo-500/50 text-xl mb-2' />
                       <p className='text-lg italic text-gray-200 leading-snug mb-2'>"{quotes[qIndex].texto}"</p>
                       <p className='text-xs font-bold text-nardo-400 uppercase tracking-[0.2em]'>— {quotes[qIndex].autor}</p>
                    </div>
                 </div>
               </div>
             )}
             {quotes.length === 0 && <p className='text-gray-500 animate-pulse'>Cargando testimonios...</p>}
          </div>
        </div>
      </section>

      <MusicPlayer />
      
      <section id='tour' className='bg-nardo-950 py-20'>
         <GigsWidget />
      </section>
    </div>
  );
};
export default Home;