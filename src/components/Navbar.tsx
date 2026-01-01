import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Logo from './Logo'; 
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faTimes, faGlobeAmericas } from '@fortawesome/free-solid-svg-icons';
import { faInstagram, faYoutube, faSpotify } from '@fortawesome/free-brands-svg-icons';

// 1. IMPORTANTE: Importar el hook del contexto
import { useLanguage } from '../context/LanguageContext';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  
  // 2. CORRECCIÓN CRÍTICA:
  // En vez de usar useState local, nos conectamos al cerebro global.
  // Borramos: const [lang, setLang] = useState('ES');
  const { lang, toggleLang, t } = useLanguage(); 

  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: t('home'), path: '/' },
    { name: t('music'), path: '/musica' },
    { name: t('tour'), path: '/conciertos' },
    { name: t('store'), path: '/tienda' },
    { name: t('bio'), path: '/biografia' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-nardo-950/95 backdrop-blur-xl border-b border-nardo-700 py-2' : 'bg-transparent py-4'}`}>
      
      <style>{`
        @keyframes gold-glimmer {
          0%, 90% { border-color: #b8860b; color: #b8860b; box-shadow: 0 0 0 transparent; text-shadow: none; }
          92% { border-color: #FFD700; color: #FFD700; box-shadow: 0 0 10px rgba(255, 215, 0, 0.5); text-shadow: 0 0 5px #FFD700; }
          95% { border-color: #FFF; color: #FFF; box-shadow: 0 0 20px #FFD700, 0 0 10px #FFF; text-shadow: 0 0 10px #FFF; }
          98% { border-color: #FFD700; color: #FFD700; box-shadow: 0 0 10px rgba(255, 215, 0, 0.5); }
          100% { border-color: #b8860b; color: #b8860b; box-shadow: 0 0 0 transparent; }
        }
      `}</style>

      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex items-center justify-between'>
          
          <Link to='/' className='group'>
            <Logo className="h-16 w-16 md:h-20 md:w-20 transition-transform duration-300 hover:scale-105" />
          </Link>

          <div className='hidden md:flex items-center space-x-8'>
            {navLinks.map((link) => (
              <Link 
                key={link.path} 
                to={link.path} 
                className={`text-xs font-bold tracking-[0.2em] transition-colors ${isActive(link.path) ? 'text-nardo-500' : 'text-gray-300 hover:text-white'}`}
              >
                {link.name}
              </Link>
            ))}
            
            <div className='flex items-center gap-4 pl-6 border-l border-nardo-800 ml-2'>
               <a href="https://www.instagram.com/leonardogzm/" target="_blank" className="text-gray-500 hover:text-nardo-500"><FontAwesomeIcon icon={faInstagram} /></a>
               <a href="https://www.youtube.com/@leonardogzm/videos" target="_blank" className="text-gray-500 hover:text-red-600"><FontAwesomeIcon icon={faYoutube} /></a>
               <a href="https://open.spotify.com/intl-es/artist/53TYc3hxfM5KxuvJma12kg?si=F8t14Dk2Q02E82ozjfFYcw" target="_blank" className="text-gray-500 hover:text-green-500"><FontAwesomeIcon icon={faSpotify} /></a>
               
               {/* BOTÓN DE IDIOMA CONECTADO */}
               <button 
                 onClick={toggleLang} 
                 className="text-[10px] font-bold text-nardo-500 border border-nardo-800 px-2 py-1 rounded hover:bg-nardo-900 flex items-center gap-2 cursor-pointer"
               >
                 <FontAwesomeIcon icon={faGlobeAmericas} /> {lang}
               </button>
            </div>
            
            <a href='https://escuelademusikita.com' target='_blank' 
               style={{ animation: 'gold-glimmer 6s infinite ease-in-out' }}
               className='px-4 py-2 border border-[#b8860b] text-[#b8860b] hover:bg-[#FFD700] hover:text-black hover:border-[#FFD700] font-bold text-[10px] tracking-widest rounded transition-all uppercase hover:animate-none hover:shadow-[0_0_20px_#FFD700]'>
                {t('school')}
            </a>
          </div>

          <button onClick={() => setIsOpen(!isOpen)} className='md:hidden text-white'>
            <FontAwesomeIcon icon={isOpen ? faTimes : faBars} size='lg' />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className='md:hidden bg-nardo-950 absolute w-full h-screen top-0 left-0 pt-24 px-8 space-y-8 z-40'>
           {navLinks.map(link => (
             <Link 
               key={link.path} 
               to={link.path} 
               onClick={() => setIsOpen(false)} 
               className='block text-3xl font-serif font-bold text-white border-b border-nardo-900 pb-4'
             >
               {link.name}
             </Link>
           ))}
        </div>
      )}
    </nav>
  );
};
export default Navbar;