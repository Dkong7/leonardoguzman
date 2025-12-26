import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import ProgramasNeon from '../components/ProgramasNeon';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShoppingCart } from '@fortawesome/free-solid-svg-icons';

const Tienda = () => {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
       const { data } = await supabase.from('tienda').select('*').neq('categoria', 'Servicios').order('precio_usd', { ascending: false });
       if(data) setItems(data);
    };
    fetch();
  }, []);

  return (
    <div className='pt-24 min-h-screen bg-nardo-950'>
      
      {/* 1. SECCIÓN DE CLASES (Nuevo Diseño 12 Pasos) */}
      <ProgramasNeon />

      {/* 2. MERCH STORE */}
      <div className='max-w-7xl mx-auto px-4 py-20 border-t border-nardo-900'>
         <h2 className='text-4xl font-serif font-bold text-white mb-12 text-center'>STORE & <span className='text-nardo-500'>MERCH</span></h2>
         
         <div className='grid grid-cols-1 md:grid-cols-3 gap-10'>
            {items.map((item) => (
              <div key={item.id} className='bg-nardo-900 rounded-xl overflow-hidden border border-nardo-800 group hover:border-nardo-500 transition-all'>
                 <div className='h-64 overflow-hidden relative'>
                    <img src={item.imagen_url} alt={item.nombre} className='w-full h-full object-cover transition-transform duration-500 group-hover:scale-110' />
                    <div className='absolute top-2 right-2 bg-black/80 text-white text-xs font-bold px-3 py-1 rounded-full'>${item.precio_usd} USD</div>
                 </div>
                 <div className='p-6'>
                    <h3 className='text-xl font-bold text-white mb-2'>{item.nombre}</h3>
                    <p className='text-gray-400 text-sm mb-6'>{item.descripcion}</p>
                    <a href={item.link_pago} target='_blank' className='w-full py-3 bg-white text-black font-bold text-sm rounded flex items-center justify-center gap-2 hover:bg-nardo-400 hover:text-white transition-colors'>
                       <FontAwesomeIcon icon={faShoppingCart} /> COMPRAR
                    </a>
                 </div>
              </div>
            ))}
         </div>
      </div>
    </div>
  );
};
export default Tienda;