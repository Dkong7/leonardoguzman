import { useState, useEffect } from 'react';
import pb from '../../lib/pocketbase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faClock, faUser, faEnvelope, faMapMarkerAlt, faTag, faTimes, faPaperPlane, faReceipt } from '@fortawesome/free-solid-svg-icons';

const OrdersManager = () => {
    const [orders, setOrders] = useState<any[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [sendingEmail, setSendingEmail] = useState(false);

    useEffect(() => { loadOrders(); }, []);

    const loadOrders = async () => {
        try {
            const records = await pb.collection('pedidos').getFullList({ sort: '-created' });
            setOrders(records);
        } catch (e) { console.error("Error cargando pedidos:", e); }
    };

    const approveOrder = async (id: string) => {
        if (confirm("¿Confirmas que recibiste el pago? Esto habilitará las descargas al cliente.")) {
            await pb.collection('pedidos').update(id, { estado: 'pagado' });
            loadOrders();
        }
    };

    const sendConfirmationEmail = async (order: any) => {
        setSendingEmail(true);
        try {
            // Trigger server hook or fallback
            await fetch(`${pb.baseUrl}/api/send-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: order.cliente_email, nombre: order.cliente_nombre })
            });
            alert('¡Correo enviado con éxito!');
        } catch (e) {
            console.error(e);
            alert('Error enviando correo. Asegúrate que la ruta API exista en pb_hooks.');
        } finally {
            setSendingEmail(false);
        }
    };

    return (
        <div className="space-y-6 relative">
            <div className="grid grid-cols-1 gap-4">
                {orders.map((order) => (
                    <div 
                        key={order.id} 
                        onClick={() => setSelectedOrder(order)}
                        className="bg-white border border-purple-100 rounded-2xl p-6 shadow-sm hover:shadow-md cursor-pointer flex flex-col md:flex-row justify-between gap-6 transition-all"
                    >
                        {/* INFO CLIENTE */}
                        <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2 text-purple-800 font-black uppercase text-xs tracking-widest">
                                <FontAwesomeIcon icon={faUser} className="text-orange-500" /> {order.cliente_nombre}
                            </div>
                            <p className="text-gray-500 text-sm flex items-center gap-2"><FontAwesomeIcon icon={faEnvelope} className="text-purple-300" /> {order.cliente_email}</p>
                            <p className="text-gray-400 text-xs flex items-center gap-2"><FontAwesomeIcon icon={faMapMarkerAlt} className="text-purple-300" /> {order.direccion}</p>
                        </div>

                        {/* INFO COMPRA (Resumen) */}
                        <div className="flex-1">
                            <h4 className="text-[10px] font-black text-purple-400 uppercase mb-2">Items Comprados</h4>
                            <div className="space-y-1">
                                {order.items.map((item: any, i: number) => (
                                    <div key={i} className="text-xs text-purple-900 font-bold flex items-center gap-2">
                                        <FontAwesomeIcon icon={faTag} className="text-orange-500" /> {item.nombre} x {item.cantidad}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* TOTALES Y ACCIÓN */}
                        <div className="text-right flex flex-col justify-between items-end gap-4 min-w-[150px]" onClick={e => e.stopPropagation()}>
                            <div>
                                <p className="text-2xl font-black text-purple-900 font-mono">${order.total_cop.toLocaleString()} <span className="text-[10px] text-gray-400">COP</span></p>
                                <p className="text-xs text-gray-400">${order.total_usd} USD</p>
                            </div>

                            {order.estado === 'pagado' ? (
                                <span className="bg-green-50 text-green-600 px-4 py-2 rounded-lg text-[10px] font-black uppercase border border-green-200 flex items-center gap-2">
                                    <FontAwesomeIcon icon={faCheckCircle} /> Pago Confirmado
                                </span>
                            ) : (
                                <button 
                                    onClick={() => approveOrder(order.id)}
                                    className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all shadow-md flex items-center gap-2"
                                >
                                    <FontAwesomeIcon icon={faClock} /> Confirmar Pago
                                </button>
                            )}
                        </div>
                    </div>
                ))}
                {orders.length === 0 && <p className="text-center text-purple-400 py-20 font-bold uppercase tracking-widest">No hay pedidos registrados.</p>}
            </div>

            {/* MODAL DE DETALLES */}
            {selectedOrder && (
                <div className="fixed inset-0 bg-purple-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl relative border border-purple-100">
                        <button 
                            onClick={() => setSelectedOrder(null)} 
                            className="absolute top-6 right-6 text-purple-300 hover:text-purple-800 transition-colors"
                        >
                            <FontAwesomeIcon icon={faTimes} className="text-2xl" />
                        </button>
                        
                        <h2 className="text-2xl font-black text-purple-950 mb-6 uppercase tracking-widest flex items-center gap-3">
                            <span className="w-8 h-8 bg-orange-100 text-orange-600 flex items-center justify-center rounded-lg">
                                <FontAwesomeIcon icon={faReceipt} />
                            </span>
                            Detalle del Pedido
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                            <div className="space-y-4">
                                <div>
                                    <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Cliente</p>
                                    <p className="text-purple-900 font-bold text-lg">{selectedOrder.cliente_nombre}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Email</p>
                                    <p className="text-purple-800">{selectedOrder.cliente_email}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Teléfono</p>
                                    <p className="text-purple-800">{selectedOrder.cliente_telefono || 'No proporcionado'}</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Dirección de Envío / Comentarios</p>
                                    <p className="text-purple-900 font-medium bg-purple-50 p-4 rounded-xl border border-purple-100">
                                        {selectedOrder.direccion}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Tipo de Pedido</p>
                                    <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-md text-xs font-bold uppercase inline-block mt-1">
                                        {selectedOrder.tipo_pedido}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-purple-100 pt-6">
                            <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-4">Acciones</p>
                            <div className="flex gap-4">
                                <button 
                                    onClick={() => sendConfirmationEmail(selectedOrder)}
                                    disabled={sendingEmail}
                                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl text-xs font-black uppercase transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
                                >
                                    <FontAwesomeIcon icon={faPaperPlane} /> 
                                    {sendingEmail ? 'Enviando...' : 'Enviar Confirmación por Email'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrdersManager;