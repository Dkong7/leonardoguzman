import { useEffect, useState, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import pb from '../lib/pocketbase'; 
import { CartContext } from '../context/CartContext';
import type { CartItem } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { ThemeContext } from '../context/ThemeContext'; // 1. Importar Contexto Tema
import SpaceBackground from '../components/SpaceBackground'; // 2. Importar Fondo Espacial
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faShoppingCart, faImages, faTimes, faSpinner, faShirt, faArrowRight
} from '@fortawesome/free-solid-svg-icons';

const Tienda = () => {
  const { t, lang } = useLanguage();
  const { theme } = useContext(ThemeContext); // 3. Usar el tema
  const { addToCart } = useContext(CartContext);
  
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [activeImage, setActiveImage] = useState<string>('');

  const isDark = theme === 'purple'; // Helper para lógica rápida

  useEffect(() => {
    const fetchData = async () => {
       try {
           const records = await pb.collection('tienda').getFullList({
               sort: '-created'
           });
           setProducts(records);
       } catch (e) {
           console.error("Error cargando tienda:", e);
       } finally {
           setLoading(false);
       }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedItem) {
      setActiveImage(selectedItem.imagen ? pb.files.getUrl(selectedItem, selectedItem.imagen) : '/placeholder.jpg');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [selectedItem]);

  const getName = (prod: any) => (lang === 'EN' && prod.nombre_en ? prod.nombre_en : prod.nombre);
  const getDescription = (prod: any) => (lang === 'EN' && prod.descripcion_en ? prod.descripcion_en : prod.descripcion);

  const renderPrice = (prod: any, large = false) => {
    // Color de texto dinámico para el precio
    const priceColor = isDark ? 'text-white' : 'text-purple-900';
    const labelColor = isDark ? 'text-purple-400' : 'text-purple-600';

    if (lang === 'EN') {
        return (
            <div className="flex flex-col">
                <span className={`${priceColor} font-mono font-bold leading-none drop-shadow-md ${large ? 'text-4xl' : 'text-xl'}`}>
                    ${prod.precio_usd}
                </span>
                <span className={`${labelColor} font-bold ${large ? 'text-sm' : 'text-[10px]'}`}>USD</span>
            </div>
        );
    } else {
        return (
            <div className="flex flex-col">
                <span className={`${priceColor} font-mono font-bold leading-none drop-shadow-md ${large ? 'text-3xl' : 'text-xl'}`}>
                    ${(prod.precio_cop || 0).toLocaleString('es-CO')}
                </span>
                <span className={`${labelColor} font-bold ${large ? 'text-sm' : 'text-[10px]'}`}>COP</span>
            </div>
        );
    }
  };

  const handleAddToCart = (record: any, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const item: CartItem = {
      id: record.id,
      nombre: getName(record),
      precioUSD: record.precio_usd,
      precioCOP: record.precio_cop,
      imagen: record.imagen ? pb.files.getUrl(record, record.imagen) : '',
      categoria: record.tipo,
      descripcion: getDescription(record),
      cantidad: 1
    };
    addToCart(item);
  };

  const merchAudioItems = products.filter(i => i.tipo !== 'academico'); 

  // --- ESTILOS DINÁMICOS (GLASS & NEUMORPHISM) ---
  
  // Fondo base de la tarjeta
  const cardBase = isDark 
    ? "bg-white/5 border-white/10 hover:border-purple-500/50 hover:bg-white/10 text-white shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]" // Dark Glass
    : "bg-white/70 border-purple-200 hover:border-purple-500/50 hover:bg-white text-gray-900 shadow-[8px_8px_16px_#d1d5db,-8px_-8px_16px_#ffffff]"; // Light Neumorphism (Soft)

  // Botón pequeño (Carrito)
  const btnSmall = isDark
    ? "bg-white/5 text-gray-200 shadow-[inset_1px_1px_5px_rgba(255,255,255,0.1),inset_-1px_-1px_5px_rgba(0,0,0,0.5)] hover:text-white hover:bg-purple-600/40"
    : "bg-gray-100 text-purple-700 shadow-[3px_3px_6px_#b8b9be,-3px_-3px_6px_#ffffff] hover:text-purple-900 hover:shadow-[inset_2px_2px_5px_#b8b9be,inset_-2px_-2px_5px_#ffffff]";

  // Texto Secundario
  const textSub = isDark ? "text-gray-400 group-hover:text-purple-300" : "text-gray-600 group-hover:text-purple-600";

  if (loading) return (
    <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#0a0510] text-purple-500' : 'bg-gray-100 text-purple-600'}`}>
        <FontAwesomeIcon icon={faSpinner} spin size="3x" />
    </div>
  );

  return (
    <div className={`min-h-screen font-sans relative pb-20 transition-colors duration-500 ${isDark ? 'bg-transparent' : 'bg-gray-50'}`}>
      
      {/* 4. FONDO ESPACIAL (Solo visible si el bg principal es transparente o en modo dark) */}
      {isDark && <SpaceBackground />} 

      {/* Degradado sutil para modo claro para que no se vea plano */}
      {!isDark && <div className="absolute inset-0 bg-gradient-to-b from-white via-gray-100 to-gray-200 -z-10" />}

      <style>{`
        .font-espacial { font-family: 'Orbitron', sans-serif; }
        .section-divider { display: flex; align-items: center; gap: 1.5rem; margin-bottom: 2.5rem; }
        .divider-line { flex: 1; height: 1px; background: linear-gradient(90deg, transparent, ${isDark ? 'rgba(168, 85, 247, 0.5)' : 'rgba(126, 34, 206, 0.3)'}, transparent); }
        .divider-title { font-family: 'Orbitron', sans-serif; font-size: 1.5rem; letter-spacing: 0.2em; text-transform: uppercase; }
      `}</style>

      {/* HEADER */}
      <div className='pt-36 pb-12 max-w-7xl mx-auto px-4 text-center relative z-10'>
         <h2 className={`text-5xl md:text-7xl font-espacial font-bold mb-6 tracking-tighter ${isDark ? 'text-white drop-shadow-[0_0_25px_rgba(168,85,247,0.5)]' : 'text-purple-900 drop-shadow-sm'}`}>
            {t('official_store')} 
         </h2>
         <p className={`uppercase tracking-[0.3em] text-sm max-w-2xl mx-auto border-t border-b py-4 ${isDark ? 'text-gray-400 border-white/10' : 'text-gray-600 border-purple-200'}`}>
            {t('store_subtitle')}
         </p>
      </div>

      {/* --- GRID: MERCH & AUDIO --- */}
      {merchAudioItems.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 mb-24 relative z-10">
            <div className="section-divider">
                <div className="divider-line"></div>
                <h3 className={`divider-title flex items-center gap-3 ${isDark ? 'text-purple-400 text-shadow-[0_0_20px_rgba(168,85,247,0.8)]' : 'text-purple-700'}`}>
                    <FontAwesomeIcon icon={faShirt} /> {t('section_merch')} & Audio
                </h3>
                <div className="divider-line"></div>
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8'>
                {merchAudioItems.map((item) => (
                    <div 
                        key={item.id} 
                        onClick={() => setSelectedItem(item)} 
                        className={`group relative cursor-pointer flex flex-col h-full rounded-2xl overflow-hidden transition-all duration-500 hover:-translate-y-2 backdrop-blur-sm z-10 ${cardBase}`}
                    >
                        {/* Imagen Vertical */}
                        <div className="relative aspect-[3/4] overflow-hidden">
                            <img 
                                src={item.imagen ? pb.files.getUrl(item, item.imagen) : '/placeholder.jpg'} 
                                alt={item.nombre} 
                                className='w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-95 group-hover:opacity-100' 
                            />
                            {/* Overlay dinámico */}
                            <div className={`absolute inset-0 bg-gradient-to-t via-transparent to-transparent ${isDark ? 'from-[#0f0a15] opacity-80' : 'from-white opacity-40'}`}></div>
                            
                            <div className="absolute top-3 left-3">
                                <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border backdrop-blur-md ${isDark ? 'text-white/90 bg-black/40 border-white/10' : 'text-purple-900 bg-white/60 border-purple-200'}`}>
                                    {item.tipo}
                                </span>
                            </div>
                        </div>

                        {/* Info */}
                        <div className={`p-5 flex-1 flex flex-col justify-between backdrop-blur-[2px] ${isDark ? 'bg-gradient-to-b from-white/0 to-black/40' : 'bg-white/30'}`}>
                            <h3 className={`font-espacial text-sm mb-1 leading-tight line-clamp-2 transition-colors ${isDark ? 'text-white group-hover:text-purple-300' : 'text-gray-900 group-hover:text-purple-600'}`}>
                                {getName(item)}
                            </h3>
                            
                            <div className='mt-4 flex items-center justify-between'>
                                {renderPrice(item)}
                                <button 
                                    onClick={(e) => handleAddToCart(item, e)}
                                    className={`h-10 w-10 flex items-center justify-center rounded-full transition-all duration-300 active:scale-95 ${btnSmall}`}
                                >
                                    <FontAwesomeIcon icon={faShoppingCart} size="sm" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}

      {/* --- MODAL UNIFICADO --- */}
      <AnimatePresence>
        {selectedItem && (
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className={`fixed inset-0 z-[9999] flex items-start justify-center p-4 overflow-y-auto ${isDark ? 'bg-black/60' : 'bg-white/40'} backdrop-blur-sm`}
                onClick={() => setSelectedItem(null)}
            >
                <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                    className={`relative w-full max-w-5xl rounded-3xl overflow-hidden flex flex-col md:flex-row border mt-20 md:mt-32 mb-10 shadow-2xl backdrop-blur-xl
                        ${isDark 
                            ? 'bg-[rgba(20,10,30,0.65)] border-white/20 shadow-[0_0_100px_rgba(139,92,246,0.15)]' 
                            : 'bg-[rgba(255,255,255,0.85)] border-purple-200 shadow-[0_20px_50px_rgba(0,0,0,0.1)]'
                        }
                    `}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button 
                        onClick={() => setSelectedItem(null)} 
                        className={`absolute top-4 right-4 z-50 h-10 w-10 rounded-full flex items-center justify-center border shadow-lg cursor-pointer transition-all backdrop-blur-md 
                            ${isDark 
                                ? 'bg-white/10 text-white hover:bg-red-500/80 border-white/20' 
                                : 'bg-white text-gray-500 hover:text-red-500 border-gray-200'
                            }`}
                    >
                        <FontAwesomeIcon icon={faTimes} size="lg" />
                    </button>

                    {/* Galería (Izquierda) */}
                    <div className={`w-full md:w-2/3 p-6 flex items-center justify-center relative min-h-[400px] ${isDark ? 'bg-black/40' : 'bg-gray-100/50'}`}>
                         <img 
                            src={activeImage} 
                            className="max-h-[500px] w-auto object-contain drop-shadow-2xl"
                            alt="Preview"
                         />
                         
                         {/* Miniaturas */}
                         {selectedItem.galeria && selectedItem.galeria.length > 0 && (
                             <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 p-3 rounded-2xl border overflow-x-auto max-w-[90%] backdrop-blur-md
                                ${isDark ? 'bg-black/60 border-white/10' : 'bg-white/60 border-gray-200'}
                             `}>
                                 <button 
                                    onClick={() => setActiveImage(selectedItem.imagen ? pb.files.getUrl(selectedItem, selectedItem.imagen) : '/placeholder.jpg')}
                                    className={`h-16 w-16 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${activeImage.includes(selectedItem.imagen) ? 'border-purple-500' : 'border-transparent hover:border-gray-400'}`}
                                 >
                                     <img src={selectedItem.imagen ? pb.files.getUrl(selectedItem, selectedItem.imagen) : '/placeholder.jpg'} className="w-full h-full object-cover" />
                                 </button>
                                 {selectedItem.galeria.map((img: string, idx: number) => {
                                     const url = pb.files.getUrl(selectedItem, img);
                                     return (
                                        <button 
                                            key={idx}
                                            onClick={() => setActiveImage(url)}
                                            className={`h-16 w-16 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${activeImage === url ? 'border-purple-500' : 'border-transparent hover:border-gray-400'}`}
                                        >
                                            <img src={url} className="w-full h-full object-cover" />
                                        </button>
                                     );
                                 })}
                             </div>
                         )}
                    </div>

                    {/* Info (Derecha) */}
                    <div className={`w-full md:w-1/3 p-8 md:p-12 flex flex-col border-l ${isDark ? 'border-white/5 bg-transparent' : 'border-gray-200 bg-white/40'}`}>
                        <h2 className={`text-3xl font-espacial mb-4 leading-none uppercase drop-shadow-lg ${isDark ? 'text-white' : 'text-purple-900'}`}>
                            {getName(selectedItem)}
                        </h2>
                        
                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar max-h-[300px] mb-8">
                            <div 
                                className={`text-sm leading-relaxed font-light tracking-wide ${isDark ? 'text-gray-200' : 'text-gray-700'}`}
                                dangerouslySetInnerHTML={{ __html: getDescription(selectedItem) }} 
                            />
                        </div>

                        <div className={`mt-auto pt-6 border-t ${isDark ? 'border-white/10' : 'border-purple-200'}`}>
                            <div className="flex items-end gap-3 mb-6">
                                {renderPrice(selectedItem, true)}
                            </div>
                            
                            <button 
                                onClick={(e) => handleAddToCart(selectedItem, e)}
                                className={`w-full py-4 flex items-center justify-center gap-3 text-sm uppercase tracking-widest font-bold rounded-xl shadow-lg transition-all active:scale-95
                                    ${isDark 
                                        ? 'bg-purple-600/30 text-white hover:bg-purple-600/60 border border-purple-500/40 shadow-[0_0_20px_rgba(139,92,246,0.3)]' 
                                        : 'bg-purple-600 text-white hover:bg-purple-700 shadow-purple-200'
                                    }`}
                            >
                                <FontAwesomeIcon icon={faShoppingCart} /> {t('add_to_cart')}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Tienda;