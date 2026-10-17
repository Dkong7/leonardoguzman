import { useState, useEffect, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faTimes, faShoppingCart } from '@fortawesome/free-solid-svg-icons';
import { faInstagram, faYoutube, faSpotify } from '@fortawesome/free-brands-svg-icons';
import { useLanguage } from '../context/LanguageContext';
import { ThemeContext } from '../context/ThemeContext';
import { CartContext } from '../context/CartContext';

// --- 1. COMPONENTE DE ICONO INTEGRADO ---
const GuitarrosisIcon = ({ className }: { className?: string }) => (<img src="/eim-icon-blanco.png" alt="EIM" className={(className || "").replace("text-current fill-current", "").replace("text-yellow-300", "") + " icon-yellow transition-all"} />);

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  
  
  const { t, lang, toggleLanguage } = useLanguage(); 
  const { theme, toggleTheme } = useContext(ThemeContext);
  const { cartTotal } = useContext(CartContext);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {};
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (theme !== 'purple') {
      document.documentElement.classList.add('tema-oscuro');
    } else {
      document.documentElement.classList.remove('tema-oscuro');
    }
  }, [theme]);

  const navLinks = [
    { name: t('home'), path: '/' },
    { name: t('music'), path: '/musica' },
    { name: t('bio'), path: '/biografia' },
    { name: lang === 'ES' ? 'CONTACTO' : 'CONTACT', path: '/booking' },
    { name: 'GUITAR TRACKER', path: '/guitarTracker' },
  ];

  const isActive = (path: string) => location.pathname === path;

  // Texto del botón clases según idioma
  const classBtnText = lang === 'ES' ? 'CLASES' : 'LESSONS';

  return (
    <nav className="fixed top-0 left-0 w-full z-50">
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&display=swap');
        
        .font-espacial { font-family: 'Orbitron', sans-serif; }

        .navbar-main-block {
          height: 70px; 
          width: 100%;
          background-color: #180033;
          box-shadow: 0 0 25px rgba(138,43,226,0.5);
          position: relative;
          z-index: 10;
          display: flex;
          align-items: center;
        }

        .bg-navbar-img {
          position: absolute;
          inset: 0;
          background-image: url('/backNav.png');
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          z-index: -1;
        }

        .logo-glow { animation: logo-pulse 2s infinite alternate ease-in-out; }
        @keyframes logo-pulse {
          0% { filter: drop-shadow(0 0 8px rgba(255,255,255,0.5)) drop-shadow(0 0 15px rgba(217,70,239,0.4)); }
          100% { filter: drop-shadow(0 0 15px rgba(255,255,255,0.9)) drop-shadow(0 0 30px rgba(217,70,239,0.8)); }
        }

        /* ANIMACIÓN DEL BOTÓN CLASES */
        @keyframes glow-pulse {
  0%, 94% { box-shadow: 0 0 5px rgba(250, 204, 21, 0.2), inset 0 0 5px rgba(250, 204, 21, 0.1); border-color: rgba(250, 204, 21, 0.5); }
  97% { box-shadow: 0 0 40px rgba(250, 204, 21, 0.9), inset 0 0 20px rgba(250, 204, 21, 0.6); border-color: rgba(250, 204, 21, 1); background-color: rgba(250, 204, 21, 0.15); text-shadow: 0 0 10px rgba(250, 204, 21, 0.8); }
  100% { box-shadow: 0 0 5px rgba(250, 204, 21, 0.2), inset 0 0 5px rgba(250, 204, 21, 0.1); border-color: rgba(250, 204, 21, 0.5); }
}
.btn-glow {
  animation: glow-pulse 45s infinite ease-in-out;
}
.icon-yellow {
  filter: brightness(0) saturate(100%) invert(87%) sepia(38%) saturate(1615%) hue-rotate(351deg) brightness(104%) contrast(103%);
}
.group:hover .icon-yellow {
  filter: brightness(0);
}

        html.tema-oscuro .navbar-main-block {
          background-color: #2a2a2a !important;
          box-shadow: 0 0 20px rgba(0,0,0,0.8) !important;
        }
        
        html.tema-oscuro .bg-navbar-img {
          filter: grayscale(100%) brightness(3) contrast(0.8) !important;
          opacity: 0.9 !important;
        }

        html.tema-oscuro .navbar-main-block a.text-purple-200 { color: #d1d5db !important; text-shadow: none !important; }
        html.tema-oscuro .navbar-main-block a.text-white { color: #ffffff !important; }
        
        html.tema-oscuro .navbar-main-block img.logo-glow {
          animation: none !important;
          filter: brightness(0) invert(1) !important; 
        }

        html.tema-oscuro .navbar-main-block .text-yellow-300 {
          color: #fcd34d !important;
          border-color: #fcd34d !important;
          box-shadow: none !important;
        }
      `}</style>

      <div className="navbar-main-block transition-all duration-300">
        <div className="bg-navbar-img"></div>

        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between relative z-20">
          <Link to='/' className='group flex items-center'>
             <img src="/logo-nardo.svg" alt="Nardo" className="h-10 w-auto md:h-12 object-contain brightness-0 invert logo-glow" />
          </Link>

          <div className='hidden md:flex items-center space-x-6'>
            <div className='flex items-center space-x-6'>
              {navLinks.map((link) => (
                <Link 
                  key={link.path} 
                  to={link.path} 
                  className={`font-espacial text-[10px] font-black tracking-[0.2em] transition-all uppercase drop-shadow-sm ${isActive(link.path) ? 'text-white drop-shadow-[0_0_8px_#fff]' : 'text-purple-200 hover:text-white hover:scale-105'}`}
                >
                  {link.name}
                </Link>
              ))}
            </div>
            
            <div className='flex flex-col items-end pl-6 border-l border-purple-400/30 ml-2 gap-2'>
               
               {/* FILA 1: Tema, Carrito, BotÃ³n Clases */}
               <div className='flex items-center justify-center gap-5 h-[32px]'>
                 <div className="flex items-center gap-4 h-full">
                   
                   {/* BotÃ³n TEMA */}
                   <button 
                     onClick={toggleTheme} 
                     className={`w-4 h-4 rounded-full transition-all duration-500 border border-white/20 shadow-lg hover:scale-110 ${theme === 'purple' ? 'bg-purple-500 shadow-[0_0_10px_#a855f7]' : 'bg-[#333] shadow-[0_0_5px_#ffffff50]'}`}
                     title={theme === 'purple' ? 'Modo Púrpura' : 'Modo Oscuro'}
                   />

                   <Link to="/carrito" className="relative flex items-center justify-center text-purple-200 hover:text-white transition-all cursor-pointer hover:scale-105 h-full">
                      <FontAwesomeIcon icon={faShoppingCart} className="drop-shadow-[0_0_8px_rgba(217,70,239,0.6)] text-lg" />
                      {cartTotal > 0 && (
                        <span className="absolute -top-1 -right-2.5 bg-white text-purple-950 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-[0_0_5px_#fff] leading-none">{cartTotal}</span>
                      )}
                   </Link>
                 </div>
                 
                 {/* BOTÓN CLASES (CON GLOW, ICONO Y TRADUCCIÓN) */}
                 <a href='https://escuelaitinerantedelamusica.com' className='group font-espacial px-4 h-[30px] flex items-center justify-center border border-yellow-400 text-yellow-300 hover:bg-yellow-400 hover:text-black font-black text-[10px] tracking-[0.15em] rounded transition-all uppercase btn-glow hover:scale-105 active:scale-95 leading-none gap-2'>
                     {/* ICONO AUMENTADO A W-5 (20px) */}
                     <GuitarrosisIcon className="w-5 h-auto text-current fill-current group-hover:text-black transition-colors" />
                     {classBtnText}                   </a>
               </div>

               {/* FILA 2: Idioma y Redes Sociales */}
               <div className='flex items-center gap-4 text-purple-300 pr-1'>
                 
                 {/* BotÃ³n IDIOMA */}
                 <button 
                   onClick={toggleLanguage} 
                   className="font-espacial text-[10px] font-bold text-gray-400 hover:text-white transition-colors border-r border-gray-600 pr-3 cursor-pointer"
                 >
                   {lang === 'ES' ? 'EN' : 'ES'}
                 </button>

                 {/* REDES SOCIALES CON COLORES OFICIALES */}
                 <a href="https://instagram.com/leonardoguzman" target="_blank" rel="noreferrer" className="transition-all hover:scale-110 hover:text-[#E4405F]">
                    <FontAwesomeIcon icon={faInstagram} size="sm" />
                 </a>
                 <a href="https://youtube.com/leonardoguzman" target="_blank" rel="noreferrer" className="transition-all hover:scale-110 hover:text-[#FF0000]">
                    <FontAwesomeIcon icon={faYoutube} size="sm" />
                 </a>
                 <a href="https://spotify.com" target="_blank" rel="noreferrer" className="transition-all hover:scale-110 hover:text-[#1DB954]">
                    <FontAwesomeIcon icon={faSpotify} size="sm" />
                 </a>
               </div>
            </div>
          </div>

          <button onClick={() => setIsOpen(!isOpen)} className='md:hidden text-white drop-shadow-[0_0_5px_#fff]'>
            <FontAwesomeIcon icon={isOpen ? faTimes : faBars} size='lg' />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className='md:hidden absolute w-full h-screen top-0 left-0 pt-28 px-6 space-y-6 z-40 bg-[#120024]/98 backdrop-blur-3xl'>
           {navLinks.map(link => (
             <Link 
               key={link.path} 
               to={link.path} 
               onClick={() => setIsOpen(false)} 
               className='font-espacial block text-xl font-black text-white border-b border-purple-800/50 pb-3 uppercase tracking-widest drop-shadow-[0_0_5px_rgba(217,70,239,0.6)]'
             >
               {link.name}
             </Link>
           ))}
           <a href="https://escuelaitinerantedelamusica.com" 
               onClick={() => setIsOpen(false)} 
               className='font-espacial block text-xl font-black text-yellow-300 border-b border-yellow-500/50 pb-3 uppercase tracking-widest drop-shadow-[0_0_5px_rgba(250,204,21,0.6)] flex items-center gap-3'
           >
               <GuitarrosisIcon className="w-6 h-auto text-yellow-300" />
               {lang === 'ES' ? 'CLASES / DOJO' : 'LESSONS / DOJO'}             </a>
           
           {/* Idioma Móvil */}
           <button 
             onClick={() => { toggleLanguage(); setIsOpen(false); }} 
             className='font-espacial block text-xl font-black text-gray-400 border-b border-gray-700 pb-3 uppercase tracking-widest'
           >
             IDIOMA: {lang === 'ES' ? 'ESPAÑOL' : 'ENGLISH'}
           </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;

