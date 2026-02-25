import { useState, useEffect, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faTimes, faShoppingCart } from '@fortawesome/free-solid-svg-icons';
import { faInstagram, faYoutube, faSpotify } from '@fortawesome/free-brands-svg-icons';
import { useLanguage } from '../context/LanguageContext';
import { ThemeContext } from '../context/ThemeContext';
import { CartContext } from '../context/CartContext';

// --- 1. COMPONENTE DE ICONO INTEGRADO ---
const GuitarrosisIcon = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 288.12 320.77" 
    className={className}
    fill="currentColor"
  >
    <g>
      <path d="M178.96 303.45c-17.42 15.42-35.8 24.34-56.33 10.36-11.14-7.59-20.56-16.12-29.99-26.1-29.39-31.08-52.16-66.99-69.68-106.1-9.12-20.36-16.21-40.46-20.43-62.31-6.67-34.5-1.04-67.9 27.93-89.25C43.8 20.22 58.21 13.59 74.55 9.19c44.86-12.08 92.22-12.28 137.16-.46 16.24 4.27 30.59 10.64 43.94 20.04 25.49 17.94 35.33 46.05 31.75 76.72-2.58 22.15-8.63 42.91-17.06 63.6-20.24 49.66-51.23 98.81-91.39 134.36Zm-18.36 8.14c11.29-7.17 20.58-15.31 29.67-24.81 25.95-27.13 46.83-57.72 63.44-91.39 13.65-27.66 25.13-57.24 29.11-87.86 7.16-55.01-27.86-84.5-78.6-96.4-39.15-9.18-79.77-9.27-118.97-.38-29.39 6.67-61.02 21.47-73.87 49.21-6.9 14.9-8.58 31.24-6.31 47.55 1.89 13.57 4.5 26.08 8.95 39.19 17.26 50.82 44.26 97.59 80.57 137 9.48 10.29 19.28 18.91 30.58 26.58 10.82 7.35 23.85 8.67 35.42 1.32Z" />
      <path d="M207.12 16.83c.47-.22 1.34-.7 1.62-.62 3.3 3.37 8.84 5.13 14.49 6.22l5.38.71c13.01 5.64 25.02 12.55 34.49 23.34 23.74 27.04 18.29 63.99 7.65 97.03-13.34 41.44-34.09 79.74-60.45 114.24-9.62 12.59-19.71 23.33-30.92 34.23-6.55 6.37-13.64 11.8-21.42 16.58-8.19 5.04-18.27 5.41-26.74.67-18.48-10.34-39.73-33.4-53.17-50.89-23.36-30.39-41.95-63.37-55.55-99.3C11.66 130.41.7 88.92 14.7 62.17l3.11-5.94.69-1.22c5.41-2.63 9.17-7.69 12.9-13.04l2.44-3.95 1.23-.9 4.61-.25c.94-.2 1.09-2.95 1.02-3.84.15-.11 1.68.1 1.93.1 6.48-2.06 10.07-6.82 16.93-7.84 5.87-3.57 12.18-5.12 18.58-6.91 7.43-2.08 14.79-4.23 22.57-5.09l30.56-3.34c8.24-.9 16.95-.63 25.17.04l13.69 1.11c12.54 1.01 24.92 3.75 37 5.72ZM75.06 161.18l2.24-.1c-.14 1.26 1.23 3.38 2.21 4.49.85.96 3.96 0 5.31.33 6.35 1.55 12.6 2.37 19.03 1.91l13.14-.94c4.75-.34 8.64-1.42 13.21-2.96 1.91-.64 5.77-1.68 6.46-3.39l.95-19.93.9-13.88 7.77-7.06-4.25-6.35-33.21.42c-3.76.05-7.31 5.33-7.73 8.13l5.49 3.94c1.56.08 4.58.05 5.94.77 3.68 1.95 4.65 17.75 2.34 26.74l-6.73 3.51c-2.55 1.33-8.02 1.94-10.48 1.41-1.5-2.34-2.39-3.14-4.45-3.72l-8.38-2.35c-1.47-2.59-2.33-3.84-3.78-5.59l-4.61-5.52c-2.78-3.34-2.52-6.92-3.31-10.68-1.03-4.88-3.91-10.1-3.59-15.04l.75-11.58c7.87-6.53-1.06-15.27 8.09-16.81l2.86-7.17c9.28-3.18 10.05-7.87 18.86-7.54l14.14-.26 2.04 1.17c.59 4.68 6.17 6.47 9.46 14.45.62 1.5.34 5.96 1.78 6.63 1.53.71 4.51 1.04 6.56.61 1.15-.24 3.29-2.64 3.16-3.78-.16-1.33-1.69-3.15-3.15-3.62l-.29-1.89c1.16-6.96.99-17.75-2.22-19.26l-9.64-4.54-25.7-.24c-6.44-.06-13.25 4.36-19.49 5.13-4.19.52-6.33 1.76-9.23 4.49s-6.62 5.46-8.97 9.05l-5.55 8.48c-3.92 5.99-.75 8.69-3.61 11.09-2.54 2.12-1.34 4.03-1.38 6.4-.28 14.26 1.03 28.37 8.4 41.12l3.9 2.79c2.25 6.26 9.89 11.49 14.77 11.13Zm89.89-48.72c-.03.21.22 1.16.24 1.21l-4.64 4.92-1.99 8.42c-.13.55-.89 2.13-1.36 2.13h-1.75l-1.34 11.82.38.38-6.73 12.28c-3.79 8.49-4.36 13.06-6.84 18.85l-6.78 15.77-3.54 7.21c-4.36-.85-9.85 1.58-11.23 5.12-.26.67-.29 2.72.23 2.93l2.54 1.02h.9l2.7 2.1 29.45-.07.95-2.07-.03-.48 4.2-2.84-5.27-5.1-5.37-.67c-1.63-4.28-1.12-9.5 1.33-13.6l3.39-5.65c.65-1.08 1.33-4.42 2.53-4.41 2.24.02 5.1-1.47 6.55-2.53 5.53-.72 12.23-.64 18.69-.63 4.81 8.96 11.79 24.64 6.64 27.31-2.51 1.31-4.49 2.74-4.98 4.23s.88 5.74 2.44 6.33l34.72.16c1.15 0 3.39-1.36 4-2l1.01-.96c.67-.09 2.26-.88 2.16-1.62-.13-.95-1.34-2.83-2.16-2.35v-.79c0-.74-1.17-1.92-1.98-2.17l-6.15-1.92c-1.68-1.69-3.22-3.08-4.77-3.35l.2-.93c1.08-2.7-.87-5.07-2.21-7.91l-4.37-7.81-1.16-2.11 1.25-1.7-2.65-6.01-3.36-14.8c-.94-4.12-4.34-6.9-5.55-11.27l-2.84-10.25-3.11-6.62-5.63-14.32c-.26-.65.19-2.88-.37-2.98l-2.53-.24.03-.64-1.17-7.71-11.39 2.13c-1.39 4.28-2.82 10.56-3.27 14.19Z" />
      <path d="M207.12 16.83c-12.08-1.98-24.45-4.71-37-5.72L156.43 10c-8.21-.66-16.93-.94-25.17-.04L100.7 13.3c-7.79.85-15.14 3.01-22.57 5.09-6.4 1.79-12.7 3.34-18.58 6.91-6.86 1.03-10.45 5.78-16.93 7.84 22.13-15.39 51.81-21.92 79.83-24.05 14.03-1.07 27.94-.48 42.02-.29 14.25 1.57 27.68 3.5 41.47 6.56l1.18 1.48ZM18.5 55.01c4.18-6.45 9.42-12.38 15.34-16.99l-2.44 3.95c-3.73 5.35-7.49 10.41-12.9 13.04M228.61 23.13l-5.38-.71c-5.65-1.08-11.2-2.85-14.49-6.22 5.09 1.35 14 4.38 19.87 6.92ZM40.69 33.04c.07.9-.07 3.65-1.02 3.84l-4.61.25 5.62-4.09ZM14.7 62.17l3.11-5.94zM224.98 204.61c-.61.64-2.85 2-4 2l-34.72-.16c-1.56-.58-2.96-4.78-2.44-6.33s2.47-2.92 4.98-4.23c5.15-2.67-1.84-18.35-6.64-27.31-6.46-.02-13.16-.09-18.69.63-1.45 1.06-4.31 2.54-6.55 2.53-1.2 0-1.88 3.33-2.53 4.41L151 181.8c-2.46 4.1-2.96 9.32-1.33 13.6l5.37.67 5.27 5.1-4.2 2.84-.36-5.12-7.26-1.24c-2.08-.35-3.99-4.12-3.18-6.5l8.09-23.75 32.45.1 8.82 24.41c.35.98.45 3.83-.26 4.52-2.93 2.85-8.48 1.88-8.5 2.9l-.1 5.2 39.17.1ZM114.22 71.96l-14.14.26c-8.81-.32-9.58 4.37-18.86 7.54l-2.86 7.17c-9.15 1.54-.23 10.28-8.09 16.81l-.75 11.58c-.32 4.94 2.57 10.16 3.59 15.04.79 3.77.53 7.35 3.31 10.68l4.61 5.52c1.46 1.75 2.31 3 3.78 5.59l8.38 2.35c2.06.58 2.95 1.38 4.45 3.72 2.45.54 7.93-.08 10.48-1.41l6.73-3.51c2.31-8.99 1.34-24.79-2.34-26.74-1.36-.72-4.38-.69-5.94-.77l-5.49-3.94c.42-2.8 3.97-8.08 7.73-8.13l33.21-.42 4.25 6.35-7.77 7.06-.9 13.88-.95 19.93c-.69 1.71-4.55 2.74-6.46 3.39-4.57 1.53-8.46 2.62-13.21 2.96l-13.14.94c-6.43.46-12.68-.37-19.03-1.91-1.34-.33-4.45.63-5.31-.33-.98-1.11-2.35-3.23-2.21-4.49 18.89 8.83 37.37 5.43 57.19-.53-.49-11.4-.65-21.43-.3-32.74.21-6.74 12.39-3.88 7.49-10.98l-36.71.02.28 4.74c.08 1.32 7.46-.07 10.39 2.6 1.19 1.09 2.32 4.45 2.33 6.19l.07 20.31c.01 3.61-2.41 6.87-6.08 7.95-21.45 6.32-38.48-10.04-42.67-32.33-2.57-13.69-1.74-27.44 4.56-39.87 7.65-14.99 25.77-21.36 40.38-14.49Z" />
      <path d="m133.78 85.54-.72-6.93c-.43-4.14-.67-7.39-1.63-11.5-23.05-6.4-46.2-7.13-64.6 8.32-21.41 17.97-23.07 57.12-2.06 77.24 3.26 3.12 7.31 5.54 10.3 8.51-4.88.36-12.52-4.87-14.77-11.13l-3.9-2.79c-7.36-12.75-8.68-26.86-8.4-41.12.05-2.37-1.15-4.28 1.38-6.4 2.86-2.4-.3-5.11 3.61-11.09l5.55-8.48c2.35-3.59 5.97-6.23 8.97-9.05s5.03-3.97 9.23-4.49c6.24-.77 13.04-5.19 19.49-5.13l25.7.24 9.64 4.54c3.21 1.51 3.38 12.3 2.22 19.26ZM205.55 172.69l-24.79-68.19 2.53.24c.56.11.11 2.33.37 2.98l5.63 14.32 3.11 6.62 2.84 10.25c1.21 4.37 4.61 7.15 5.55 11.27l3.36 14.8 2.65 6.01zM156.14 204.49l-.95 2.07-29.45.07-2.7-2.1zM180.79 103.86l-2.86-6.29-7.5 1.95-5.47 12.95c.45-3.62 1.88-9.91 3.27-14.19l11.39-2.13zM154.11 140.96l1.34-11.82h1.75c.47 0 1.23-1.58 1.36-2.13l1.99-8.42 4.64-4.92-9.26 23.99z" />
      <path d="M134.07 87.43c1.46.47 2.99 2.29 3.15 3.62.14 1.14-2 3.54-3.16 3.78-2.05.43-5.03.09-6.56-.61-1.44-.67-1.16-5.12-1.78-6.63-3.29-7.98-8.88-9.77-9.46-14.45 6.04 3.47 10.87 11.61 12.55 18.16.47.96 3.91 1.82 4.53.96.75-1.03.93-3.48.73-4.82ZM122.13 204.53l-2.54-1.02c-.52-.21-.49-2.26-.23-2.93 1.39-3.54 6.87-5.97 11.23-5.12l3.54-7.21 6.78-15.77c2.49-5.79 3.05-10.35 6.84-18.85l6.73-12.28-18.45 48.12c-2.3 5.99-7.54 9.51-13.97 9.31l.06 5.76ZM225.98 198.89c-5.49-.29-11.05-2.07-12.89-7.44 1.55.27 3.09 1.65 4.77 3.35l6.15 1.92c.8.25 1.98 1.43 1.98 2.17ZM213.29 190.52c-.26.28-1.7-1.43-1.85-1.87l-4.73-13.84 4.37 7.81c1.34 2.84 3.29 5.2 2.21 7.91ZM225.99 203.65v-3.97c.81-.48 2.03 1.4 2.16 2.35.1.73-1.48 1.52-2.16 1.62M183.28 159.77l-27.55-.02 13.92-38.98z" />
    </g>
  </svg>
);

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  
  const { t, lang, toggleLanguage } = useLanguage(); 
  const { theme, toggleTheme } = useContext(ThemeContext);
  const { cartTotal } = useContext(CartContext);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
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
    { name: t('tour'), path: '/conciertos' },
    { name: t('store'), path: '/tienda' },
    { name: t('bio'), path: '/biografia' },
    { name: 'BOOKING', path: '/booking' },
  ];

  const isActive = (path: string) => location.pathname === path;

  // Texto del botón clases según idioma
  const classBtnText = lang === 'ES' ? 'CLASES' : 'LESSONS';

  return (
    <nav className={`fixed top-0 left-0 w-full z-50 navbar-controller transition-all duration-300 ${scrolled ? 'pt-2' : 'pt-8'}`}>
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&display=swap');
        
        .font-espacial { font-family: 'Orbitron', sans-serif; }

        .navbar-controller {
          --picos-top-pos-mobile: -30px;    
          --picos-bottom-pos-mobile: 48px;  
          --picos-top-pos-desktop: -34px;   
          --picos-bottom-pos-desktop: 55px; 
        }

        @media (min-width: 768px) {
          .navbar-controller {
            --picos-top-pos-mobile: var(--picos-top-pos-desktop);
            --picos-bottom-pos-mobile: var(--picos-bottom-pos-desktop);
          }
        }

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

        .spikes-top {
          position: absolute;
          top: var(--picos-top-pos-mobile);
          left: 0;
          width: 100%;
          height: 40px; 
          background-image: url('/picos-top.png');
          background-repeat: repeat-x;
          background-position: bottom center;
          background-size: auto 100%;
          z-index: 11;
          pointer-events: none;
        }

        .spikes-bottom {
          position: absolute;
          top: var(--picos-bottom-pos-mobile);
          left: 0;
          width: 100%;
          height: 60px; 
          background-image: url('/picos-bottom.png');
          background-repeat: repeat-x;
          background-position: top center;
          background-size: auto 100%;
          z-index: 11;
          pointer-events: none;
        }

        .logo-glow { animation: logo-pulse 2s infinite alternate ease-in-out; }
        @keyframes logo-pulse {
          0% { filter: drop-shadow(0 0 8px rgba(255,255,255,0.5)) drop-shadow(0 0 15px rgba(217,70,239,0.4)); }
          100% { filter: drop-shadow(0 0 15px rgba(255,255,255,0.9)) drop-shadow(0 0 30px rgba(217,70,239,0.8)); }
        }

        /* ANIMACIÓN DEL BOTÓN CLASES */
        @keyframes glow-pulse {
          0% { box-shadow: 0 0 5px rgba(250, 204, 21, 0.2), inset 0 0 5px rgba(250, 204, 21, 0.1); }
          50% { box-shadow: 0 0 20px rgba(250, 204, 21, 0.6), inset 0 0 10px rgba(250, 204, 21, 0.2); }
          100% { box-shadow: 0 0 5px rgba(250, 204, 21, 0.2), inset 0 0 5px rgba(250, 204, 21, 0.1); }
        }
        
        .btn-glow {
           animation: glow-pulse 2s infinite ease-in-out;
        }

        html.tema-oscuro .navbar-main-block {
          background-color: #2a2a2a !important;
          box-shadow: 0 0 20px rgba(0,0,0,0.8) !important;
        }
        
        html.tema-oscuro .bg-navbar-img {
          filter: grayscale(100%) brightness(3) contrast(0.8) !important;
          opacity: 0.9 !important;
        }

        html.tema-oscuro .spikes-top,
        html.tema-oscuro .spikes-bottom {
          filter: grayscale(100%) brightness(0.4) contrast(1.2) !important;
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
        <div className="spikes-top"></div>
        <div className="spikes-bottom"></div>

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
               
               {/* FILA 1: Tema, Carrito, Botón Clases */}
               <div className='flex items-center justify-center gap-5 h-[32px]'>
                 <div className="flex items-center gap-4 h-full">
                   
                   {/* Botón TEMA */}
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
                 <Link to='/clases' className='group font-espacial px-4 h-[30px] flex items-center justify-center border border-yellow-400 text-yellow-300 hover:bg-yellow-400 hover:text-black font-black text-[10px] tracking-[0.15em] rounded transition-all uppercase btn-glow hover:scale-105 active:scale-95 leading-none gap-2'>
                     {/* ICONO AUMENTADO A W-5 (20px) */}
                     <GuitarrosisIcon className="w-5 h-auto text-current fill-current group-hover:text-black transition-colors" />
                     {classBtnText}
                 </Link>
               </div>

               {/* FILA 2: Idioma y Redes Sociales */}
               <div className='flex items-center gap-4 text-purple-300 pr-1'>
                 
                 {/* Botón IDIOMA */}
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
           <Link 
               to="/clases" 
               onClick={() => setIsOpen(false)} 
               className='font-espacial block text-xl font-black text-yellow-300 border-b border-yellow-500/50 pb-3 uppercase tracking-widest drop-shadow-[0_0_5px_rgba(250,204,21,0.6)] flex items-center gap-3'
           >
               <GuitarrosisIcon className="w-6 h-auto text-yellow-300" />
               {lang === 'ES' ? 'CLASES / DOJO' : 'LESSONS / DOJO'}
           </Link>
           
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