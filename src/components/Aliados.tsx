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
    <div className="w-full py-16 relative z-20 transition-colors duration-500">
      
      <style>{`
        /* =======================================================
           GLASSMORFISMO (Contenedor Base)
           ======================================================= */
        .aliados-tray {
          background: rgba(20, 0, 40, 0.15);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 2rem;
          box-shadow: 0 15px 30px rgba(0, 0, 0, 0.3);
        }

        /* =======================================================
           NEUMORFISMO INCRUSTADO (Individual por Logo)
           ======================================================= */
        .logo-incrustado {
          background: rgba(10, 0, 25, 0.4);
          border-radius: 1.5rem;
          border: 1px solid rgba(255, 255, 255, 0.02);
          /* Sombra interior fuerte para el hueco */
          box-shadow: 
            inset 5px 5px 10px rgba(0, 0, 0, 0.8), 
            inset -5px -5px 10px rgba(255, 255, 255, 0.03),
            0 2px 5px rgba(0, 0, 0, 0.5);
          transition: all 0.3s ease;
        }

        .logo-incrustado:hover {
          box-shadow: 
            inset 2px 2px 5px rgba(0, 0, 0, 0.8), 
            inset -2px -2px 5px rgba(255, 255, 255, 0.03),
            0 5px 15px rgba(217, 70, 239, 0.2);
        }

        /* =======================================================
           ADAPTACIÓN AL TEMA ALTERNO (Gris claro)
           ======================================================= */
        html.tema-oscuro .aliados-tray {
          background: rgba(250, 250, 250, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.6);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
        }

        /* Hueco claro hundido */
        html.tema-oscuro .logo-incrustado {
          background: rgba(220, 220, 225, 0.5);
          border: 1px solid rgba(0, 0, 0, 0.02);
          box-shadow: 
            inset 4px 4px 8px rgba(0, 0, 0, 0.1), 
            inset -4px -4px 8px rgba(255, 255, 255, 0.9),
            0 2px 5px rgba(0, 0, 0, 0.05);
        }

        html.tema-oscuro .logo-incrustado:hover {
          box-shadow: 
            inset 2px 2px 5px rgba(0, 0, 0, 0.1), 
            inset -2px -2px 5px rgba(255, 255, 255, 0.9),
            0 5px 15px rgba(0, 0, 0, 0.1);
        }
        
        html.tema-oscuro .aliados-title {
          color: #6b7280; 
        }

        html.tema-oscuro .logo-aliado-invert {
          filter: grayscale(100%) brightness(0.2) contrast(1.5) !important;
        }
        html.tema-oscuro .logo-aliado-regular {
          filter: grayscale(100%) brightness(0.4) contrast(1.2) !important;
        }
      `}</style>

      <div className="max-w-6xl mx-auto px-4 text-center">
        
        <p className="aliados-title text-gray-400 text-[10px] tracking-[0.3em] uppercase mb-8 font-bold transition-colors duration-500">
          {t('section_allies')}
        </p>

        {/* CONTENEDOR TIPO BANDEJA DE CRISTAL */}
        <div className="aliados-tray py-8 px-6 sm:px-12 flex flex-wrap justify-center items-center gap-6 md:gap-12 transition-all duration-500">
          {logos.map((logo, index) => {
            const isFirstLogo = index === 0;
            
            const logoClasses = isFirstLogo
                ? "filter brightness-0 invert opacity-60 group-hover:opacity-100 transition-opacity duration-300 logo-aliado-invert" 
                : "opacity-70 group-hover:opacity-100 contrast-125 transition-all duration-300 drop-shadow-sm logo-aliado-regular";

            return (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.8 }}
                className="group logo-incrustado px-6 py-4 flex items-center justify-center"
              >
                {/* TAMAÑO DE LOGOS REDUCIDO (h-7 y md:h-9) */}
                <img 
                  src={logo} 
                  alt={`Sponsor ${index + 1}`} 
                  className={`h-7 md:h-9 w-auto object-contain cursor-pointer ${logoClasses}`}
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