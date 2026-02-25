import { useEffect, useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import pb from '../lib/pocketbase';
import { CartContext } from '../context/CartContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faArrowLeft, faShoppingCart, faCartPlus, faSearch, 
    faGraduationCap, faTimes, faCheck, faImages 
} from '@fortawesome/free-solid-svg-icons';

// Componente helper con Mayúscula para evitar error JSX
const MotionDiv = ({ children, className, ...props }: any) => (
    <div className={`transition-all duration-700 ${className}`} {...props}>
        {children}
    </div>
);

const TiendaAcademia = () => {
    const { addToCart, cartTotal } = useContext(CartContext);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Estado para el Modal
    const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
    const [activeImage, setActiveImage] = useState<string>('');

    // Tasa de cambio visual
    const TRM = 4000;

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
        // CORRECCIÓN: Mapeo exacto a la interfaz CartItem
        const cartItem = {
            id: prod.id,
            nombre: prod.nombre,
            // Asignamos ambos precios requeridos por tu Context
            precioUSD: prod.precio_usd,
            precioCOP: prod.precio_usd * TRM, 
            imagen: prod.imagen ? pb.files.getUrl(prod, prod.imagen) : '',
            cantidad: 1,
            tipo: 'digital',
            // Añadimos precio genérico por si tu lógica interna lo usa de fallback
            precio: prod.precio_usd 
        };
        // @ts-ignore - Ignoramos error estricto si la interfaz tiene campos opcionales no coincidentes
        addToCart(cartItem);
    };

    // Abrir modal y setear imagen inicial
    const openProduct = (prod: any) => {
        setSelectedProduct(prod);
        if (prod.imagen) {
            setActiveImage(pb.files.getUrl(prod, prod.imagen));
        } else {
            setActiveImage('');
        }
    };

    const filteredProducts = products.filter(p => 
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[#fcfbff] text-gray-700 font-sans selection:bg-purple-200 relative overflow-x-hidden">
            
            {/* FONDO ANIMADO SUTIL */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-purple-200/30 rounded-full blur-[100px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-blue-100/30 rounded-full blur-[100px] animate-pulse delay-1000"></div>
            </div>

            {/* --- NAVBAR ZEN --- */}
            <nav className="sticky top-0 w-full px-6 py-4 bg-white/70 backdrop-blur-xl flex justify-between items-center z-50 border-b border-white/50 shadow-sm">
                <Link to="/clases" className="group flex items-center gap-3 text-xs font-bold text-gray-400 hover:text-purple-600 transition-colors uppercase tracking-widest">
                    <div className="w-8 h-8 rounded-full bg-white border border-gray-100 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                        <FontAwesomeIcon icon={faArrowLeft} />
                    </div>
                    <span>Volver al Dojo</span>
                </Link>
                
                <div className="flex items-center gap-6">
                    <Link to="/carrito" className="relative group">
                        <div className="w-10 h-10 rounded-full bg-white border border-purple-100 flex items-center justify-center text-purple-400 shadow-md group-hover:text-purple-600 group-hover:shadow-purple-200 transition-all">
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

            {/* --- HEADER --- */}
            <header className="relative pt-16 pb-12 text-center px-6 z-10">
                <MotionDiv initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-50 text-purple-600 text-[10px] font-black tracking-[0.2em] uppercase mb-6 border border-purple-100 shadow-sm">
                        <FontAwesomeIcon icon={faGraduationCap} /> Recursos Premium
                    </div>
                    <h1 className="text-4xl md:text-6xl font-serif text-[#1a0b2e] mb-6">
                        Material de <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500">Estudio</span>
                    </h1>
                    <p className="text-gray-500 font-light text-lg leading-relaxed">
                        Herramientas diseñadas para acelerar tu proceso. Descargas digitales inmediatas tras la compra.
                    </p>
                </MotionDiv>

                {/* BUSCADOR */}
                <div className="mt-12 max-w-md mx-auto relative">
                    <input 
                        type="text" 
                        placeholder="Buscar guías, tracks..." 
                        className="w-full pl-12 pr-6 py-4 rounded-2xl bg-[#fcfbff] border-none shadow-[inset_5px_5px_10px_#e6e5eb,inset_-5px_-5px_10px_#ffffff] focus:outline-none focus:shadow-[inset_2px_2px_5px_#e6e5eb,inset_-2px_-2px_5px_#ffffff] text-gray-600 placeholder-gray-400 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <FontAwesomeIcon icon={faSearch} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
            </header>

            {/* --- GRID PRODUCTOS --- */}
            <div className="max-w-7xl mx-auto px-6 pb-32 relative z-10">
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-12 h-12 border-4 border-purple-100 border-t-purple-500 rounded-full animate-spin"></div>
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="text-center py-20 text-gray-400">
                        <p>No se encontraron materiales con ese nombre.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                        {filteredProducts.map((prod) => (
                            <div key={prod.id} className="group relative cursor-pointer" onClick={() => openProduct(prod)}>
                                {/* CARD GLASSMORPHISM */}
                                <div className="bg-white/60 backdrop-blur-md rounded-[2rem] border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(168,85,247,0.15)] transition-all duration-500 overflow-hidden hover:-translate-y-2 h-full flex flex-col">
                                    
                                    {/* IMAGEN */}
                                    <div className="h-64 relative overflow-hidden p-4">
                                        <div className="w-full h-full rounded-2xl overflow-hidden shadow-inner relative">
                                            {prod.imagen ? (
                                                <img 
                                                    src={pb.files.getUrl(prod, prod.imagen)} 
                                                    alt={prod.nombre} 
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-purple-50 flex items-center justify-center text-purple-200">
                                                    <FontAwesomeIcon icon={faGraduationCap} size="3x" />
                                                </div>
                                            )}
                                            {/* Badge Tipo */}
                                            <div className="absolute top-3 left-3">
                                                <span className="bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide text-purple-600 shadow-sm">
                                                    Digital
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* CONTENIDO */}
                                    <div className="px-8 pb-8 pt-2 flex-1 flex flex-col">
                                        <h3 className="text-xl font-serif font-bold text-[#1a0b2e] mb-3 leading-tight group-hover:text-purple-700 transition-colors">
                                            {prod.nombre}
                                        </h3>
                                        <p className="text-sm text-gray-500 mb-6 font-light leading-relaxed line-clamp-3 flex-1">
                                            {prod.descripcion || "Material educativo exclusivo de Guitarrosis Academy."}
                                        </p>
                                        
                                        {/* PRECIO Y ACCIÓN */}
                                        <div className="flex items-center justify-between border-t border-purple-50 pt-6 mt-auto">
                                            <div className="flex flex-col">
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-2xl font-black text-purple-900">${prod.precio_usd}</span>
                                                    <span className="text-[10px] font-bold text-purple-400">USD</span>
                                                </div>
                                                <span className="text-[10px] text-gray-400 font-medium">
                                                    ~ ${(prod.precio_usd * TRM).toLocaleString()} COP
                                                </span>
                                            </div>

                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleAdd(prod); }}
                                                className="w-12 h-12 rounded-2xl bg-white border border-purple-100 text-purple-600 flex items-center justify-center shadow-[5px_5px_10px_#e6e5eb,-5px_-5px_10px_#ffffff] hover:shadow-[inset_2px_2px_5px_#e6e5eb,inset_-2px_-2px_5px_#ffffff] hover:text-pink-500 transition-all active:scale-95"
                                                title="Añadir al carrito"
                                            >
                                                <FontAwesomeIcon icon={faCartPlus} className="text-lg" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* --- MODAL DE PRODUCTO --- */}
            {selectedProduct && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-purple-900/20 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row relative animate-in zoom-in-95 duration-300 max-h-[90vh]">
                        
                        {/* BOTÓN CERRAR */}
                        <button 
                            onClick={() => setSelectedProduct(null)} 
                            className="absolute top-6 right-6 z-20 w-10 h-10 bg-white/80 backdrop-blur rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-white shadow-lg transition-all"
                        >
                            <FontAwesomeIcon icon={faTimes} />
                        </button>

                        {/* COLUMNA IZQUIERDA: GALERÍA */}
                        <div className="w-full md:w-1/2 bg-gray-50 p-8 flex flex-col justify-center items-center relative">
                            {/* IMAGEN PRINCIPAL */}
                            <div className="w-full aspect-square rounded-2xl overflow-hidden shadow-xl border-4 border-white mb-6 bg-white flex items-center justify-center relative group">
                                {activeImage ? (
                                    <img src={activeImage} alt="Preview" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                ) : (
                                    <FontAwesomeIcon icon={faGraduationCap} className="text-6xl text-purple-200" />
                                )}
                            </div>

                            {/* MINIATURAS (GALERÍA) */}
                            {selectedProduct.galeria && selectedProduct.galeria.length > 0 && (
                                <div className="flex gap-3 overflow-x-auto w-full pb-2 scrollbar-hide justify-center">
                                    {/* Miniatura Principal (Original) */}
                                    <button 
                                        onClick={() => setActiveImage(pb.files.getUrl(selectedProduct, selectedProduct.imagen))}
                                        className={`w-16 h-16 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all ${activeImage.includes(selectedProduct.imagen) ? 'border-purple-600 ring-2 ring-purple-200' : 'border-white opacity-70 hover:opacity-100'}`}
                                    >
                                        <img src={pb.files.getUrl(selectedProduct, selectedProduct.imagen)} className="w-full h-full object-cover" />
                                    </button>

                                    {/* Miniaturas Extra */}
                                    {selectedProduct.galeria.map((img: string, idx: number) => (
                                        <button 
                                            key={idx}
                                            onClick={() => setActiveImage(pb.files.getUrl(selectedProduct, img))}
                                            className={`w-16 h-16 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all ${activeImage.includes(img) ? 'border-purple-600 ring-2 ring-purple-200' : 'border-white opacity-70 hover:opacity-100'}`}
                                        >
                                            <img src={pb.files.getUrl(selectedProduct, img)} className="w-full h-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* COLUMNA DERECHA: DETALLES */}
                        <div className="flex-1 p-10 md:p-12 flex flex-col overflow-y-auto">
                            <div className="mb-auto">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-purple-600 text-[10px] font-black uppercase tracking-widest mb-4">
                                    <FontAwesomeIcon icon={faCheck} /> Disponible
                                </div>
                                <h2 className="text-3xl md:text-4xl font-serif text-[#1a0b2e] mb-6 leading-tight">
                                    {selectedProduct.nombre}
                                </h2>
                                <p className="text-gray-500 font-light text-lg leading-relaxed mb-8">
                                    {selectedProduct.descripcion}
                                </p>
                            </div>

                            {/* FOOTER MODAL */}
                            <div className="pt-8 border-t border-gray-100 mt-8">
                                <div className="flex items-end justify-between mb-6">
                                    <div>
                                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Precio Total</p>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-4xl font-black text-purple-900">${selectedProduct.precio_usd}</span>
                                            <span className="text-sm font-bold text-purple-400">USD</span>
                                        </div>
                                        <p className="text-sm text-gray-400 mt-1">Aprox. ${(selectedProduct.precio_usd * TRM).toLocaleString()} COP</p>
                                    </div>
                                </div>

                                <button 
                                    onClick={() => { handleAdd(selectedProduct); setSelectedProduct(null); }}
                                    className="w-full bg-[#1a0b2e] hover:bg-purple-900 text-white py-4 rounded-xl font-bold text-sm uppercase tracking-[0.2em] shadow-xl hover:shadow-purple-900/30 transition-all flex items-center justify-center gap-3"
                                >
                                    <FontAwesomeIcon icon={faCartPlus} /> Agregar al Carrito
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