import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';

const Footer = () => {
  const { t } = useLanguage();
  const [showGlitch, setShowGlitch] = useState(false);

  useEffect(() => {
    // Activar el efecto cada 8 segundos (antes 20)
    const interval = setInterval(() => {
      setShowGlitch(true);
      
      // Desactivar después de 0.5 segundos
      setTimeout(() => {
        setShowGlitch(false);
      }, 500);
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  // Generamos una secuencia de parpadeo ultra rápida
  // Alternamos entre 0 (invisible) y 1 (visible) muchas veces
  const flickerSequence = [
    0, 1, 0, 1, 0, 1, 0.2, 1, 0, 1, 0.5, 1, 0, 1, 0, 1, 0, 1, 0.8, 0, 1, 0
  ];

  return (
    <footer className="bg-black py-12 border-t border-nardo-900 relative mt-auto">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <div className="flex flex-col justify-center items-center gap-4">
          
          <div className="text-gray-400 text-[10px] tracking-[0.3em] uppercase">
             {t('copyright')}
          </div>
          
          <a href="https://www.thisiswillowtree.com" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-nardo-500 text-[6px] font-bold tracking-widest transition-colors flex items-center gap-1">
              {t('developed_by')} <span className="font-serif italic text-white text-[8px]">D</span>
          </a>
        </div>
      </div>
      
      {/* Triángulo Rojo con efecto Flicker EXTREMO */}
      <AnimatePresence>
        {showGlitch && (
          <motion.a 
            href="https://www.tiktok.com/@desmontandovisajes" 
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0 }}
            // La secuencia se reproduce completa en 0.5s
            animate={{ opacity: flickerSequence }} 
            exit={{ opacity: 0 }}
            // step-end hace que el cambio sea instantáneo (sin suavizado), más robótico/glitch
            transition={{ duration: 0.5, ease: "linear" }}
            className="absolute bottom-6 right-6 w-0 h-0 border-l-[20px] border-l-transparent border-b-[20px] border-b-red-900 hover:border-b-red-600 cursor-pointer z-50" 
            title="?"
          />
        )}
      </AnimatePresence>
    </footer>
  );
};

export default Footer;