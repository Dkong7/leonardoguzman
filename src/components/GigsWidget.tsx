import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTicketAlt, faMapMarkerAlt } from '@fortawesome/free-solid-svg-icons';

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
      </div>
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
        {gigs.map((gig) => (
          <div key={gig.id} className='group bg-nardo-900 border border-nardo-800 rounded-xl overflow-hidden hover:border-nardo-500 transition-all'>
            <div className='relative h-64 overflow-hidden'>
              <div className='absolute top-4 left-4 bg-nardo-950/90 text-white p-2 rounded text-center min-w-[60px] z-10 border border-nardo-700'>
                <span className='block text-xs font-bold text-nardo-500'>{getMonth(gig.fecha)}</span>
                <span className='block text-2xl font-bold leading-none'>{getDay(gig.fecha)}</span>
              </div>
              <img src={gig.imagen_url || ''} alt={gig.lugar} className='w-full h-full object-cover transition-transform group-hover:scale-110' />
            </div>
            <div className='p-6'>
              <div className='flex items-center gap-2 text-nardo-400 text-xs font-bold mb-2 uppercase tracking-wide'>
                <FontAwesomeIcon icon={faMapMarkerAlt} /> {gig.ciudad}
              </div>
              <h3 className='text-xl font-bold text-white mb-4 leading-tight'>{gig.lugar}</h3>
              {gig.link_tiquetes ? (
                <a href={gig.link_tiquetes} target='_blank' rel='noopener noreferrer' className='block w-full py-3 bg-nardo-800 hover:bg-nardo-500 text-center text-white font-bold text-sm rounded transition-colors'>
                  GET TICKETS <FontAwesomeIcon icon={faTicketAlt} className='ml-2' />
                </a>
              ) : (
                <span className='block w-full py-3 border border-gray-700 text-center text-gray-500 font-bold text-sm rounded'>SOLD OUT</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default GigsWidget;