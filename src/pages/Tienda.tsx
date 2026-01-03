import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import pb from '../lib/pocketbase'; 
import ProgramasNeon from '../components/ProgramasNeon'; 
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShoppingCart, faChevronDown, faChevronUp, faGraduationCap, faEye, faImages, faArrowLeft, faArrowRight, faTimes } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../context/LanguageContext';

const Tienda = () => {
  const { t, lang } = useLanguage();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showClasses, setShowClasses] = useState(false);
  
  // Tasa de cambio (Default 4150 por si falla la API)
  const [exchangeRate, setExchangeRate] = useState(4150);

  // Un solo estado para el modal (funciona para Academic y Merch)
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [currentGalleryIndex, setCurrentGalleryIndex] = useState(0);
  const [buyingId, setBuyingId] = useState<string | null>(null);

  // 1. Cargar Tasa de Cambio (Dólar hoy)
  useEffect(() => {
    fetch('https://api.exchangerate-api.com/v4/latest/USD')
        .then(res => res.json())
        .then(data => {
            if(data && data.rates && data.rates.COP) {
                setExchangeRate(data.rates.COP);
            }
        })
        .catch(err => console.error("Error fetching rates", err));
  }, []);

  // 2. Cargar Productos
  useEffect(() => {
    const fetch = async () => {
       try {
           const records = await pb.collection('tienda').getFullList({
               sort: '-created'
           });
           
           const mappedItems = records.map((i: any) => ({
               ...i,
               imagen_url: i.imagen ? pb.files.getUrl(i, i.imagen) : '/placeholder.jpg',
               galeria_urls: i.galeria ? i.galeria.map((file: string) => pb.files.getUrl(i, file)) : [],
               // Textos traducidos
               nombre_display: lang === 'EN' && i.nombre_en ? i.nombre_en : i.nombre,
               desc_display: lang === 'EN' && i.descripcion_en ? i.descripcion_en : i.descripcion,
               // Precios calculados
               precio_cop_final: i.precio_usd, // Asumimos que en la DB escribes PESOS
               precio_usd_calc: (i.precio_usd / exchangeRate).toFixed(2) // Conversión automática
           }));

           setItems(mappedItems);
       } catch (e) {
           console.error("Error tienda:", e);
       } finally {
           setLoading(false);
       }
    };
    fetch();
  }, [lang, exchangeRate]); // Recalcular si cambia idioma o tasa

  // 3. Manejar Pago (Mercado Pago)
  const handleBuy = async (item: any) => {
    try {
        setBuyingId(item.id);
        const response = await fetch('http://127.0.0.1:3000/create_preference', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                items: [
                    {
                        id: item.id,
                        title: item.nombre,
                        quantity: 1,
                        currency_id: 'COP', 
                        // Enviamos el precio tal cual está en la DB (COP), sin multiplicar
                        unit_price: Number(item.precio_usd)
                    }
                ]
            })
        });

        const data = await response.json();

        if (data.init_point) {
            window.location.href = data.init_point;
        } else {
            alert("Error: " + (data.error || "No se generó el link"));
        }

    } catch (error) {
        alert("Error de conexión. Asegúrate que 'node index.js' esté corriendo.");
    } finally {
        setBuyingId(null);
    }
  };

  const academicItems = items.filter(i => i.tipo === 'academico');
  const merchItems = items.filter(i => i.tipo === 'merch');

  // Lógica de Galería
  const openModal = (item: any) => {
      setSelectedItem(item);
      setCurrentGalleryIndex(0);
  };

  const nextImage = () => {
    if (selectedItem?.galeria_urls) {
        setCurrentGalleryIndex((prev) => (prev + 1) % selectedItem.galeria_urls.length);
    }
  };
  const prevImage = () => {
    if (selectedItem?.galeria_urls) {
        setCurrentGalleryIndex((prev) => (prev - 1 + selectedItem.galeria_urls.length) % selectedItem.galeria_urls.length);
    }
  };

  return (
    <div className='min-h-screen bg-nardo-950 font-sans relative'>
      
      {/* SECCIÓN TIENDA */}
      <div className='pt-32 pb-20 max-w-7xl mx-auto px-4'>
         <h2 className='text-5xl font-serif font-bold text-white mb-4 text-center tracking-tighter'>
            {t('store_title')}
         </h2>
         <p className='text-center text-gray-400 mb-16 uppercase tracking-widest text-sm'>
            {t('store_subtitle')}
         </p>
         
         {loading ? (
             <div className="text-center text-nardo-500 animate-pulse font-mono">LOADING...</div>
         ) : (
             <div className="space-y-24">
                
                {/* --- ACADÉMICO (AZUL NEÓN) - AHORA CON MODAL --- */}
                {academicItems.length > 0 && (
                    <div>
                        <h3 className="text-2xl font-black text-cyan-400 mb-8 border-l-4 border-cyan-500 pl-4 uppercase tracking-widest shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                            {t('section_academy')}
                        </h3>
                        <div className='grid grid-cols-1 md:grid-cols-3 gap-12'>
                            {academicItems.map((item) => (
                            <div key={item.id} className='group h-[450px]'>
                                <div className='bg-gray-900 rounded-xl overflow-hidden border border-cyan-900 group-hover:border-cyan-500 transition-all duration-300 shadow-lg group-hover:shadow-[0_0_30px_rgba(6,182,212,0.3)] h-full flex flex-col relative'>
                                    {/* Imagen Clickeable */}
                                    <div className='h-full overflow-hidden relative cursor-pointer flex-grow' onClick={() => openModal(item)}>
                                        <img src={item.imagen_url} alt={item.nombre} className='w-full h-full object-cover transition-transform duration-700 group-hover:scale-110' />
                                        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-80"></div>
                                        
                                        {/* Badge Galería */}
                                        <div className="absolute bottom-4 right-4 bg-cyan-900/90 text-white text-xs px-3 py-1 rounded-full flex items-center gap-2 border border-cyan-500">
                                            <FontAwesomeIcon icon={faImages} /> {t('view_gallery')}
                                        </div>
                                    </div>
                                    
                                    {/* Info Card */}
                                    <div className="relative z-10 p-6 bg-gray-900 border-t border-cyan-900/50">
                                        <h3 className='text-xl font-bold text-white mb-2 uppercase leading-tight h-14 overflow-hidden'>{item.nombre_display}</h3>
                                        <div className='flex justify-between items-end'>
                                            <div className="flex flex-col">
                                                <span className='text-xs text-gray-500 uppercase font-bold'>Precio</span>
                                                <span className='text-cyan-400 font-bold text-2xl'>
                                                    {lang === 'EN' ? `$${item.precio_usd_calc}` : `$${new Intl.NumberFormat('es-CO').format(item.precio_cop_final)}`} 
                                                    <span className="text-sm ml-1">{t('currency_label')}</span>
                                                </span>
                                            </div>
                                            <button 
                                                onClick={() => openModal(item)}
                                                className='bg-cyan-900/50 border border-cyan-500 text-cyan-300 hover:bg-cyan-500 hover:text-white px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition-all'
                                            >
                                                {t('view_details')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- MERCH (PÚRPURA NEÓN) --- */}
                {merchItems.length > 0 && (
                    <div>
                        <h3 className="text-2xl font-black text-purple-400 mb-8 border-l-4 border-purple-500 pl-4 uppercase tracking-widest shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                            {t('section_merch')}
                        </h3>
                        <div className='grid grid-cols-1 md:grid-cols-3 gap-12'>
                            {merchItems.map((item) => (
                            <div key={item.id} className='group h-[450px]'>
                                <div className='bg-gray-900 rounded-xl overflow-hidden border border-purple-900 group-hover:border-purple-500 transition-all duration-300 shadow-lg group-hover:shadow-[0_0_30px_rgba(168,85,247,0.2)] h-full flex flex-col'>
                                     <div className='h-full overflow-hidden relative cursor-pointer flex-grow' onClick={() => openModal(item)}>
                                        <img src={item.imagen_url} alt={item.nombre} className='w-full h-full object-cover transition-transform duration-700 group-hover:scale-110' />
                                        <div className="absolute inset-0 bg-black/30 group-hover:bg-transparent transition-colors"></div>
                                        
                                        <div className="absolute bottom-4 right-4 bg-purple-900/90 text-white text-xs px-3 py-1 rounded-full flex items-center gap-2 border border-purple-500">
                                            <FontAwesomeIcon icon={faImages} /> {t('view_gallery')}
                                        </div>
                                     </div>
                                     
                                     <div className='p-6 text-center bg-black relative z-20 border-t border-purple-900/50'>
                                        <h3 className='text-lg font-bold text-white mb-2 uppercase truncate'>{item.nombre_display}</h3>
                                        <p className="text-purple-400 font-bold mb-4 text-xl">
                                            {lang === 'EN' ? `$${item.precio_usd_calc}` : `$${new Intl.NumberFormat('es-CO').format(item.precio_cop_final)}`}
                                            <span className="text-sm ml-1">{t('currency_label')}</span>
                                        </p>
                                        
                                        <button 
                                            onClick={() => openModal(item)}
                                            className='w-full border border-purple-600 text-purple-400 hover:bg-purple-600 hover:text-white py-2 rounded font-bold uppercase text-xs transition-all tracking-wider'
                                        >
                                            {t('view_details')}
                                        </button>
                                     </div>
                                </div>
                            </div>
                            ))}
                        </div>
                    </div>
                )}
             </div>
         )}
      </div>

      {/* --- MODAL UNIFICADO (PARA AMBOS TIPOS) --- */}
      <AnimatePresence>
        {selectedItem && (
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
                onClick={() => setSelectedItem(null)}
            >
                <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                    // Borde dinámico según el tipo (Cyan o Purple)
                    className={`bg-gray-900 border ${selectedItem.tipo === 'academico' ? 'border-cyan-500 shadow-[0_0_50px_rgba(6,182,212,0.3)]' : 'border-purple-500 shadow-[0_0_50px_rgba(168,85,247,0.3)]'} rounded-2xl max-w-5xl w-full overflow-hidden flex flex-col md:flex-row`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Galería */}
                    <div className="w-full md:w-2/3 bg-black relative h-[400px] md:h-[550px] flex items-center justify-center">
                         <img 
                            src={selectedItem.galeria_urls && selectedItem.galeria_urls.length > 0 
                                ? selectedItem.galeria_urls[currentGalleryIndex] 
                                : selectedItem.imagen_url} 
                            className="max-h-full max-w-full object-contain"
                         />
                         
                         {/* Flechas Galería */}
                         {selectedItem.galeria_urls && selectedItem.galeria_urls.length > 1 && (
                            <>
                                <button onClick={prevImage} className={`absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-3 rounded-full transition-colors ${selectedItem.tipo === 'academico' ? 'hover:bg-cyan-600' : 'hover:bg-purple-600'}`}><FontAwesomeIcon icon={faArrowLeft}/></button>
                                <button onClick={nextImage} className={`absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-3 rounded-full transition-colors ${selectedItem.tipo === 'academico' ? 'hover:bg-cyan-600' : 'hover:bg-purple-600'}`}><FontAwesomeIcon icon={faArrowRight}/></button>
                            </>
                         )}
                    </div>
                    
                    {/* Info Lateral */}
                    <div className={`w-full md:w-1/3 p-8 flex flex-col bg-gray-900 border-l ${selectedItem.tipo === 'academico' ? 'border-cyan-900' : 'border-purple-900'}`}>
                        <div className="flex justify-between items-start mb-6">
                            <h3 className="text-2xl font-black text-white uppercase leading-none">{selectedItem.nombre_display}</h3>
                            <button onClick={() => setSelectedItem(null)} className="text-gray-500 hover:text-white"><FontAwesomeIcon icon={faTimes} size="lg"/></button>
                        </div>
                        
                        <p className="text-gray-400 text-sm leading-relaxed mb-8 flex-grow custom-scrollbar overflow-y-auto pr-2">
                            {selectedItem.desc_display}
                        </p>
                        
                        <div className="mt-auto">
                            <div className={`text-3xl font-bold mb-6 ${selectedItem.tipo === 'academico' ? 'text-cyan-400' : 'text-purple-400'}`}>
                                {lang === 'EN' ? `$${selectedItem.precio_usd_calc}` : `$${new Intl.NumberFormat('es-CO').format(selectedItem.precio_cop_final)}`}
                                <span className="text-sm ml-1 text-gray-500">{t('currency_label')}</span>
                            </div>
                            
                            <button 
                                onClick={() => handleBuy(selectedItem)}
                                className={`w-full py-4 text-white font-black rounded shadow-lg transition-all uppercase tracking-widest flex justify-center items-center gap-3 ${
                                    selectedItem.tipo === 'academico' 
                                    ? 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-500/30' 
                                    : 'bg-purple-600 hover:bg-purple-500 shadow-purple-500/30'
                                }`}
                            >
                                {buyingId === selectedItem.id ? t('processing') : <><FontAwesomeIcon icon={faShoppingCart} /> {t('buy_now')}</>}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* CLASES NEÓN (EXPANDIBLE) */}
      <div className='border-t border-nardo-900/50 bg-black relative z-10'>
          <button 
            onClick={() => setShowClasses(!showClasses)}
            className='w-full py-8 flex flex-col items-center justify-center group hover:bg-nardo-900/10 transition-colors cursor-pointer outline-none border-b border-nardo-900/30'
          >
             <h3 className='text-3xl font-black text-white uppercase tracking-tighter mb-2 group-hover:text-nardo-400 transition-colors flex items-center gap-3'>
                 <FontAwesomeIcon icon={faGraduationCap} className="text-nardo-500 animate-pulse" />
                 {t('custom_classes')}
             </h3>
             
             <div className={`flex items-center gap-2 text-sm font-bold tracking-widest uppercase transition-all duration-500 ${!showClasses ? 'text-nardo-400 animate-pulse' : 'text-gray-500'}`}>
                 {showClasses ? t('click_close') : t('click_open')} 
                 <FontAwesomeIcon icon={showClasses ? faChevronUp : faChevronDown} className={`transition-transform duration-300 ${showClasses ? 'rotate-180' : ''}`} />
             </div>
          </button>

          <div className={`overflow-hidden transition-all duration-700 ease-in-out ${showClasses ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'}`}>
              <ProgramasNeon />
          </div>
      </div>

    </div>
  );
};

export default Tienda;