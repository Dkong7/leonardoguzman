import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTicketAlt, faMapMarkerAlt, faCalendarAlt, faClock } from '@fortawesome/free-solid-svg-icons';

interface Gig { id: string; fecha: string; ciudad: string; lugar: string; link_tiquetes: string; activo: boolean; imagen_url?: string; }

const GigsWidget = () => {
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchGigs(); }, []);

  const fetchGigs = async () => {
    try {
      const { data, error } = await supabase.from('conciertos').select('*').eq('activo', true).order('fecha', { ascending: true });
      if (error) throw error;
      setGigs(data || []);
    } catch (error) { console.error('Error:', error); } finally { setLoading(false); }
  };

  const getDay = (date: string) => new Date(date).getDate();
  const getMonth = (date: string) => new Date(date).toLocaleDateString('en-US', { month: 'short' }).toUpperCase();

  if (loading) return <div className='text-nardo-500 text-center py-20 animate-pulse'>Loading Tour Dates...</div>;

  return (
    <div className='w-full max-w-7xl mx-auto px-4 py-20'>
      <div className='flex items-center justify-between mb-12 border-b border-nardo-800 pb-4'>
        <h2 className='text-4xl md:text-5xl font-serif text-white tracking-tighter'>
          TOUR <span className='text-nardo-500'>DATES</span>
        </h2>
        <span className='text-nardo-400 text-sm font-bold tracking-widest hidden md:block'>UPCOMING SHOWS & MASTERCLASSES</span>
      </div>

      {gigs.length === 0 ? (
        <p className='text-center text-gray-500 py-20 bg-nardo-900/50 rounded-lg'>No dates confirmed yet.</p>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
          {gigs.map((gig) => (
            <div key={gig.id} className='group bg-nardo-900 border border-nardo-800 rounded-xl overflow-hidden hover:border-nardo-500 transition-all duration-300 hover:shadow-[0_10px_40px_-10px_rgba(157,78,221,0.3)]'>
              {/* Flyer Image */}
              <div className='relative h-64 overflow-hidden'>
                <div className='absolute top-4 left-4 bg-nardo-950/90 backdrop-blur text-white p-2 rounded text-center min-w-[60px] z-10 border border-nardo-700'>
                  <span className='block text-xs font-bold text-nardo-500'>{getMonth(gig.fecha)}</span>
                  <span className='block text-2xl font-bold leading-none'>{getDay(gig.fecha)}</span>
                </div>
                <img 
                  src={gig.imagen_url || 'https://via.placeholder.com/400x600'} 
                  alt={gig.lugar} 
                  className='w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 filter group-hover:brightness-110' 
                />
                <div className='absolute inset-0 bg-gradient-to-t from-nardo-950 via-transparent to-transparent opacity-90'></div>
              </div>

              {/* Info */}
              <div className='p-6 relative -mt-12'>
                <div className='flex items-center gap-2 text-nardo-400 text-xs font-bold mb-2 uppercase tracking-wide'>
                  <FontAwesomeIcon icon={faMapMarkerAlt} /> {gig.ciudad}
                </div>
                <h3 className='text-xl font-bold text-white mb-4 leading-tight min-h-[3rem]'>{gig.lugar}</h3>
                
                {gig.link_tiquetes ? (
                  <a href={gig.link_tiquetes} target='_blank' rel='noopener noreferrer' className='block w-full py-3 bg-nardo-800 hover:bg-nardo-500 text-center text-white font-bold text-sm tracking-widest transition-colors rounded'>
                    GET TICKETS <FontAwesomeIcon icon={faTicketAlt} className='ml-2' />
                  </a>
                ) : (
                  <button disabled className='block w-full py-3 border border-gray-700 text-gray-500 font-bold text-sm tracking-widest cursor-not-allowed rounded'>
                    SOLD OUT
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
export default GigsWidget;