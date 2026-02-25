import { useContext, useEffect } from 'react';
import GigsWidget from '../components/GigsWidget';
import SpaceBackground from '../components/SpaceBackground';
import { useLanguage } from '../context/LanguageContext';
import { ThemeContext } from '../context/ThemeContext';

const Conciertos = () => {
  const { t } = useLanguage();
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'purple';

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // --- ESTILOS DINÁMICOS ---
  const widgetContainerStyle = isDark 
    ? 'bg-[#120b18]/40 backdrop-blur-md border border-white/10 shadow-[0_0_50px_rgba(147,51,234,0.1)]' // <-- Más transparencia (/40) y menos blur
    : 'bg-[#e0e5ec] border border-white/60 shadow-[20px_20px_60px_#bebebe,-20px_-20px_60px_#ffffff]';

  const textPrimary = isDark ? 'text-white' : 'text-gray-800';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className={`min-h-screen relative font-sans pb-32 transition-colors duration-500 overflow-hidden ${isDark ? 'bg-[#050505]' : 'bg-[#e0e5ec]'}`}>
      
      {/* FONDO DE ESTRELLAS */}
      {isDark && (
          <div className="fixed inset-0 z-0">
              <SpaceBackground />
          </div>
      )}

      {/* HEADER */}
      <div className="relative pt-36 pb-12 text-center z-10 px-4">
          <h1 className={`text-6xl md:text-8xl font-espacial tracking-tighter uppercase mb-6 ${textPrimary} drop-shadow-2xl`}>
              TOUR <span className={`text-transparent bg-clip-text bg-gradient-to-r ${isDark ? 'from-purple-400 to-pink-500' : 'from-purple-600 to-purple-800'}`}>{t('tour_dates_highlight')}</span>
          </h1>
          
          <div className="flex flex-col items-center gap-4">
              <div className={`h-1 w-24 rounded-full ${isDark ? 'bg-purple-600 shadow-[0_0_15px_#9333ea]' : 'bg-purple-500'}`}></div>
              <p className={`text-xs md:text-sm font-bold uppercase tracking-[0.3em] max-w-2xl mx-auto leading-relaxed ${textSecondary}`}>
                  {t('tour_subtitle')}
              </p>
          </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 relative z-10">
          
          {/* TARJETA DEL WIDGET */}
          <div className={`rounded-[3rem] overflow-hidden p-6 md:p-10 transition-all duration-500 ${widgetContainerStyle}`}>
              <div className="min-h-[400px] w-full relative">
                  <GigsWidget />
              </div>
          </div>
      </div>

    </div>
  );
};

export default Conciertos;