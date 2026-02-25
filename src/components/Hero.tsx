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
  const { lang, t } = useLanguage(); // Usamos 't'
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
    <div className='min-h-screen relative overflow-x-hidden pb-20'>
      
      <SpaceBackground />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&display=swap');
        .font-espacial { font-family: 'Orbitron', sans-serif; }

        :root {
            --cont-h-mobile: 200px;        
            --cont-w-mobile: 100%;          
            --bs-scale-m: 100; --bs-x-m: 0px; --bs-y-m: 0px;  
            --spk-h-m: 40px; --spk-top-y-m: -20px; --spk-bot-y-m: 20px;           
            --txt-y-m: 0px; --txt-scale-m: 0.6;            
        }

        @media (min-width: 1024px) {
            :root {
                --cont-h-desktop: 300px;       
                --cont-w-desktop: 100%;       
                --bs-scale-d: 333; --bs-x-d: 6px; --bs-y-d: 128px;
                --spk-top-h-d: 520px;   
                --spk-top-x-d: -485px;  
                --spk-top-y-d: -299px;  
                --spk-bot-h-d: 520px;   
                --spk-bot-x-d: -500px;  
                --spk-bot-y-d: -270px;  
                --txt-y-d: -193px;      
                --txt-scale-d: 1.0; 
            }
        }

        .store-header-container {
            position: relative;
            margin: 2rem auto 0 auto; 
            display: flex;
            justify-content: center;
            align-items: center;
            overflow: visible; 
            width: var(--cont-w-mobile);
            height: var(--cont-h-mobile);
            pointer-events: none; 
        }

        .layer-backsection {
            position: absolute; top: 50%; left: 50%; 
            width: 100%; height: 100%; 
            background-image: url('/backSection.png'); 
            background-position: center; 
            background-repeat: no-repeat; 
            background-size: 100% 100%; 
            z-index: 1;
            transform: translate(-50%, -50%) translate(var(--bs-x-m), var(--bs-y-m)) scale(calc(var(--bs-scale-m) / 100));
            pointer-events: none;
        }

        .layer-spike-top {
            position: absolute; top: 50%; left: 0; 
            width: 100%;
            background-image: url('/picos-section-top.png'); 
            background-position: bottom center; 
            background-repeat: repeat-x; 
            background-size: auto 100%; 
            z-index: 5;
            height: var(--spk-h-m);
            transform: translateY(calc(-50% + var(--spk-top-y-m)));
            pointer-events: none;
        }

        .layer-spike-bottom {
            position: absolute; top: 50%; left: 0; 
            width: 100%; 
            background-image: url('/picos-section-buttom.png'); 
            background-position: top center; 
            background-repeat: repeat-x; 
            background-size: auto 100%;
            z-index: 5;
            height: var(--spk-h-m);
            transform: translateY(calc(-50% + var(--spk-bot-y-m)));
            pointer-events: none;
        }

        .layer-title-text {
            position: relative; z-index: 10; text-align: center;
            transform: translateY(var(--txt-y-m)) scale(var(--txt-scale-m));
        }

        @media (min-width: 1024px) {
            .store-header-container {
                width: var(--cont-w-desktop);
                height: var(--cont-h-desktop);
                margin-top: 100px;    
                margin-bottom: -150px; 
            }
            .layer-backsection {
                width: 100vw; 
                left: 50%; margin-left: -50vw;
                transform: translate(0, -50%) translate(var(--bs-x-d), var(--bs-y-d)) scale(calc(var(--bs-scale-d) / 100));
            }
            .layer-spike-top {
                height: var(--spk-top-h-d); 
                transform: translateY(var(--spk-top-y-d));
                background-position-x: var(--spk-top-x-d);
            }
            .layer-spike-bottom {
                height: var(--spk-bot-h-d);
                transform: translateY(var(--spk-bot-y-d));
                background-position-x: var(--spk-bot-x-d);
            }
            .layer-title-text {
                transform: translateY(var(--txt-y-d)) scale(var(--txt-scale-d));
            }
        }

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

        html.tema-oscuro .layer-backsection,
        html.tema-oscuro .layer-spike-top,
        html.tema-oscuro .layer-spike-bottom {
          filter: grayscale(100%) brightness(1.2);
        }
      `}</style>

      <section className='relative pt-32 pb-12 flex flex-col items-center justify-center text-center px-4'>
          <div className='w-full max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center'>
            <div className='flex flex-col items-center lg:items-start text-center lg:text-left'>
                <div className="mb-2 w-64 md:w-96 transition-transform hover:scale-105">
                   <img src="/logo-nardo.svg" alt="LEONARDO GUZMAN" className={`w-full ${theme === 'purple' ? 'brightness-0 invert' : 'brightness-0'}`} />
                </div>
                
                <h2 className='text-4xl md:text-6xl font-black tracking-[0.4em] uppercase cosmic-text pl-4 font-espacial mb-8'>
                  {t('musician')}
                </h2>

                <div className='h-32 relative w-full max-w-xl'>
                   {quotes.length > 0 && currentQuote && (
                     <div className='absolute inset-0 flex items-center justify-start transition-opacity duration-1000'>
                       <div className='bg-black/20 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex flex-row items-center gap-4 text-left w-full shadow-2xl'>
                         <img src={currentQuote.imagen_url} alt={currentQuote.autor} className='w-12 h-12 rounded-full border-2 object-cover' style={{ borderColor: accentColor }} />
                         <div>
                            <p className='text-xs italic text-gray-200'>"{displayText}"</p>
                            <p className='text-[9px] font-bold uppercase tracking-widest mt-1' style={{ color: accentColor }}>— {currentQuote.autor}</p>
                         </div>
                       </div>
                     </div>
                   )}
                </div>
            </div>

            <div className='flex justify-center lg:justify-end w-full'>
               <MusicPlayer />
            </div>
          </div>
      </section>
      
      <Aliados />

      {/* SECCIÓN TIENDA */}
      <section className="relative py-12 mt-12 mb-12 w-full overflow-visible">
        <div className="w-full relative z-20">
           
           <div className="store-header-container">
              <div className="layer-backsection"></div>
              <div className="layer-spike-top"></div>
              <div className="layer-spike-bottom"></div>
              
              {/* USO DE LA LLAVE 'official_store' (TIENDA OFICIAL / OFFICIAL STORE) */}
              <h3 className="layer-title-text text-3xl md:text-5xl font-black uppercase tracking-widest text-center text-white drop-shadow-[0_0_15px_rgba(217,70,239,0.5)] font-espacial">
                 {t('official_store')}
              </h3>
           </div>

           <div className="max-w-[1400px] mx-auto px-4 relative z-30">
              <HomeStorePreview />
           </div>
        </div>
      </section>
    </div>
  );
};
export default Hero;