import { useState, useEffect } from 'react';
import pb from '../lib/pocketbase'; 
import GigsWidget from './GigsWidget'; 
import MusicPlayer from './MusicPlayer';
import Aliados from './Aliados'; 
import HomeStorePreview from './HomeStorePreview'; // <--- IMPORTAMOS EL PREVIEW DE TIENDA
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar, faQuoteLeft } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../context/LanguageContext';

interface Quote {
  id: string;
  autor: string;
  texto: string;
  texto_en: string; 
  imagen_url: string; 
  orden: number;
}

const Hero = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [qIndex, setQIndex] = useState(0);

  const { lang } = useLanguage();

  useEffect(() => {
    const fetchQuotes = async () => {
      try {
        const records = await pb.collection('testimonios').getFullList({
          sort: 'orden',
        });
        
        const formattedQuotes = records.map((record: any) => ({
            id: record.id,
            autor: record.autor,
            texto: record.texto,
            texto_en: record.texto_en,
            imagen_url: record.imagen_url || pb.files.getUrl(record, record.imagen), 
            orden: record.orden
        }));

        if (formattedQuotes.length > 0) setQuotes(formattedQuotes);
      } catch (error) {
        console.error("Error cargando testimonios:", error);
      }
    };
    fetchQuotes();
  }, []);

  useEffect(() => {
    if (quotes.length === 0) return;
    const interval = setInterval(() => {
      setQIndex((prev) => (prev + 1) % quotes.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [quotes]);

  const currentQuote = quotes[qIndex];
  
  const displayText = currentQuote 
    ? (lang === 'EN' && currentQuote.texto_en ? currentQuote.texto_en : currentQuote.texto) 
    : '';

  return (
    <div className='min-h-screen bg-nardo-950 text-white'>
      
      {/* 1. SECCIÓN PRINCIPAL (HERO + TESTIMONIOS) */}
      <section className='h-screen relative flex items-center justify-center overflow-hidden'>
        
        <div className='absolute inset-0 z-0'>
           <img 
             src="/backgroundHero.gif" 
             onError={(e) => e.currentTarget.src='https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=2070'} 
             className='w-full h-full object-cover opacity-30 grayscale' 
             alt="Background"
           />
           <div className='absolute inset-0 bg-gradient-to-t from-nardo-950 via-nardo-950/20 to-black/90'></div>
        </div>
        
        <div className='relative z-10 text-center px-4 w-full flex flex-col items-center'>
          
          <div className="mb-8 w-64 md:w-[30rem] lg:w-[40rem] transition-all duration-700 hover:scale-105">
            <img 
                src="/logo-nardo.svg" 
                alt="LEONARDO GUZMAN" 
                className="w-full h-full object-contain brightness-0 invert drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]"
            />
          </div>
          
          <div className='mt-8 h-32 relative max-w-3xl w-full mx-auto'>
             {quotes.length > 0 && currentQuote && (
               <div className='absolute inset-0 flex items-center justify-center transition-opacity duration-1000'>
                 <div className='bg-black/60 backdrop-blur border border-nardo-500/30 p-6 rounded-2xl flex items-center gap-6 shadow-[0_0_30px_rgba(157,78,221,0.15)] hover:border-nardo-500 transition-all w-full max-w-2xl'>
                   
                   <div className='relative shrink-0'>
                      <img 
                        src={currentQuote.imagen_url} 
                        alt={currentQuote.autor}
                        className='w-20 h-20 rounded-full border-2 border-nardo-500 object-cover'
                      />
                      <div className='absolute -bottom-2 -right-2 bg-nardo-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full'>
                        <FontAwesomeIcon icon={faStar} />
                      </div>
                   </div>
                   
                   <div className='text-left'>
                      <FontAwesomeIcon icon={faQuoteLeft} className='text-nardo-500/50 text-xl mb-2' />
                      <p className='text-lg italic text-gray-200 leading-snug mb-2'>"{displayText}"</p>
                      <p className='text-xs font-bold text-nardo-400 uppercase tracking-[0.2em]'>— {currentQuote.autor}</p>
                   </div>

                 </div>
               </div>
             )}
             {quotes.length === 0 && <p className='text-gray-500 animate-pulse text-sm tracking-widest'>CARGANDO TESTIMONIOS...</p>}
          </div>
        </div>
      </section>

      {/* 2. REPRODUCTOR DE MÚSICA */}
      <MusicPlayer />
      
      {/* 3. ALIADOS (Sponsors) */}
      <Aliados />

      {/* 4. PREVIEW DE TIENDA (Nuevo) */}
      <HomeStorePreview />
      
      {/* 5. GIGS (Conciertos) */}
      <section id='tour' className='bg-nardo-950 py-12 border-t border-nardo-900/30'>
         <GigsWidget />
      </section>
    </div>
  );
};

export default Hero;