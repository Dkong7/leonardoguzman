import { useEffect, useState } from 'react';
import pb from '../lib/pocketbase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTicketAlt, faMapMarkerAlt, faMicrophoneAlt, faGraduationCap } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../context/LanguageContext';

// TASA DE CAMBIO FIJA
const EXCHANGE_RATE = 4150; 

interface Gig { 
    id: string; 
    fecha: string; 
    ciudad: string; 
    lugar: string; 
    link_tiquetes: string; 
    activo: boolean; 
    imagen_url?: string; 
    imagen?: string;
    precio?: number;      
    tipo: 'live' | 'academic'; 
    descripcion?: string;    // Español
    descripcion_en?: string; // Inglés
}

const GigsWidget = () => {
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { lang } = useLanguage(); 

  useEffect(() => { fetchGigs(); }, []);

  const fetchGigs = async () => {
    try {
      const records = await pb.collection('conciertos').getFullList({
          filter: 'activo = true',
          sort: '+fecha'
      });
      
      const mappedGigs = records.map((g: any) => ({
          ...g,
          imagen_url: g.imagen ? pb.files.getUrl(g, g.imagen) : g.imagen_url
      }));
      setGigs(mappedGigs);
    } catch (error) { 
        console.error('Error cargando conciertos:', error); 
    } finally { 
        setLoading(false); 
    }
  };

  const getDay = (date: string) => new Date(date).getDate();
  const getMonth = (date: string) => {
    const locale = lang === 'ES' ? 'es-CO' : 'en-US';
    return new Date(date).toLocaleDateString(locale, { month: 'short' }).toUpperCase();
  };

  // LOGICA DE PRECIO (COP vs US$)
  const formatPrice = (price?: number) => {
    if (!price) return '';
    if (lang === 'ES') {
        return new Intl.NumberFormat('es-CO', { 
            style: 'currency', currency: 'COP', maximumFractionDigits: 0 
        }).format(price);
    } else {
        const usdPrice = price / EXCHANGE_RATE;
        // Forzamos visualmente 'US$' para evitar confusión
        return 'US' + new Intl.NumberFormat('en-US', { 
            style: 'currency', currency: 'USD', maximumFractionDigits: 0
        }).format(usdPrice);
    }
  };

  // LOGICA DE DESCRIPCIÓN TRADUCIDA
  const getDescription = (gig: Gig) => {
    if (lang === 'EN' && gig.descripcion_en) {
        return gig.descripcion_en;
    }
    return gig.descripcion || '';
  };

  const getTypeStyles = (type: string) => {
    if (type === 'academic') {
        return {
            border: 'border-cyan-500',
            shadow: 'hover:shadow-[0_0_30px_rgba(6,182,212,0.4)]',
            badgeBg: 'bg-cyan-950/90 border-cyan-500 text-cyan-400',
            icon: faGraduationCap,
            ribbon: 'bg-gradient-to-r from-cyan-600 to-cyan-500 shadow-md', 
            glowText: 'text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]',
            buttonHover: 'hover:bg-cyan-900/50 hover:border-cyan-400'
        };
    }
    return {
        border: 'border-nardo-500',
        shadow: 'hover:shadow-[0_0_30px_rgba(234,179,8,0.4)]',
        badgeBg: 'bg-nardo-950/90 border-nardo-500 text-nardo-400',
        icon: faMicrophoneAlt,
        ribbon: 'bg-gradient-to-r from-yellow-600 to-yellow-500 shadow-md',
        glowText: 'text-nardo-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.8)]',
        buttonHover: 'hover:bg-nardo-900/50 hover:border-nardo-400'
    };
  };

  const ui = {
    ES: { loading: 'CARGANDO FECHAS...', buy: 'COMPRAR TICKET', sold: 'AGOTADO', date_label: 'FECHAS' },
    EN: { loading: 'LOADING DATES...', buy: 'GET TICKETS', sold: 'SOLD OUT', date_label: 'DATES' }
  }[lang];

  if (loading) return <div className='text-nardo-500 text-center py-20 animate-pulse font-mono'>{ui.loading}</div>;

  return (
    <div className='w-full max-w-7xl mx-auto px-4 py-20'>
      <div className='flex items-center justify-between mb-12 border-b border-nardo-800 pb-4'>
        <h2 className='text-4xl md:text-5xl font-serif text-white tracking-tighter'>
          TOUR <span className='text-nardo-500'>{ui.date_label}</span>
        </h2>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8'>
        {gigs.map((gig) => {
          const styles = getTypeStyles(gig.tipo);
          const description = getDescription(gig);

          return (
            <div key={gig.id} className={`group relative bg-nardo-950 border ${styles.border} rounded-xl overflow-hidden transition-all duration-300 transform hover:-translate-y-2 ${styles.shadow}`}>
              
              {gig.precio && (
                <div className='absolute -right-12 top-8 w-40 transform rotate-45 z-30 overflow-hidden drop-shadow-lg pointer-events-none'>
                    <div className={`${styles.ribbon} text-white text-center text-sm font-black py-1 border-y border-white/20 tracking-wider`}>
                        {formatPrice(gig.precio)}
                    </div>
                </div>
              )}

              <div className='relative h-56 overflow-hidden'>
                <div className='absolute top-4 left-4 bg-black/90 text-white p-2 rounded text-center min-w-[60px] z-20 border border-gray-700 shadow-xl'>
                    <span className={`block text-xs font-extrabold ${styles.glowText} uppercase`}>{getMonth(gig.fecha)}</span>
                    <span className='block text-2xl font-bold leading-none'>{getDay(gig.fecha)}</span>
                </div>

                <img 
                    src={gig.imagen_url || '/placeholder_gig.jpg'} 
                    alt={gig.lugar} 
                    className='w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 filter brightness-[0.6] group-hover:brightness-100' 
                />
                <div className='absolute inset-0 bg-gradient-to-t from-nardo-950 via-nardo-950/20 to-transparent'></div>
              </div>

              <div className='p-6 pt-8 relative'>
                <div className={`absolute -top-3 right-4 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase border backdrop-blur-md shadow-lg z-20 ${styles.badgeBg}`}>
                    <FontAwesomeIcon icon={styles.icon} className='mr-1' />
                    {gig.tipo === 'academic' ? (lang === 'ES' ? 'MASTERCLASS' : 'ACADEMIC') : (lang === 'ES' ? 'EN VIVO' : 'LIVE SHOW')}
                </div>

                <div className='flex items-center gap-2 text-gray-400 text-xs font-bold mb-2 uppercase tracking-wide'>
                    <FontAwesomeIcon icon={faMapMarkerAlt} className={styles.glowText} /> {gig.ciudad}
                </div>
                
                <h3 className='text-xl font-bold text-white mb-2 leading-tight font-serif'>
                    {gig.lugar}
                </h3>

                {description && (
                    <p className='text-gray-400 text-xs mb-6 line-clamp-3 leading-relaxed min-h-[3rem] font-light'>
                        {description}
                    </p>
                )}

                {gig.link_tiquetes ? (
                    <a 
                        href={gig.link_tiquetes} 
                        target='_blank' 
                        rel='noopener noreferrer' 
                        className={`flex items-center justify-center gap-2 w-full py-3 border ${styles.border} bg-transparent ${styles.buttonHover} text-white font-bold text-xs tracking-widest uppercase rounded transition-all shadow-[0_0_10px_rgba(0,0,0,0.5)]`}
                    >
                    {ui.buy} <FontAwesomeIcon icon={faTicketAlt} />
                    </a>
                ) : (
                    <button disabled className='w-full py-3 border border-gray-800 bg-gray-900 text-gray-600 font-bold text-xs tracking-widest uppercase rounded cursor-not-allowed'>
                        {ui.sold}
                    </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GigsWidget;