import { useState, useEffect, useContext } from 'react';
import pb from '../lib/pocketbase'; 
import MusicPlayer from './MusicPlayer';
import Aliados from './Aliados'; 
import HomeStorePreview from './HomeStorePreview'; 
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar, faQuoteLeft, faTimes, faCog, faArrowsAlt, faLayerGroup, faFont } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../context/LanguageContext';
import { ThemeContext } from '../context/ThemeContext';

interface Quote {
  id: string; autor: string; texto: string; texto_en: string; imagen_url: string; orden: number;
}

const Hero = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const { lang } = useLanguage();
  const { theme } = useContext(ThemeContext);

  // --- CONTROLADORES MAESTROS (WIX AVANZADO) ---
  const [devMode, setDevMode] = useState(false);
  
  // 1. CONTENEDOR GENERAL
  const [contHeight, setContHeight] = useState(350); 

  // 2. BACK SECTION (FONDO)
  const [bsScale, setBsScale] = useState(200); // Default 200%
  const [bsX, setBsX] = useState(0);
  const [bsY, setBsY] = useState(0);

  // 3. PICO ARRIBA
  const [spikeTopScale, setSpikeTopScale] = useState(200);
  const [spikeTopX, setSpikeTopX] = useState(0);
  const [spikeTopY, setSpikeTopY] = useState(-50);

  // 4. PICO ABAJO
  const [spikeBotScale, setSpikeBotScale] = useState(200);
  const [spikeBotX, setSpikeBotX] = useState(0);
  const [spikeBotY, setSpikeBotY] = useState(50);

  // 5. TEXTO TÍTULO
  const [textY, setTextY] = useState(0);
  const [textScale, setTextScale] = useState(1);

  const accentColor = theme === 'purple' ? '#9d4edd' : '#9ca3af';

  useEffect(() => {
    const fetchQuotes = async () => {
      try {
        const records = await pb.collection('testimonios').getFullList({ sort: 'orden' });
        const formattedQuotes = records.map((record: any) => ({
            id: record.id, autor: record.autor, texto: record.texto, texto_en: record.texto_en,
            imagen_url: record.imagen_url || pb.files.getUrl(record, record.imagen), orden: record.orden
        }));
        if (formattedQuotes.length > 0) setQuotes(formattedQuotes);
      } catch (error) { console.error(error); }
    };
    fetchQuotes();
  }, []);

  useEffect(() => {
    if (quotes.length === 0) return;
    const interval = setInterval(() => setQIndex((prev) => (prev + 1) % quotes.length), 7000);
    return () => clearInterval(interval);
  }, [quotes]);

  const currentQuote = quotes[qIndex];
  const displayText = currentQuote ? (lang === 'EN' && currentQuote.texto_en ? currentQuote.texto_en : currentQuote.texto) : '';

  return (
    <div className='min-h-screen bg-transparent relative'>
      
      {/* BOTÓN FLOTANTE */}
      <button onClick={() => setDevMode(!devMode)} className="fixed top-24 right-4 z-50 bg-yellow-600 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-all border border-yellow-400">
        <FontAwesomeIcon icon={faCog} spin={devMode} />
      </button>

      {/* PANEL DE CONTROL COMPLETO */}
      {devMode && (
        <div className="fixed top-36 right-4 z-50 bg-[#0a0a0a] border-2 border-yellow-500 p-3 rounded-xl shadow-[0_0_40px_rgba(234,179,8,0.3)] w-80 max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4 border-b border-yellow-800 pb-2">
            <h3 className="font-bold text-yellow-400 text-[10px] uppercase">🎛️ Editor Sección Tienda</h3>
            <button onClick={() => setDevMode(false)} className="text-gray-500 hover:text-white"><FontAwesomeIcon icon={faTimes} /></button>
          </div>
          
          <div className="space-y-4">
            {/* Contenedor */}
            <div className="bg-white/5 p-2 rounded">
               <label className="text-[9px] text-gray-400">Altura Contenedor Invisible ({contHeight}px)</label>
               <input type="range" min="100" max="800" value={contHeight} onChange={(e) => setContHeight(Number(e.target.value))} className="w-full accent-gray-500" />
            </div>

            {/* Texto */}
            <div className="bg-white/5 p-2 rounded border-l-2 border-white">
               <h4 className="text-[9px] font-bold text-white mb-1"><FontAwesomeIcon icon={faFont} /> Texto Título</h4>
               <div className="flex gap-2">
                 <input type="range" min="-200" max="200" value={textY} onChange={(e) => setTextY(Number(e.target.value))} className="w-1/2 accent-white" title="Y" />
                 <input type="range" min="0.5" max="3" step="0.1" value={textScale} onChange={(e) => setTextScale(Number(e.target.value))} className="w-1/2 accent-white" title="Scale" />
               </div>
            </div>

            {/* BackSection */}
            <div className="bg-purple-900/20 p-2 rounded border-l-2 border-purple-500">
               <h4 className="text-[9px] font-bold text-purple-400 mb-1"><FontAwesomeIcon icon={faLayerGroup} /> Fondo Violeta</h4>
               <div className="grid grid-cols-2 gap-2">
                 <input type="range" min="50" max="400" value={bsScale} onChange={(e) => setBsScale(Number(e.target.value))} className="accent-purple-500" title="Scale" />
                 <input type="range" min="-300" max="300" value={bsY} onChange={(e) => setBsY(Number(e.target.value))} className="accent-purple-500" title="Y" />
                 <input type="range" min="-300" max="300" value={bsX} onChange={(e) => setBsX(Number(e.target.value))} className="accent-purple-500 col-span-2" title="X" />
               </div>
            </div>

            {/* Pico Arriba */}
            <div className="bg-blue-900/20 p-2 rounded border-l-2 border-blue-500">
               <h4 className="text-[9px] font-bold text-blue-400 mb-1"><FontAwesomeIcon icon={faArrowsAlt} /> Pico Arriba</h4>
               <div className="grid grid-cols-2 gap-2">
                 <input type="range" min="50" max="400" value={spikeTopScale} onChange={(e) => setSpikeTopScale(Number(e.target.value))} className="accent-blue-500" title="Scale" />
                 <input type="range" min="-300" max="300" value={spikeTopY} onChange={(e) => setSpikeTopY(Number(e.target.value))} className="accent-blue-500" title="Y" />
                 <input type="range" min="-300" max="300" value={spikeTopX} onChange={(e) => setSpikeTopX(Number(e.target.value))} className="accent-blue-500 col-span-2" title="X" />
               </div>
            </div>

            {/* Pico Abajo */}
            <div className="bg-red-900/20 p-2 rounded border-l-2 border-red-500">
               <h4 className="text-[9px] font-bold text-red-400 mb-1"><FontAwesomeIcon icon={faArrowsAlt} /> Pico Abajo</h4>
               <div className="grid grid-cols-2 gap-2">
                 <input type="range" min="50" max="400" value={spikeBotScale} onChange={(e) => setSpikeBotScale(Number(e.target.value))} className="accent-red-500" title="Scale" />
                 <input type="range" min="-300" max="300" value={spikeBotY} onChange={(e) => setSpikeBotY(Number(e.target.value))} className="accent-red-500" title="Y" />
                 <input type="range" min="-300" max="300" value={spikeBotX} onChange={(e) => setSpikeBotX(Number(e.target.value))} className="accent-red-500 col-span-2" title="X" />
               </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&display=swap');
        .font-espacial { font-family: 'Orbitron', sans-serif; }

        .cosmic-text {
          background: linear-gradient(to right, #fff 20%, #d946ef 30%, #7c3aed 50%, #d946ef 70%, #fff 80%);
          background-size: 200% auto;
          color: #000;
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: cosmic-shine 4s linear infinite;
          text-shadow: 0 0 20px rgba(217,70,239,0.3);
        }

        html.tema-oscuro .cosmic-text {
          background: linear-gradient(to right, #374151 20%, #9ca3af 40%, #d1d5db 50%, #9ca3af 60%, #374151 80%);
          background-size: 200% auto;
          color: rgba(0,0,0,0.8);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: cosmic-shine 5s linear infinite;
          text-shadow: 0 0 10px rgba(0,0,0,0.1);
        }

        @keyframes cosmic-shine { to { background-position: 200% center; } }

        /* =======================================================
           ESTRUCTURA DE CAPAS ABSOLUTAS
           ======================================================= */
        .store-header-container {
          position: relative;
          width: 100%;
          height: ${contHeight}px; /* Altura controlable */
          display: flex;
          justify-content: center;
          align-items: center;
          margin-bottom: 2rem;
          overflow: visible; /* Permitir que los elementos se salgan */
        }

        .layer-backsection {
          position: absolute;
          top: 50%; left: 50%;
          width: 100%; height: 100%;
          transform: translate(-50%, -50%) translate(${bsX}px, ${bsY}px) scale(${bsScale / 100});
          background-image: url('/backSection.png');
          background-position: center;
          background-repeat: no-repeat;
          background-size: contain; 
          z-index: 1;
        }

        .layer-spike-top {
          position: absolute;
          top: 50%; left: 50%;
          width: 100%; height: 100px; /* Altura base para que tenga cuerpo */
          transform: translate(-50%, -50%) translate(${spikeTopX}px, ${spikeTopY}px) scale(${spikeTopScale / 100});
          background-image: url('/picos-section-top.png');
          background-position: center;
          background-repeat: no-repeat;
          background-size: contain;
          z-index: 5;
        }

        .layer-spike-bottom {
          position: absolute;
          top: 50%; left: 50%;
          width: 100%; height: 100px;
          transform: translate(-50%, -50%) translate(${spikeBotX}px, ${spikeBotY}px) scale(${spikeBotScale / 100});
          background-image: url('/picos-section-buttom.png');
          background-position: center;
          background-repeat: no-repeat;
          background-size: contain;
          z-index: 5;
        }

        .layer-title-text {
          position: relative;
          z-index: 10;
          transform: translateY(${textY}px) scale(${textScale});
        }

        html.tema-oscuro .layer-backsection,
        html.tema-oscuro .layer-spike-top,
        html.tema-oscuro .layer-spike-bottom {
          filter: grayscale(100%) brightness(1.2);
        }
      `}</style>

      <section className='min-h-screen relative flex items-center justify-center overflow-hidden pt-28 pb-12 lg:pt-0 lg:pb-0'>
        <div className='relative z-10 w-full max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center mt-12'>
          <div className='flex flex-col items-center lg:items-start text-center lg:text-left'>
            <div className="mb-2 w-64 md:w-96 transition-all duration-700 hover:scale-105">
              <img src="/logo-nardo.svg" alt="LEONARDO GUZMAN" className="w-full h-full object-contain brightness-0 invert drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]" />
            </div>
            
            <h2 className='text-3xl md:text-5xl font-black tracking-[0.4em] mb-12 uppercase cosmic-text pl-4 font-espacial'>
              MÚSICO
            </h2>
            
            <div className='h-40 relative w-full max-w-xl'>
               {quotes.length > 0 && currentQuote && (
                 <div className='absolute inset-0 flex items-center justify-start transition-opacity duration-1000'>
                   <div className='bg-black/20 backdrop-blur-md border border-white/10 p-6 rounded-2xl flex flex-col sm:flex-row items-center sm:items-start gap-4 transition-all w-full shadow-2xl'>
                     <div className='relative shrink-0'>
                        <img src={currentQuote.imagen_url} alt={currentQuote.autor} className='w-16 h-16 rounded-full border-2 object-cover transition-colors' style={{ borderColor: accentColor }} />
                        <div className='absolute -bottom-1 -right-1 text-black text-[8px] font-bold px-1.5 py-0.5 rounded-full transition-colors' style={{ backgroundColor: accentColor }}><FontAwesomeIcon icon={faStar} /></div>
                     </div>
                     <div className='text-center sm:text-left flex-1'>
                        <FontAwesomeIcon icon={faQuoteLeft} className='text-sm mb-1 transition-colors' style={{ color: accentColor, opacity: 0.5 }} />
                        <p className='text-sm md:text-base italic text-gray-200 leading-snug mb-2'>"{displayText}"</p>
                        <p className='text-[10px] font-bold uppercase tracking-[0.2em] transition-colors' style={{ color: accentColor }}>— {currentQuote.autor}</p>
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
      <section className="relative py-12 mt-12 mb-12">
        <div className="max-w-7xl mx-auto px-4 relative z-20">
           
           <div className="store-header-container">
              <div className="layer-backsection"></div>
              <div className="layer-spike-top"></div>
              <div className="layer-spike-bottom"></div>
              
              <h3 className="layer-title-text text-3xl md:text-5xl font-black uppercase tracking-widest text-center text-white drop-shadow-[0_0_15px_rgba(217,70,239,0.5)] font-espacial">
                 Tienda Oficial
              </h3>
           </div>

           <HomeStorePreview />
        </div>
      </section>
    </div>
  );
};
export default Hero;