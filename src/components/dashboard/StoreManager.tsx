import { useState, useEffect } from 'react';
import pb from '../../lib/pocketbase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faPlus, faTrash, faStore, faGraduationCap, faBoxOpen, 
    faEdit, faTimes, faSave, faImage, faImages, faTruck, faCheckCircle, faClock
} from '@fortawesome/free-solid-svg-icons';

const StoreManager = () => {
    const [products, setProducts] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<any | null>(null);

    // Estado del Formulario
    const [formData, setFormData] = useState({
        nombre: '',
        descripcion: '',
        precio_usd: 0,
        stock: 1,
        categoria: 'merch', // 'academy' o 'merch'
        imagen: null as File | null,
        galeria: null as FileList | null
    });
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            // 1. Cargar Productos
            const prodRecords = await pb.collection('tienda').getFullList({ sort: '-created' });
            setProducts(prodRecords);

            // 2. Cargar Pedidos (Simulado si no existe la colección aún, pero listo para funcionar)
            // Asegúrate de tener una colección 'pedidos' con relaciones a 'users' y 'tienda'
            try {
                const orderRecords = await pb.collection('pedidos').getFullList({ 
                    sort: '-created',
                    expand: 'usuario,producto' // Expandir relaciones
                });
                setOrders(orderRecords);
            } catch (e) {
                console.log("Colección pedidos aún no creada o vacía.");
            }
        } catch (e) { console.error("Error loading store data:", e); }
    };

    // --- LÓGICA DEL MODAL ---
    const openModal = (product: any = null) => {
        setEditingProduct(product);
        if (product) {
            setFormData({
                nombre: product.nombre,
                descripcion: product.descripcion,
                precio_usd: product.precio_usd,
                stock: product.stock,
                categoria: product.categoria,
                imagen: null,
                galeria: null
            });
            setPreviewUrl(product.imagen ? pb.files.getUrl(product, product.imagen) : null);
        } else {
            setFormData({
                nombre: '',
                descripcion: '',
                precio_usd: 0,
                stock: 10,
                categoria: 'merch',
                imagen: null,
                galeria: null
            });
            setPreviewUrl(null);
        }
        setShowModal(true);
    };

    const handleSave = async () => {
        try {
            const data = new FormData();
            data.append('nombre', formData.nombre);
            data.append('descripcion', formData.descripcion);
            data.append('precio_usd', formData.precio_usd.toString());
            data.append('stock', formData.stock.toString());
            data.append('categoria', formData.categoria);

            if (formData.imagen) data.append('imagen', formData.imagen);
            
            // Manejo de galería (múltiples archivos)
            if (formData.galeria) {
                for (let i = 0; i < formData.galeria.length; i++) {
                    data.append('galeria', formData.galeria[i]);
                }
            }

            if (editingProduct) {
                await pb.collection('tienda').update(editingProduct.id, data);
            } else {
                await pb.collection('tienda').create(data);
            }
            setShowModal(false);
            loadData();
        } catch (e: any) {
            alert("Error: " + e.message);
        }
    };

    const deleteProduct = async (id: string) => {
        if (confirm("¿Eliminar producto del inventario?")) {
            await pb.collection('tienda').delete(id);
            loadData();
        }
    };

    // Cambiar estado del pedido (Ej: Pendiente -> Enviado)
    const advanceOrderStatus = async (order: any) => {
        const nextStatus = order.estado === 'pendiente' ? 'enviado' : 'entregado';
        await pb.collection('pedidos').update(order.id, { estado: nextStatus });
        loadData();
    };

    return (
        <div className="space-y-12 animate-in fade-in duration-500 pb-20">
            
            {/* HEADER INVENTARIO */}
            <div className="flex justify-between items-center border-b border-[#443b34] pb-6">
                <div>
                    <h3 className="text-2xl font-black text-orange-500 uppercase italic tracking-tighter">Store & Inventory</h3>
                    <p className="text-[#78716c] text-xs font-mono mt-1">Gestión de productos físicos y digitales</p>
                </div>
                <button 
                    onClick={() => openModal(null)}
                    className="bg-orange-700 hover:bg-orange-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg flex items-center gap-2 transition-all"
                >
                    <FontAwesomeIcon icon={faPlus} /> Nuevo Item
                </button>
            </div>

            {/* SECCIÓN 1: PRODUCTOS ACADEMY */}
            <div>
                <h4 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                    <FontAwesomeIcon icon={faGraduationCap} className="text-orange-500" /> Cursos & Material Digital
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {products.filter(p => p.categoria === 'academy').map(p => (
                        <ProductCard key={p.id} p={p} onEdit={() => openModal(p)} onDelete={deleteProduct} />
                    ))}
                </div>
            </div>

            {/* SECCIÓN 2: MERCHANDISING */}
            <div>
                <h4 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                    <FontAwesomeIcon icon={faStore} className="text-orange-500" /> Merch & Gear Físico
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {products.filter(p => p.categoria !== 'academy').map(p => (
                        <ProductCard key={p.id} p={p} onEdit={() => openModal(p)} onDelete={deleteProduct} />
                    ))}
                </div>
            </div>

            {/* SECCIÓN 3: PEDIDOS Y ENVÍOS */}
            <div className="bg-[#26201b] border border-[#443b34] rounded-2xl overflow-hidden shadow-xl mt-12">
                <div className="p-6 bg-[#211c18] border-b border-[#443b34] flex justify-between items-center">
                    <h3 className="font-black text-[#e7e5e4] uppercase tracking-widest flex items-center gap-2">
                        <FontAwesomeIcon icon={faTruck} className="text-orange-600" /> Gestión de Pedidos
                    </h3>
                    <span className="text-[10px] font-bold bg-orange-900/20 text-orange-500 px-2 py-1 rounded">{orders.length} Activos</span>
                </div>
                
                <table className="w-full text-left border-collapse">
                    <thead className="bg-[#1f1a17] text-[#78716c] text-[10px] uppercase font-black tracking-widest">
                        <tr>
                            <th className="p-4 border-b border-[#443b34]">ID Pedido</th>
                            <th className="p-4 border-b border-[#443b34]">Cliente</th>
                            <th className="p-4 border-b border-[#443b34]">Producto</th>
                            <th className="p-4 border-b border-[#443b34]">Total</th>
                            <th className="p-4 border-b border-[#443b34]">Estado</th>
                            <th className="p-4 border-b border-[#443b34] text-right">Acción</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#333] text-sm font-medium">
                        {orders.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-[#574c43] text-xs font-bold uppercase">No hay pedidos pendientes</td>
                            </tr>
                        ) : (
                            orders.map(order => (
                                <tr key={order.id} className="hover:bg-[#2f2822] transition-colors">
                                    <td className="p-4 font-mono text-xs text-[#78716c]">#{order.id.slice(0,8)}</td>
                                    <td className="p-4 text-[#e7e5e4] font-bold">
                                        {order.expand?.usuario?.username || 'Invitado'}
                                        <p className="text-[9px] text-[#78716c] font-normal">{order.expand?.usuario?.email}</p>
                                    </td>
                                    <td className="p-4 text-[#a8a29e]">{order.expand?.producto?.nombre || 'Producto eliminado'}</td>
                                    <td className="p-4 font-bold text-green-500">${order.total}</td>
                                    <td className="p-4">
                                        <span className={`text-[9px] font-black px-2 py-1 rounded border uppercase ${
                                            order.estado === 'entregado' ? 'bg-green-900/20 text-green-500 border-green-900/30' :
                                            order.estado === 'enviado' ? 'bg-blue-900/20 text-blue-500 border-blue-900/30' :
                                            'bg-yellow-900/20 text-yellow-500 border-yellow-900/30'
                                        }`}>
                                            {order.estado}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <button 
                                            onClick={() => advanceOrderStatus(order)}
                                            className="bg-[#1c1917] hover:bg-orange-600 border border-[#443b34] hover:text-white text-[#78716c] px-3 py-1 rounded text-[10px] font-bold uppercase transition-all"
                                        >
                                            Avanzar
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* --- MODAL DE PRODUCTO --- */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-[#26201b] border border-orange-600/30 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[650px] animate-in zoom-in-95">
                        
                        {/* COLUMNA IZQUIERDA: IMÁGENES */}
                        <div className="w-full md:w-1/3 bg-[#1f1a17] border-r border-[#443b34] p-6 flex flex-col items-center overflow-y-auto">
                            <label className="w-full aspect-square bg-[#1c1917] border-2 border-dashed border-[#443b34] rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-orange-500 hover:text-orange-500 transition-all group overflow-hidden relative shadow-xl mb-4">
                                {previewUrl ? (
                                    <img src={previewUrl} className="w-full h-full object-cover" />
                                ) : (
                                    <>
                                        <FontAwesomeIcon icon={faImage} size="2x" className="text-[#3a3028] group-hover:text-orange-500 mb-2" />
                                        <span className="text-[10px] font-black uppercase text-[#574c43] group-hover:text-orange-500">Portada Principal</span>
                                    </>
                                )}
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                    if(e.target.files?.[0]) {
                                        setFormData({...formData, imagen: e.target.files[0]});
                                        setPreviewUrl(URL.createObjectURL(e.target.files[0]));
                                    }
                                }} />
                            </label>

                            <div className="w-full pt-4 border-t border-[#333]">
                                <label className="text-[10px] font-black text-[#78716c] uppercase block mb-2">Galería Adicional</label>
                                <label className="w-full h-12 bg-[#1c1917] border border-[#443b34] rounded-lg flex items-center justify-center cursor-pointer hover:bg-[#252525] transition-colors">
                                    <span className="text-[10px] text-orange-500 font-bold flex gap-2 items-center">
                                        <FontAwesomeIcon icon={faImages} /> Subir Múltiples
                                    </span>
                                    <input type="file" multiple className="hidden" onChange={(e) => setFormData({...formData, galeria: e.target.files})} />
                                </label>
                                {formData.galeria && <p className="text-[9px] text-green-500 mt-2 text-center">{formData.galeria.length} archivos seleccionados</p>}
                            </div>
                        </div>

                        {/* COLUMNA DERECHA: DATOS */}
                        <div className="flex-1 flex flex-col bg-[#26201b]">
                            <div className="p-6 border-b border-[#443b34] flex justify-between items-center">
                                <h3 className="font-black text-[#e7e5e4] uppercase tracking-widest text-sm">Detalles del Producto</h3>
                                <button onClick={() => setShowModal(false)} className="text-[#78716c] hover:text-white"><FontAwesomeIcon icon={faTimes} size="lg" /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 space-y-5">
                                <div>
                                    <label className="text-[10px] font-bold text-orange-500 uppercase block mb-1">Nombre del Producto</label>
                                    <input 
                                        className="w-full bg-[#1c1917] border border-[#443b34] p-3 rounded-lg text-white font-bold outline-none focus:border-orange-600"
                                        value={formData.nombre}
                                        onChange={e => setFormData({...formData, nombre: e.target.value})}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-[#78716c] uppercase block mb-1">Precio (USD)</label>
                                        <input 
                                            type="number"
                                            className="w-full bg-[#1c1917] border border-[#443b34] p-3 rounded-lg text-white text-sm outline-none focus:border-orange-600"
                                            value={formData.precio_usd}
                                            onChange={e => setFormData({...formData, precio_usd: parseFloat(e.target.value)})}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-[#78716c] uppercase block mb-1">Stock Disponible</label>
                                        <input 
                                            type="number"
                                            className="w-full bg-[#1c1917] border border-[#443b34] p-3 rounded-lg text-white text-sm outline-none focus:border-orange-600"
                                            value={formData.stock}
                                            onChange={e => setFormData({...formData, stock: parseInt(e.target.value)})}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-[#78716c] uppercase block mb-1">Categoría</label>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => setFormData({...formData, categoria: 'merch'})}
                                            className={`flex-1 py-2 rounded text-xs font-black uppercase border ${formData.categoria === 'merch' ? 'bg-orange-600 text-white border-orange-500' : 'bg-[#1c1917] text-[#574c43] border-[#333]'}`}
                                        >
                                            Merch Físico
                                        </button>
                                        <button 
                                            onClick={() => setFormData({...formData, categoria: 'academy'})}
                                            className={`flex-1 py-2 rounded text-xs font-black uppercase border ${formData.categoria === 'academy' ? 'bg-blue-600 text-white border-blue-500' : 'bg-[#1c1917] text-[#574c43] border-[#333]'}`}
                                        >
                                            Academy / Digital
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-[#78716c] uppercase block mb-1">Descripción Completa</label>
                                    <textarea 
                                        className="w-full bg-[#1c1917] border border-[#443b34] p-3 rounded-lg text-white text-sm h-32 outline-none focus:border-orange-600"
                                        value={formData.descripcion}
                                        onChange={e => setFormData({...formData, descripcion: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="p-6 border-t border-[#443b34] bg-[#211c18] flex justify-end">
                                <button 
                                    onClick={handleSave}
                                    className="bg-orange-700 hover:bg-orange-600 text-white px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg transition-all flex items-center gap-2"
                                >
                                    <FontAwesomeIcon icon={faSave} /> Guardar Producto
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Componente de Tarjeta Reutilizable
const ProductCard = ({ p, onEdit, onDelete }: any) => (
    <div className="bg-[#26201b] border border-[#443b34] rounded-2xl overflow-hidden group hover:border-orange-600/50 transition-all shadow-lg flex flex-col">
        <div className="h-44 bg-[#1c1917] relative overflow-hidden">
            {p.imagen ? (
                <img src={pb.files.getUrl(p, p.imagen)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-[#3a3028]"><FontAwesomeIcon icon={faBoxOpen} size="3x" /></div>
            )}
            <div className="absolute top-3 right-3 bg-black/80 text-orange-500 text-xs font-black px-3 py-1 rounded-full backdrop-blur-md border border-orange-500/20 shadow-xl">
                ${p.precio_usd}
            </div>
            {p.stock < 5 && (
                <div className="absolute bottom-0 left-0 right-0 bg-red-600/90 text-white text-[9px] font-black text-center py-1 uppercase tracking-widest">
                    Stock Bajo: {p.stock}
                </div>
            )}
        </div>
        <div className="p-5 flex-1 flex flex-col">
            <h4 className="text-[#e7e5e4] font-black text-sm uppercase truncate mb-1">{p.nombre}</h4>
            <p className="text-[#78716c] text-[10px] line-clamp-2 mb-4 flex-1">{p.descripcion || "Sin descripción"}</p>
            <div className="flex justify-between items-center pt-4 border-t border-[#443b34]">
                <button onClick={onEdit} className="text-[10px] font-black text-[#78716c] hover:text-white uppercase tracking-widest flex items-center gap-2">
                    <FontAwesomeIcon icon={faEdit} /> Editar
                </button>
                <button onClick={() => onDelete(p.id)} className="text-[#443b34] hover:text-red-500 transition-colors">
                    <FontAwesomeIcon icon={faTrash} />
                </button>
            </div>
        </div>
    </div>
);

export default StoreManager;