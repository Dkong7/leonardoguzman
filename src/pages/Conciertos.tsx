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

  // --- DISEÑO SOBRIO (FASE 2) ---
  // Se elimina el blur y se cambia a un fondo sólido mate.
  const widgetContainerStyle = isDark 
    ? 'bg-[#0a0a0a] border border-[#222222] shadow-2xl' 
    : 'bg-[#f4f4f5] border border-gray-200 shadow-xl';

  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-500' : 'text-gray-600';

  return (
    <div className={`min-h-screen relative font-sans pb-32 transition-colors duration-500 overflow-hidden ${isDark ? 'bg-[#000000]' : 'bg-[#e0e5ec]'}`}>
      
      {/* FONDO DE ESTRELLAS */}
      {isDark && (
          <div className="fixed inset-0 z-0">
              <SpaceBackground />
          </div>
      )}

      {/* HEADER */}
      <div className="relative pt-36 pb-12 text-center z-10 px-4">
          <h1 className={`text-6xl md:text-8xl font-espacial tracking-tighter uppercase mb-6 ${textPrimary} drop-shadow-2xl`}>
              TOUR <span className={`text-transparent bg-clip-text bg-gradient-to-r ${isDark ? 'from-purple-500 to-purple-700' : 'from-purple-600 to-purple-800'}`}>{t('tour_dates_highlight')}</span>
          </h1>
          
          <div className="flex flex-col items-center gap-4">
              <div className={`h-1 w-24 rounded-full ${isDark ? 'bg-purple-700' : 'bg-purple-500'}`}></div>
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