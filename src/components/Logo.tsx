import React from 'react';

interface LogoProps {
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ className }) => {
  return (
    <div className={`relative flex items-center justify-center ${className} overflow-visible`}>
      <style>{`
        @keyframes neon-buzz-nuclear {
          0% {
            /* ESTADO MAXIMO: 3 CAPAS DE LUZ (Blanco -> Violeta Claro -> Neón) */
            filter: brightness(0) 
                    drop-shadow(0 0 5px #ffffff) 
                    drop-shadow(0 0 20px #e0aaff) 
                    drop-shadow(0 0 60px #9d4edd);
            opacity: 1;
          }
          50% {
             /* PEQUEÑA BAJADA (Para crear la vibración) */
             filter: brightness(0) 
                     drop-shadow(0 0 4px #ffffff) 
                     drop-shadow(0 0 15px #c77dff) 
                     drop-shadow(0 0 40px #7b2cbf);
             opacity: 0.95; 
          }
          100% {
             /* RETORNO AL PICO */
             filter: brightness(0) 
                     drop-shadow(0 0 6px #ffffff) 
                     drop-shadow(0 0 25px #e0aaff) 
                     drop-shadow(0 0 70px #9d4edd);
             opacity: 1;
          }
        }
      `}</style>

      {/* Fondo ambiental aumentado para soportar tanto brillo */}
      <div className="absolute inset-0 bg-[#240046] rounded-full blur-3xl opacity-50"></div>

      <img 
        src="/logo-nardo.svg" 
        alt="Nardo Logo" 
        style={{ 
            /* MISMAS VELOCIDAD (0.08s) PERO CON FILTROS MÁS POTENTES */
            animation: 'neon-buzz-nuclear 0.08s infinite alternate',
            willChange: 'filter, opacity' 
        }}
        /* Mantenemos posición y escala estática */
        className="relative z-10 w-full h-full object-contain scale-[1.4]"
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
      />
    </div>
  );
};

export default Logo;
