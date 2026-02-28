import { useEffect, useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import pb from '../lib/pocketbase';
import { CartContext } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faArrowLeft, faShoppingCart, faCartPlus, faSearch, 
    faGraduationCap, faTimes, faBrain, faGuitar, faLightbulb, faBookOpen, faHourglassHalf, faGlobe, faCheck
} from '@fortawesome/free-solid-svg-icons';

const MotionDiv = ({ children, className, ...props }: any) => (
    <div className={`transition-all duration-700 ${className}`} {...props}>
        {children}
    </div>
);

const TiendaAcademia = () => {
    const { addToCart, cartTotal } = useContext(CartContext);
    const { lang, setLang, t } = useLanguage(); 
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
    const [activeImage, setActiveImage] = useState<string>('');

    useEffect(() => {
        window.scrollTo(0, 0);
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const records = await pb.collection('tienda').getFullList({
                filter: 'tipo = "academico"', 
                sort: '-created'
            });
            setProducts(records);
        } catch (e) {
            console.error("Error cargando tienda:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = (prod: any) => {
        let copPrice = prod.precio_cop ? Number(prod.precio_cop) : (Number(prod.precio_usd) * 4000);
        if (copPrice > 0 && copPrice < 1000) {
            copPrice = copPrice * 1000;
        }

        const cartItem = {
            id: prod.id,
            nombre: lang === 'EN' && prod.nombre_en ? prod.nombre_en : prod.nombre,
            precioUSD: Number(prod.precio_usd) || 0,
            precioCOP: copPrice,
            imagen: prod.imagen ? pb.files.getUrl(prod, prod.imagen) : '',
            cantidad: 1,
            tipo: 'digital'
        };
        // @ts-ignore
        addToCart(cartItem);
    };

    const openProduct = (prod: any) => {
        setSelectedProduct(prod);
        setActiveImage(prod.imagen ? pb.files.getUrl(prod, prod.imagen) : '');
    };

    const renderPrice = (prod: any) => {
        if (lang === 'EN') {
            return (
                <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-purple-900">${prod.precio_usd}</span>
                    <span className="text-[10px] font-bold text-purple-400">USD</span>
                </div>
            );
        }
        
        let copValue = prod.precio_cop ? Number(prod.precio_cop) : (Number(prod.precio_usd) * 4000);
        if (copValue > 0 && copValue < 1000) {
            copValue = copValue * 1000; 
        }

        return (
            <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-purple-900">${copValue.toLocaleString('es-CO')}</span>
                <span className="text-[10px] font-bold text-purple-400">COP</span>
            </div>
        );
    };

    const filteredProducts = products.filter(p => 
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (p.descripcion && p.descripcion.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const getCategory = (nombre: string) => {
        const n = nombre.toLowerCase();
        if (n.includes('guia') || n.includes('guía') || n.includes('octava') || n.includes('bloque') || n.includes('armonia') || n.includes('armonía') || n.includes('visualizacion')) return 'teoria';
        if (n.includes('journal') || n.includes('agenda') || n.includes('estudiar')) return 'estudio';
        if (n.includes('dojo') || n.includes('secuencia') || n.includes('perpetual') || n.includes('legato') || n.includes('técnica')) return 'tecnica';
        if (n.includes('level up') || n.includes('improvisacion') || n.includes('improvisación') || n.includes('fondo y forma')) return 'improvisacion';
        return 'otros';
    };

    // Array de secciones con fondos de contenedores en tonos armoniosos de morado/violeta suave
    const sections = [
        { 
            id: 'teoria', 
            title: lang === 'EN' ? 'Fundamentals: Visualization & Theory' : 'Fundamentos: Visualización, Rudimentos y Teoría', 
            icon: faBrain,
            bgClass: 'bg-purple-50/60 border-purple-100' // Morado suave clásico
        },
        { 
            id: 'estudio', 
            title: lang === 'EN' ? 'Fundamentals: How to Study Correctly' : 'Fundamentos: Cómo Estudiar Correctamente', 
            icon: faHourglassHalf,
            bgClass: 'bg-fuchsia-50/60 border-fuchsia-100' // Fucsia pálido
        },
        { 
            id: 'tecnica', 
            title: lang === 'EN' ? 'Fundamentals: Technique' : 'Fundamentos: Técnica', 
            icon: faGuitar,
            bgClass: 'bg-violet-50/60 border-violet-100' // Violeta azulado suave
        },
        { 
            id: 'improvisacion', 
            title: lang === 'EN' ? 'Improvisation' : 'Improvisación', 
            icon: faLightbulb,
            bgClass: 'bg-indigo-50/60 border-indigo-100' // Índigo (morado más frío)
        },
        { 
            id: 'otros', 
            title: lang === 'EN' ? 'Other Materials' : 'Otros Materiales', 
            icon: faBookOpen,
            bgClass: 'bg-pink-50/60 border-pink-100' // Rosa suave apastelado
        }
    ];

    const toggleLang = () => setLang(lang === 'ES' ? 'EN' : 'ES');

    return (
        <div className="min-h-screen bg-[#fcfbff] text-gray-700 font-sans selection:bg-purple-200 relative overflow-x-hidden">
            
            {/* NAVBAR */}
            <nav className="sticky top-0 w-full px-6 py-4 bg-white/70 backdrop-blur-xl flex justify-between items-center z-50 border-b border-white/50 shadow-sm">
                <Link to="/clases" className="group flex items-center gap-3 text-xs font-bold text-gray-400 hover:text-purple-600 transition-colors uppercase tracking-widest">
                    <div className="w-8 h-8 rounded-full bg-white border border-gray-100 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                        <FontAwesomeIcon icon={faArrowLeft} />
                    </div>
                    <span className="hidden sm:inline">{lang === 'EN' ? 'BACK TO DOJO' : 'VOLVER AL DOJO'}</span>
                </Link>
                
                <div className="flex items-center gap-4">
                    <button 
                        onClick={toggleLang} 
                        className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-purple-600 transition-colors uppercase tracking-widest px-3 py-2 rounded-full border border-gray-100 bg-white shadow-sm"
                    >
                        <FontAwesomeIcon icon={faGlobe} />
                        {lang}
                    </button>

                    <Link to="/carrito" className="relative group">
                        <div className="w-10 h-10 rounded-full bg-white border border-purple-100 flex items-center justify-center text-purple-400 shadow-md group-hover:text-purple-600 transition-all">
                            <FontAwesomeIcon icon={faShoppingCart} />
                        </div>
                        {cartTotal > 0 && (
                            <span className="absolute -top-1 -right-1 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                                {cartTotal}
                            </span>
                        )}
                    </Link>
                </div>
            </nav>

            <header className="relative pt-20 pb-12 text-center px-6 z-10">
                <MotionDiv initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
                    <h1 className="text-4xl md:text-6xl font-serif text-[#1a0b2e] mb-6">
                        {t('store_title')}
                    </h1>
                    <p className="text-gray-500 font-light text-lg">
                        {lang === 'EN' ? 'Tools designed to accelerate your process.' : 'Herramientas diseñadas para acelerar tu proceso.'}
                    </p>
                </MotionDiv>
                <div className="mt-10 max-w-md mx-auto relative">
                    <input 
                        type="text" 
                        placeholder={lang === 'EN' ? 'Search guides, tracks...' : 'Buscar guías, tracks...'} 
                        className="w-full pl-12 pr-6 py-4 rounded-2xl bg-white shadow-md border border-purple-50 focus:border-purple-300 outline-none text-gray-600 transition-all"
                        value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <FontAwesomeIcon icon={faSearch} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-6 pb-32 relative z-10">
                {loading ? (
                    <div className="flex justify-center py-20"><div className="w-12 h-12 border-4 border-purple-100 border-t-purple-500 rounded-full animate-spin"></div></div>
                ) : filteredProducts.length === 0 ? (
                    <div className="text-center py-20 text-gray-400"><p>{lang === 'EN' ? 'No materials found.' : 'No se encontraron materiales.'}</p></div>
                ) : (
                    <div className="space-y-24">
                        {sections.map(section => {
                            const sectionProducts = filteredProducts.filter(p => getCategory(p.nombre) === section.id);
                            if (sectionProducts.length === 0) return null;

                            return (
                                <div key={section.id}>
                                    {/* TÍTULO AFUERA DEL CONTENEDOR */}
                                    <div className="flex items-center gap-4 mb-6 px-2">
                                        <div className="w-12 h-12 rounded-xl bg-white text-purple-600 border border-purple-100 flex items-center justify-center text-xl shadow-sm">
                                            <FontAwesomeIcon icon={section.icon} />
                                        </div>
                                        <h3 className="text-xl md:text-2xl font-black text-[#1a0b2e] uppercase tracking-wider">
                                            {section.title}
                                        </h3>
                                    </div>
                                    
                                    {/* CAJA DE COLOR CON LAS TARJETAS DENTRO */}
                                    <div className={`p-8 md:p-10 rounded-[2.5rem] border shadow-sm ${section.bgClass}`}>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                            {sectionProducts.map((prod) => (
                                                <div key={prod.id} className="group relative cursor-pointer bg-white rounded-3xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-xl transition-all duration-500 overflow-hidden flex flex-col hover:-translate-y-2" onClick={() => openProduct(prod)}>
                                                    <div className="h-64 relative overflow-hidden bg-[#1c1917] p-2">
                                                        <div className="w-full h-full rounded-2xl overflow-hidden relative">
                                                            {prod.imagen ? (
                                                                <img src={pb.files.getUrl(prod, prod.imagen)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-95 group-hover:opacity-100" />
                                                            ) : (
                                                                <div className="w-full h-full bg-purple-50 flex items-center justify-center text-purple-200"><FontAwesomeIcon icon={faGraduationCap} size="3x" /></div>
                                                            )}
                                                            <div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wide text-purple-600 shadow-sm">Digital</div>
                                                        </div>
                                                    </div>
                                                    <div className="p-8 flex-1 flex flex-col">
                                                        <h4 className="text-xl font-serif font-bold text-[#1a0b2e] mb-3 leading-tight group-hover:text-purple-700 transition-colors">{lang === 'EN' && prod.nombre_en ? prod.nombre_en : prod.nombre}</h4>
                                                        <p className="text-sm text-gray-500 mb-6 font-light line-clamp-2">{lang === 'EN' && prod.descripcion_en ? prod.descripcion_en : prod.descripcion || "Material educativo exclusivo."}</p>
                                                        <div className="flex items-center justify-between mt-auto pt-6 border-t border-purple-50">
                                                            {renderPrice(prod)}
                                                            <button onClick={(e) => { e.stopPropagation(); handleAdd(prod); }} className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 hover:bg-purple-600 hover:text-white flex items-center justify-center shadow-sm transition-all active:scale-95">
                                                                <FontAwesomeIcon icon={faCartPlus} className="text-lg" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {selectedProduct && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-purple-900/40 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row relative animate-in zoom-in-95 duration-300 max-h-[90vh]">
                        <button onClick={() => setSelectedProduct(null)} className="absolute top-6 right-6 z-20 w-10 h-10 bg-white/80 backdrop-blur rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-white shadow-lg transition-all">
                            <FontAwesomeIcon icon={faTimes} />
                        </button>
                        
                        <div className="w-full md:w-1/2 bg-gray-50 p-8 flex flex-col items-center justify-center relative">
                            <div className="w-full aspect-square rounded-2xl overflow-hidden shadow-xl border-4 border-white mb-6 bg-white flex items-center justify-center group">
                                {activeImage ? <img src={activeImage} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" /> : <FontAwesomeIcon icon={faGraduationCap} className="text-6xl text-purple-200" />}
                            </div>
                            {selectedProduct.galeria && selectedProduct.galeria.length > 0 && (
                                <div className="flex gap-3 overflow-x-auto w-full pb-2 justify-center scrollbar-hide">
                                    <button onClick={() => setActiveImage(pb.files.getUrl(selectedProduct, selectedProduct.imagen))} className={`w-16 h-16 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all ${activeImage.includes(selectedProduct.imagen) ? 'border-purple-600 ring-2 ring-purple-200' : 'border-white opacity-70 hover:opacity-100'}`}>
                                        <img src={pb.files.getUrl(selectedProduct, selectedProduct.imagen)} className="w-full h-full object-cover" />
                                    </button>
                                    {selectedProduct.galeria.map((img: string, idx: number) => (
                                        <button key={idx} onClick={() => setActiveImage(pb.files.getUrl(selectedProduct, img))} className={`w-16 h-16 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all ${activeImage.includes(img) ? 'border-purple-600 ring-2 ring-purple-200' : 'border-white opacity-70 hover:opacity-100'}`}>
                                            <img src={pb.files.getUrl(selectedProduct, img)} className="w-full h-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex-1 p-10 md:p-12 flex flex-col overflow-y-auto">
                            <div className="mb-auto">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-purple-600 text-[10px] font-black uppercase tracking-widest mb-4">
                                    <FontAwesomeIcon icon={faCheck} /> {lang === 'EN' ? 'AVAILABLE' : 'DISPONIBLE'}
                                </div>
                                <h2 className="text-3xl md:text-4xl font-serif text-[#1a0b2e] mb-6 leading-tight">
                                    {lang === 'EN' && selectedProduct.nombre_en ? selectedProduct.nombre_en : selectedProduct.nombre}
                                </h2>
                                <div className="text-gray-500 font-light text-lg leading-relaxed mb-8" dangerouslySetInnerHTML={{ __html: lang === 'EN' && selectedProduct.descripcion_en ? selectedProduct.descripcion_en : selectedProduct.descripcion }} />
                            </div>
                            <div className="pt-8 border-t border-gray-100 mt-8">
                                <div className="mb-6">
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">{lang === 'EN' ? 'TOTAL PRICE' : 'PRECIO TOTAL'}</p>
                                    {renderPrice(selectedProduct)}
                                </div>
                                <button onClick={() => { handleAdd(selectedProduct); setSelectedProduct(null); }} className="w-full bg-[#1a0b2e] hover:bg-purple-900 text-white py-4 rounded-xl font-bold text-sm uppercase tracking-[0.2em] shadow-xl hover:shadow-purple-900/30 transition-all flex items-center justify-center gap-3">
                                    <FontAwesomeIcon icon={faCartPlus} /> {t('add_to_cart')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TiendaAcademia;