import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import pb from '../lib/pocketbase';
import { CartContext } from '../context/CartContext';
import type { CartItem } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faCartPlus, faArrowRight, faMusic, faShirt, faSpinner, faImages, faEye } from '@fortawesome/free-solid-svg-icons';

const HomeStorePreview = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [activeImage, setActiveImage] = useState<string>('');
  
  const { addToCart } = useContext(CartContext);
  const { lang, t } = useLanguage();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const records = await pb.collection('tienda').getList(1, 8, {
          filter: 'tipo != "academico"', 
          sort: '-created',
        });
        setProducts(records.items);
      } catch (error) {
        console.error("Error cargando tienda:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // Al abrir un producto, establecer la imagen principal y prevenir scroll del body
  useEffect(() => {
    if (selectedProduct) {
      setActiveImage(selectedProduct.imagen ? pb.files.getUrl(selectedProduct, selectedProduct.imagen) : '/placeholder.jpg');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [selectedProduct]);

  // --- HELPERS DE DATOS SEGÚN IDIOMA ---
  const getName = (prod: any) => {
    if (lang === 'EN' && prod.nombre_en) return prod.nombre_en;
    return prod.nombre;
  };

  const getDescription = (prod: any) => {
    if (lang === 'EN' && prod.descripcion_en) return prod.descripcion_en;
    return prod.descripcion;
  };

  // --- LOGICA CARRITO ---
  const handleAddToCart = (record: any, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const item: CartItem = {
      id: record.id,
      nombre: getName(record), // Guardamos el nombre en el idioma actual
      precioUSD: record.precio_usd,
      precioCOP: record.precio_cop,
      imagen: record.imagen ? pb.files.getUrl(record, record.imagen) : '',
      categoria: record.tipo,
      descripcion: getDescription(record),
      cantidad: 1
    };
    addToCart(item);
  };

  const musicProducts = products.filter(p => ['audio', 'musica', 'preset', 'plugin'].includes(p.tipo));
  const merchProducts = products.filter(p => ['merch', 'ropa', 'accesorio'].includes(p.tipo));

  // --- ESTILOS ---
  const buttonNeumorphic = "relative overflow-hidden rounded-xl bg-white/5 text-gray-200 font-bold shadow-[inset_1px_1px_5px_rgba(255,255,255,0.1),inset_-1px_-1px_5px_rgba(0,0,0,0.5)] hover:text-white hover:bg-purple-600/40 hover:shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all duration-300 active:scale-95 border border-white/10 cursor-pointer z-40";
  const cardGlass = "group relative cursor-pointer flex flex-col h-full rounded-2xl overflow-hidden transition-all duration-500 hover:-translate-y-2 border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-purple-500/30 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] z-10";

  // --- RENDER PRECIO ---
  const renderPrice = (prod: any, large = false) => {
    if (lang === 'EN') {
        return (
            <div className="flex flex-col">
                <span className={`text-white font-mono font-bold leading-none drop-shadow-md ${large ? 'text-4xl' : 'text-lg'}`}>
                    ${prod.precio_usd}
                </span>
                <span className={`text-purple-400 font-bold ${large ? 'text-sm' : 'text-[10px]'}`}>USD</span>
            </div>
        );
    } else {
        return (
            <div className="flex flex-col">
                <span className={`text-white font-mono font-bold leading-none drop-shadow-md ${large ? 'text-3xl' : 'text-lg'}`}>
                    ${(prod.precio_cop || 0).toLocaleString('es-CO')}
                </span>
                <span className={`text-purple-400 font-bold ${large ? 'text-sm' : 'text-[10px]'}`}>COP</span>
            </div>
        );
    }
  };

  // --- SUB-COMPONENTE: CARD ---
  const ProductCard = ({ product }: { product: any }) => (
    <div onClick={() => setSelectedProduct(product)} className={cardGlass}>
        <div className="relative aspect-[3/4] overflow-hidden">
            <img 
                src={product.imagen ? pb.files.getUrl(product, product.imagen) : '/placeholder.jpg'} 
                alt={product.nombre} 
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-60" />
            
            <div className="absolute top-3 left-3">
                <span className="text-[9px] font-black uppercase tracking-widest text-white/90 bg-black/30 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 shadow-lg">
                    {product.tipo}
                </span>
            </div>
            {product.galeria && product.galeria.length > 0 && (
                <div className="absolute bottom-3 right-3 text-white/70 text-xs bg-black/40 px-2 py-1 rounded-full backdrop-blur-md border border-white/5">
                    <FontAwesomeIcon icon={faImages} className="mr-1" /> +{product.galeria.length}
                </div>
            )}
        </div>

        <div className="p-5 flex-1 flex flex-col justify-between bg-gradient-to-b from-white/0 to-black/40 backdrop-blur-[2px]">
            <div>
                {/* Nombre Dinámico */}
                <h4 className="font-espacial text-sm text-white mb-1 leading-tight line-clamp-2 group-hover:text-purple-300 transition-colors drop-shadow-md">
                    {getName(product)}
                </h4>
            </div>

            <div className="mt-4 flex items-center justify-between relative z-20">
                {renderPrice(product)}
                <button 
                    onClick={(e) => handleAddToCart(product, e)}
                    className={`${buttonNeumorphic} h-10 w-10 flex items-center justify-center !rounded-full`}
                >
                    <FontAwesomeIcon icon={faCartPlus} size="sm" />
                </button>
            </div>
        </div>
    </div>
  );

  if (loading) return <div className="py-20 text-center text-purple-500"><FontAwesomeIcon icon={faSpinner} spin size="2x" /></div>;

  return (
    <div className="w-full pb-10">
      <style>{`
        .section-divider { display: flex; align-items: center; gap: 1.5rem; margin-bottom: 2.5rem; }
        .divider-line { flex: 1; height: 1px; background: linear-gradient(90deg, transparent, rgba(168, 85, 247, 0.5), transparent); box-shadow: 0 0 10px rgba(168,85,247,0.3); }
        .divider-title { font-family: 'Orbitron', sans-serif; color: #fff; font-size: 1.25rem; letter-spacing: 0.2em; text-transform: uppercase; text-shadow: 0 0 20px rgba(168, 85, 247, 0.8); }
        @keyframes fadeInModal { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-modal { animation: fadeInModal 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>

      {/* SECCIÓN MÚSICA */}
      {musicProducts.length > 0 && (
          <div className="mb-20">
            <div className="section-divider max-w-7xl mx-auto px-4">
                <div className="divider-line"></div>
                <h4 className="divider-title flex items-center gap-3">
                    <FontAwesomeIcon icon={faMusic} className="text-purple-400" /> {t('section_audio')}
                </h4>
                <div className="divider-line"></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 px-4 max-w-7xl mx-auto">
                {musicProducts.slice(0, 4).map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
      )}

      {/* SECCIÓN MERCH */}
      {merchProducts.length > 0 && (
          <div className="mb-16">
            <div className="section-divider max-w-7xl mx-auto px-4">
                <div className="divider-line"></div>
                <h4 className="divider-title flex items-center gap-3">
                    <FontAwesomeIcon icon={faShirt} className="text-purple-400" /> {t('section_merch')}
                </h4>
                <div className="divider-line"></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 px-4 max-w-7xl mx-auto">
                {merchProducts.slice(0, 4).map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
      )}

      <div className="flex justify-center mt-12 relative z-30">
        <Link to="/tienda" className={`${buttonNeumorphic} px-8 py-4 flex items-center gap-4 uppercase tracking-[0.2em] text-xs`}>
            <span>{t('view_catalog')}</span>
            <FontAwesomeIcon icon={faArrowRight} />
        </Link>
      </div>

      {/* --- MODAL --- */}
      {selectedProduct && (
        <div 
            className="fixed inset-0 z-[99999] flex items-start justify-center p-4 overflow-y-auto"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(5px)' }} 
            onClick={() => setSelectedProduct(null)}
        >
          <div 
            className="relative w-full max-w-4xl rounded-3xl overflow-hidden flex flex-col md:flex-row border border-white/20 animate-modal mt-20 md:mt-32 mb-10 shadow-[0_0_100px_rgba(139,92,246,0.15)]"
            style={{ 
                background: 'rgba(20, 10, 30, 0.4)', 
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)'
            }}
            onClick={(e) => e.stopPropagation()} 
          >
            
            <button 
                onClick={() => setSelectedProduct(null)} 
                className="absolute top-4 right-4 z-50 h-10 w-10 rounded-full bg-white/10 text-white hover:bg-red-500/80 hover:text-white flex items-center justify-center border border-white/20 shadow-lg cursor-pointer transition-all backdrop-blur-md"
            >
              <FontAwesomeIcon icon={faTimes} size="lg" />
            </button>

            {/* Columna Izquierda: Galería */}
            <div className="w-full md:w-1/2 p-6 flex flex-col gap-4 bg-white/5 border-r border-white/5">
                <div className="relative w-full aspect-square rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                    <img 
                        src={activeImage} 
                        alt={selectedProduct.nombre} 
                        className="w-full h-full object-cover transition-all duration-300" 
                    />
                </div>
                
                {/* Lógica Galería: Combina Imagen Principal + Array de Galería */}
                <div className="flex gap-3 overflow-x-auto py-2 custom-scrollbar">
                    {/* 1. Miniatura Principal */}
                    <button 
                        onClick={() => setActiveImage(selectedProduct.imagen ? pb.files.getUrl(selectedProduct, selectedProduct.imagen) : '/placeholder.jpg')}
                        className={`h-16 w-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${activeImage.includes(selectedProduct.imagen) ? 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'border-white/10 hover:border-white/30'}`}
                    >
                         <img src={selectedProduct.imagen ? pb.files.getUrl(selectedProduct, selectedProduct.imagen) : '/placeholder.jpg'} alt="Main" className="w-full h-full object-cover" />
                    </button>
                    
                    {/* 2. Miniaturas de Galería (PB Array) */}
                    {selectedProduct.galeria && selectedProduct.galeria.length > 0 && selectedProduct.galeria.map((img: string, index: number) => {
                        const imgUrl = pb.files.getUrl(selectedProduct, img);
                        return (
                            <button 
                                key={index}
                                onClick={() => setActiveImage(imgUrl)}
                                className={`h-16 w-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${activeImage === imgUrl ? 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'border-white/10 hover:border-white/30'}`}
                            >
                                <img src={imgUrl} alt={`Gallery ${index}`} className="w-full h-full object-cover" />
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Columna Derecha: Info */}
            <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col text-white bg-transparent">
                <div className="mb-2">
                    <span className="text-purple-300 text-[10px] font-black uppercase tracking-[0.25em] bg-white/5 px-3 py-1 rounded-lg border border-white/10 backdrop-blur-md">
                        {selectedProduct.tipo}
                    </span>
                </div>
                
                <h2 className="text-3xl md:text-4xl font-espacial mb-6 leading-none mt-2 drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                    {getName(selectedProduct)}
                </h2>
                
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar max-h-[300px] mb-8">
                    <div 
                        className="text-gray-100 text-sm leading-relaxed font-light tracking-wide drop-shadow-sm"
                        // Renderizamos la descripción dinámica
                        dangerouslySetInnerHTML={{ __html: getDescription(selectedProduct) }} 
                    />
                </div>
                
                <div className="mt-auto pt-6 border-t border-white/10">
                    <div className="flex items-end gap-3 mb-6">
                        {renderPrice(selectedProduct, true)}
                    </div>
                    
                    <button 
                        onClick={() => handleAddToCart(selectedProduct)} 
                        className={`${buttonNeumorphic} w-full py-4 flex items-center justify-center gap-3 text-sm uppercase tracking-widest text-white bg-purple-600/30 hover:bg-purple-600/60 !border-purple-500/40 !shadow-[0_0_20px_rgba(139,92,246,0.3)]`}
                    >
                        <FontAwesomeIcon icon={faCartPlus} className="text-purple-200" /> 
                        {t('add_to_cart')}
                    </button>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeStorePreview;