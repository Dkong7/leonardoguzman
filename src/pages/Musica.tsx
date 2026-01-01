import { useEffect, useState } from 'react';
import pb from '../lib/pocketbase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faShoppingCart } from '@fortawesome/free-solid-svg-icons';

const Musica = () => {
  const [albums, setAlbums] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
       try {
           const records = await pb.collection('musica').getFullList({ sort: 'orden' });
           
           const mappedAlbums = records.map((a: any) => ({
               ...a,
               url_audio: a.audio ? pb.files.getUrl(a, a.audio) : a.url_audio,
               url_cover: a.cover ? pb.files.getUrl(a, a.cover) : a.url_cover
           }));

           setAlbums(mappedAlbums);
       } catch (e) {
           console.error(e);
       }
    };
    fetch();
  }, []);

  return (
    <div className='pt-32 min-h-screen bg-nardo-950 px-4'>
      <div className='max-w-7xl mx-auto'>
         <h1 className='text-6xl font-serif font-bold text-white mb-12 text-center'>DISCOGRAPHY</h1>
         <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 pb-20'>
            {albums.map((album) => (
              <div key={album.id} className='group bg-nardo-900 rounded-xl overflow-hidden shadow-2xl hover:scale-[1.02] transition-transform duration-300'>
                 <div className='relative overflow-hidden'>
                    <img src={album.url_cover} alt={album.titulo} className='w-full aspect-square object-cover' />
                    <div className='absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-4'>
                       <a href={album.url_audio} target='_blank' className='w-16 h-16 bg-nardo-500 rounded-full flex items-center justify-center text-white hover:scale-110 transition-transform'><FontAwesomeIcon icon={faPlay} size='lg'/></a>
                       <button className='px-6 py-2 border border-white text-white font-bold text-sm hover:bg-white hover:text-black transition-colors rounded-full'>STREAM</button>
                    </div>
                 </div>
                 <div className='p-6'>
                    <h2 className='text-2xl font-bold text-white mb-1'>{album.titulo}</h2>
                    <p className='text-nardo-500 text-sm font-bold tracking-widest mb-4'>{album.artista}</p>
                    <div className='flex justify-between items-center border-t border-nardo-800 pt-4'>
                       <span className='text-gray-500 text-xs'>RELEASED 2024</span>
                       <a href='/tienda' className='text-white hover:text-nardo-400'><FontAwesomeIcon icon={faShoppingCart} /> BUY</a>
                    </div>
                 </div>
              </div>
            ))}
         </div>
      </div>
    </div>
  );
};
export default Musica;
