import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import Logo from './Logo'; // Importamos el componente seguro
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faTimes, faGlobeAmericas } from '@fortawesome/free-solid-svg-icons';
import { faInstagram, faYoutube, faSpotify } from '@fortawesome/free-brands-svg-icons';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
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
    <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'bg-nardo-950/95 backdrop-blur-xl border-b border-nardo-700 py-2' : 'bg-transparent py-6'}`}>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex items-center justify-between'>
          
          {/* LOGO COMPONENTE (Ya no es imagen, es código SVG directo) */}
          <Link to='/' className='group'>
            <Logo className="h-12 w-12 hover:scale-110 transition-transform duration-300 group-hover:drop-shadow-[0_0_15px_rgba(157,78,221,0.8)]" />
          </Link>

          <div className='hidden md:flex items-center space-x-8'>
            {navLinks.map((link) => (
              <Link key={link.path} to={link.path} className={`text-xs font-bold tracking-[0.2em] transition-colors ${isActive(link.path) ? 'text-nardo-500' : 'text-gray-300 hover:text-white'}`}>
                {link.name}
              </Link>
            ))}
            
            <div className='flex items-center gap-4 pl-6 border-l border-nardo-800 ml-2'>
               <a href="https://instagram.com" target="_blank" className="text-gray-500 hover:text-nardo-500"><FontAwesomeIcon icon={faInstagram} /></a>
               <a href="https://youtube.com" target="_blank" className="text-gray-500 hover:text-red-600"><FontAwesomeIcon icon={faYoutube} /></a>
               <a href="https://open.spotify.com/intl-es/artist/53TYc3hxfM5KxuvJma12kg" target="_blank" className="text-gray-500 hover:text-green-500"><FontAwesomeIcon icon={faSpotify} /></a>
               <button onClick={toggleLang} className="text-[10px] font-bold text-nardo-500 border border-nardo-800 px-2 py-1 rounded hover:bg-nardo-900"><FontAwesomeIcon icon={faGlobeAmericas} /> {lang}</button>
            </div>
            
            <a href='https://escuelademusikita.com' target='_blank' className='px-4 py-2 border border-nardo-500 text-nardo-500 hover:bg-nardo-500 hover:text-white font-bold text-[10px] tracking-widest rounded transition-all uppercase'>
                {t('school')}
            </a>
          </div>
          <button onClick={() => setIsOpen(!isOpen)} className='md:hidden text-white'><FontAwesomeIcon icon={isOpen ? faTimes : faBars} size='lg' /></button>
        </div>
      </div>
      {isOpen && (
        <div className='md:hidden bg-nardo-950 absolute w-full h-screen pt-20 px-8 space-y-8'>
           {navLinks.map(link => <Link key={link.path} to={link.path} onClick={() => setIsOpen(false)} className='block text-3xl font-serif font-bold text-white border-b border-nardo-900 pb-4'>{link.name}</Link>)}
        </div>
      )}
    </nav>
  );
};
export default Navbar;