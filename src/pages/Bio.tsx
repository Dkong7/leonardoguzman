import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrophy, faGlobe, faUsers, faBolt } from '@fortawesome/free-solid-svg-icons';

const Bio = () => {
  return (
    <div className='pt-32 min-h-screen bg-nardo-950 text-white px-4 pb-20'>
       <div className='max-w-6xl mx-auto'>
          <div className='text-center mb-20'>
             <h1 className='text-6xl font-serif font-bold mb-4'>LEONARDO <span className='text-nardo-500'>GUZMAN</span></h1>
             <p className='text-xl text-gray-400 tracking-widest'>THE JOURNEY</p>
          </div>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-12 relative'>
             <div className='absolute left-1/2 top-0 bottom-0 w-px bg-nardo-800 hidden md:block'></div>
             <div className='text-right pr-12 relative hidden md:block'>
                <h3 className='text-2xl font-bold text-white'>2010</h3>
                <p className='text-gray-400'>Fundación de Guitarrosis</p>
             </div>
             <div className='pl-12 border-l border-nardo-800 md:border-none relative pb-12'>
                <div className='absolute -left-[5px] md:-left-[5px] top-2 w-3 h-3 bg-nardo-500 rounded-full'></div>
                <FontAwesomeIcon icon={faUsers} className='text-3xl text-nardo-500 mb-4' />
                <h3 className='text-xl font-bold text-white mb-2'>GUITARROSIS COMMUNITY</h3>
                <p className='text-gray-400 text-sm'>Creación de una de las primeras comunidades online de guitarra en LATAM.</p>
             </div>
             <div className='text-right pr-12 relative border-r border-nardo-800 md:border-none pb-12 hidden md:block'>
                <div className='absolute -right-[5px] top-2 w-3 h-3 bg-red-500 rounded-full'></div>
                <FontAwesomeIcon icon={faTrophy} className='text-3xl text-red-500 mb-4' />
                <h3 className='text-xl font-bold text-white mb-2'>WORLD COMPETITIONS</h3>
                <p className='text-gray-400 text-sm'>5 Primeros Lugares Mundiales. Reconocido por jueces como Jason Becker.</p>
             </div>
             <div className='pl-12 hidden md:block'><h3 className='text-2xl font-bold text-white'>2013-2015</h3></div>
             <div className='hidden md:block text-right pr-12'><h3 className='text-2xl font-bold text-white'>2016-2024</h3></div>
             <div className='pl-12 border-l border-nardo-800 md:border-none relative pb-12'>
                <div className='absolute -left-[5px] top-2 w-3 h-3 bg-blue-500 rounded-full'></div>
                <FontAwesomeIcon icon={faGlobe} className='text-3xl text-blue-500 mb-4' />
                <h3 className='text-xl font-bold text-white mb-2'>INTERNATIONAL TOUR</h3>
                <p className='text-gray-400 text-sm'>NAMM Show (USA), Masterclasses en Japón, Ecuador y Colombia.</p>
             </div>
          </div>
          <div className='text-center mt-20 p-8 bg-nardo-900 rounded-xl border border-nardo-800'>
             <FontAwesomeIcon icon={faBolt} className='text-4xl text-yellow-500 mb-4' />
             <h3 className='text-2xl font-bold text-white mb-4'>ESTILO & SONIDO</h3>
             <p className='max-w-2xl mx-auto text-gray-400'>Una fusión perfecta entre la precisión técnica y el alma del folclor.</p>
          </div>
       </div>
    </div>
  );
};
export default Bio;