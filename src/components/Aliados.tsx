import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';

const logos = [
  '/aliados1.avif', 
  '/aliados2.avif',
  '/aliados3.avif', 
  '/aliados4.avif', 
];

const Aliados = () => {
  const { t } = useLanguage();

  return (
    <div className="w-full py-12 bg-zinc-900 border-t border-zinc-800 relative z-20">
      <div className="max-w-7xl mx-auto px-4 text-center">
        
        <p className="text-gray-400 text-[10px] tracking-[0.3em] uppercase mb-10 font-bold">
          {t('section_allies')}
        </p>

        <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24">
          {logos.map((logo, index) => {
            const isFirstLogo = index === 0;
            
            // CAMBIO: Para el primer logo, eliminamos 'group-hover:filter-none' etc.
            // Ahora solo cambia la opacidad (opacity-50 -> 100), pero mantiene el filtro invert (blanco).
            const logoClasses = isFirstLogo
                ? "filter brightness-0 invert opacity-50 hover:opacity-100 transition-opacity duration-300" 
                : "opacity-80 hover:opacity-100 contrast-125 transition-all duration-300";

            return (
              <motion.div 
                key={index}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ delay: index * 0.1, duration: 0.8 }}
                className="group"
              >
                <img 
                  src={logo} 
                  alt={`Sponsor ${index + 1}`} 
                  className={`h-10 md:h-12 w-auto object-contain cursor-pointer ${logoClasses}`}
                />
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Aliados;