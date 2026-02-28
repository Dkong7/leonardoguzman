import { useState, useEffect, useContext } from 'react';
import pb from '../lib/pocketbase'; 
import MusicPlayer from './MusicPlayer'; 
import Aliados from './Aliados'; 
import HomeStorePreview from './HomeStorePreview'; 
import SpaceBackground from './SpaceBackground';
import { useLanguage } from '../context/LanguageContext';
import { ThemeContext } from '../context/ThemeContext';

interface Quote {
  id: string; autor: string; texto: string; texto_en: string; imagen_url: string; orden: number;
}

const Hero = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const { lang, t } = useLanguage(); 
  const { theme } = useContext(ThemeContext);
  const accentColor = theme === 'purple' ? '#9d4edd' : '#9ca3af';

  useEffect(() => {
    let mounted = true;
    const fetchQuotes = async () => {
      try {
        const records = await pb.collection('testimonios').getFullList({ sort: 'orden' });
        if (mounted && records.length > 0) {
            const formatted = records.map((r: any) => ({
                id: r.id, autor: r.autor, texto: r.texto, texto_en: r.texto_en,
                imagen_url: r.imagen_url || pb.files.getUrl(r, r.imagen), orden: r.orden
            }));
            setQuotes(formatted);
        }
      } catch (e) { console.log("Quotes:", e); }
    };
    fetchQuotes();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (quotes.length === 0) return;
    const interval = setInterval(() => setQIndex((prev) => (prev + 1) % quotes.length), 8000);
    return () => clearInterval(interval);
  }, [quotes]);

  const currentQuote = quotes[qIndex];
  const displayText = currentQuote ? (lang === 'EN' && currentQuote.texto_en ? currentQuote.texto_en : currentQuote.texto) : '';

  return (
    // FONDO TRANSPARENTE EN DARK MODE PARA VER EL ESPACIO
    <div className={`min-h-screen relative overflow-x-hidden pb-20 transition-colors duration-500 ${theme === 'purple' ? 'bg-transparent' : 'bg-[#e0e5ec]'}`}>
      
      {theme === 'purple' && <div className="fixed inset-0 z-[-2] bg-[#05000a]"></div>}
      {theme === 'purple' && <SpaceBackground />}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&display=swap');
        .font-espacial { font-family: 'Orbitron', sans-serif; }

        .cosmic-text {
          background: linear-gradient(to right, #fff 20%, #d946ef 30%, #7c3aed 50%, #d946ef 70%, #fff 80%);
          background-size: 200% auto; color: #000;
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          animation: cosmic-shine 8s linear infinite; text-shadow: 0 0 20px rgba(217,70,239,0.3);
        }
        
        html.tema-oscuro .cosmic-text {
          background: linear-gradient(to right, #374151 20%, #9ca3af 40%, #d1d5db 50%, #9ca3af 60%, #374151 80%);
          background-size: 200% auto; color: rgba(0,0,0,0.8);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          animation: cosmic-shine 5s linear infinite; text-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        
        @keyframes cosmic-shine { to { background-position: 200% center; } }
      `}</style>

      {/* HERO SECTION */}
      <section className='relative pt-32 md:pt-40 pb-12 flex flex-col items-center justify-center px-4 md:px-8 lg:min-h-screen z-10'>
          <div className='w-full max-w-[1600px] grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center'>
            
            {/* IZQUIERDA: LOGO, TÍTULO Y QUOTES */}
            <div className='flex flex-col items-center lg:items-start text-center lg:text-left space-y-6'>
                {/* 1. LOGO AUMENTADO DE TAMAÑO */}
                <div className="w-80 md:w-96 lg:w-[600px] transition-transform hover:scale-105">
                   <img src="/logo-nardo.svg" alt="LEONARDO GUZMAN" className={`w-full ${theme === 'purple' ? 'brightness-0 invert' : 'brightness-0 opacity-80'}`} />
                </div>
                
                {/* 2. TÍTULO REDUCIDO DE TAMAÑO */}
                <h2 className='text-lg md:text-xl lg:text-2xl font-black tracking-[0.4em] uppercase cosmic-text font-espacial lg:pl-2'>
                  {lang === 'EN' ? 'MUSICIAN – EDUCATOR' : 'MÚSICO – DOCENTE'}
                </h2>

                <div className='h-32 w-full max-w-xl relative mt-8'>
                   {quotes.length > 0 && currentQuote && (
                     <div className='absolute inset-0 flex items-center justify-center lg:justify-start transition-opacity duration-1000'>
                       {/* 3. CAJA DE QUOTES MUY TRANSPARENTE */}
                       <div className={`p-4 rounded-2xl flex flex-row items-center gap-4 text-left w-full shadow-lg transition-all duration-500
                          ${theme === 'purple' 
                              ? 'bg-black/10 backdrop-blur-sm border border-white/5' 
                              : 'bg-white/50 backdrop-blur-md border border-gray-200'
                          }
                       `}>
                         <img src={currentQuote.imagen_url} alt={currentQuote.autor} className='w-12 h-12 rounded-full border-2 object-cover shrink-0' style={{ borderColor: accentColor }} />
                         <div>
                            <p className={`text-xs italic leading-relaxed ${theme === 'purple' ? 'text-gray-300' : 'text-gray-700'}`}>"{displayText}"</p>
                            <p className='text-[9px] font-bold uppercase tracking-widest mt-1' style={{ color: accentColor }}>— {currentQuote.autor}</p>
                         </div>
                       </div>
                     </div>
                   )}
                </div>
            </div>

            {/* DERECHA: REPRODUCTOR */}
            <div className='flex justify-center lg:justify-end w-full'>
               <MusicPlayer />
            </div>

          </div>
      </section>
      
      <div className="relative z-10">
          <Aliados />
      </div>

      {/* SECCIÓN TIENDA OFICIAL */}
      <section className="relative py-24 w-full border-t border-white/5 z-10 bg-black/40 backdrop-blur-md">
        <div className="w-full relative z-20">
           <h3 className={`text-3xl md:text-5xl font-black uppercase tracking-widest text-center font-espacial mb-16
              ${theme === 'purple' ? 'text-white drop-shadow-[0_0_15px_rgba(217,70,239,0.5)]' : 'text-gray-900 drop-shadow-md'}
           `}>
              {t('official_store')}
           </h3>

           <div className="max-w-[1400px] mx-auto px-4 relative z-30">
              <HomeStorePreview />
           </div>
        </div>
      </section>
    </div>
  );
};
export default Hero;