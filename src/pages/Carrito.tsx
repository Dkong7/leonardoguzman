import { useContext } from 'react';
import { CartContext } from '../context/CartContext';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faArrowLeft, faShieldAlt } from '@fortawesome/free-solid-svg-icons';

const Carrito = () => {
  const { cart, removeFromCart } = useContext(CartContext);

  const totalUSD = cart.reduce((acc, item) => acc + (item.precioUSD * item.cantidad), 0);
  const totalCOP = cart.reduce((acc, item) => acc + (item.precioCOP * item.cantidad), 0);

  // Funciones placeholder para las pasarelas. 
  // La implementación real se conectará con el backend Node.js.
  const handleMercadoPago = () => {
    console.log("Iniciando flujo MercadoPago...");
    // Integración MP pendiente
  };

  const handlePayPal = () => {
    console.log("Iniciando flujo PayPal...");
    // Integración PayPal pendiente
  };

  return (
    <div className="min-h-screen pt-40 pb-20 px-4 max-w-6xl mx-auto">
      
      <div className="flex items-center gap-4 mb-10">
        <Link to="/" className="text-purple-400 hover:text-white transition">
          <FontAwesomeIcon icon={faArrowLeft} size="lg" />
        </Link>
        <h1 className="text-4xl font-black uppercase tracking-widest text-white drop-shadow-[0_0_15px_rgba(217,70,239,0.5)]">Checkout</h1>
      </div>

      {cart.length === 0 ? (
        <div className="text-center py-20 bg-white/5 border border-purple-900/50 rounded-2xl backdrop-blur-md">
          <p className="text-gray-400 text-xl font-mono mb-6">Tu carrito está vacío.</p>
          <Link to="/" className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-8 rounded-lg uppercase tracking-widest transition-colors shadow-[0_0_20px_rgba(138,43,226,0.5)]">
            Ir a la tienda
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          {/* Lista de Productos */}
          <div className="lg:col-span-2 space-y-6">
            {cart.map((item) => (
              <div key={item.id} className="flex items-center gap-6 bg-[#1a0033]/80 border border-purple-500/30 p-4 rounded-xl shadow-lg">
                <img src={item.imagen} alt={item.nombre} className="w-24 h-24 object-cover rounded-lg border border-purple-500/50" />
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white uppercase tracking-wide">{item.nombre}</h3>
                  <p className="text-sm text-gray-400">Cantidad: {item.cantidad}</p>
                  <div className="mt-2 flex items-center gap-4">
                    <span className="font-mono text-purple-400 font-bold">${item.precioUSD} USD</span>
                    <span className="font-mono text-gray-500 text-sm">${item.precioCOP.toLocaleString('es-CO')} COP</span>
                  </div>
                </div>
                <button 
                  onClick={() => removeFromCart(item.id)}
                  className="p-3 text-gray-500 hover:text-red-500 transition-colors"
                  title="Eliminar"
                >
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              </div>
            ))}
          </div>

          {/* Resumen y Pagos */}
          <div className="bg-[#12002b] border border-purple-500 rounded-2xl p-8 h-fit sticky top-40 shadow-[0_0_30px_rgba(138,43,226,0.2)]">
            <h3 className="text-2xl font-black uppercase tracking-widest mb-6 border-b border-purple-900 pb-4">Resumen</h3>
            
            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center text-lg text-gray-300">
                <span>Subtotal ({cart.length} items)</span>
                <span className="font-mono">${totalUSD} USD</span>
              </div>
              <div className="flex justify-between items-center text-2xl font-black text-white pt-4 border-t border-purple-900">
                <span>Total</span>
                <div className="text-right">
                  <span className="font-mono block text-purple-400 drop-shadow-[0_0_8px_rgba(217,70,239,0.8)]">${totalUSD} USD</span>
                  <span className="font-mono text-sm text-gray-500 block">${totalCOP.toLocaleString('es-CO')} COP</span>
                </div>
              </div>
            </div>

            {/* Pasarelas de Pago */}
            <div className="space-y-4">
              <p className="text-xs text-center text-gray-500 font-bold uppercase tracking-widest flex justify-center items-center gap-2 mb-4">
                <FontAwesomeIcon icon={faShieldAlt} /> Pago Seguro
              </p>
              
              <button 
                onClick={handleMercadoPago}
                className="w-full bg-[#009EE3] hover:bg-[#0089c4] text-white font-bold py-4 rounded-xl uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(0,158,227,0.4)] hover:shadow-[0_0_25px_rgba(0,158,227,0.7)]"
              >
                Pagar con MercadoPago
              </button>
              
              <button 
                onClick={handlePayPal}
                className="w-full bg-[#FFC439] hover:bg-[#f4b625] text-[#003087] font-black py-4 rounded-xl uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(255,196,57,0.3)] hover:shadow-[0_0_25px_rgba(255,196,57,0.6)]"
              >
                Pagar con PayPal
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default Carrito;