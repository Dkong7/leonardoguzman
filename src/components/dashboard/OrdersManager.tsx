import { useState, useEffect } from 'react';
import pb from '../../lib/pocketbase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faClock, faUser, faEnvelope, faMapMarkerAlt, faTag } from '@fortawesome/free-solid-svg-icons';

const OrdersManager = () => {
    const [orders, setOrders] = useState<any[]>([]);

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

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
                {orders.map((order) => (
                    <div key={order.id} className="bg-[#26201b] border border-[#443b34] rounded-2xl p-6 shadow-xl flex flex-col md:flex-row justify-between gap-6">
                        {/* INFO CLIENTE */}
                        <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2 text-orange-500 font-black uppercase text-xs tracking-widest">
                                <FontAwesomeIcon icon={faUser} /> {order.cliente_nombre}
                            </div>
                            <p className="text-gray-400 text-sm flex items-center gap-2"><FontAwesomeIcon icon={faEnvelope} /> {order.cliente_email}</p>
                            <p className="text-gray-500 text-xs flex items-center gap-2"><FontAwesomeIcon icon={faMapMarkerAlt} /> {order.direccion}</p>
                        </div>

                        {/* INFO COMPRA */}
                        <div className="flex-1">
                            <h4 className="text-[10px] font-black text-[#78716c] uppercase mb-2">Items Comprados</h4>
                            <div className="space-y-1">
                                {order.items.map((item: any, i: number) => (
                                    <div key={i} className="text-xs text-white font-bold flex items-center gap-2">
                                        <FontAwesomeIcon icon={faTag} className="text-orange-700" /> {item.nombre} x {item.cantidad}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* TOTALES Y ACCIÓN */}
                        <div className="text-right flex flex-col justify-between items-end gap-4 min-w-[150px]">
                            <div>
                                <p className="text-2xl font-black text-white font-mono">${order.total_cop.toLocaleString()} <span className="text-[10px] text-gray-500">COP</span></p>
                                <p className="text-xs text-gray-500">${order.total_usd} USD</p>
                            </div>

                            {order.estado === 'pagado' ? (
                                <span className="bg-green-900/20 text-green-500 px-4 py-2 rounded-lg text-[10px] font-black uppercase border border-green-900/30 flex items-center gap-2">
                                    <FontAwesomeIcon icon={faCheckCircle} /> Pago Confirmado
                                </span>
                            ) : (
                                <button 
                                    onClick={() => approveOrder(order.id)}
                                    className="bg-orange-700 hover:bg-orange-600 text-white px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all shadow-lg flex items-center gap-2"
                                >
                                    <FontAwesomeIcon icon={faClock} /> Confirmar Pago
                                </button>
                            )}
                        </div>
                    </div>
                ))}
                {orders.length === 0 && <p className="text-center text-gray-600 py-20 font-bold uppercase tracking-widest">No hay pedidos registrados.</p>}
            </div>
        </div>
    );
};

export default OrdersManager;