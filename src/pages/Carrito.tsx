import { useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import { CartContext } from '../context/CartContext';
import type { CartItem } from '../context/CartContext'; // Import type explícito
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faArrowLeft, faLock, faCreditCard } from '@fortawesome/free-solid-svg-icons';
import { faPaypal } from '@fortawesome/free-brands-svg-icons';

const Carrito = () => {
  const { cartItems, removeFromCart, cartTotal } = useContext(CartContext);
  const [isProcessing, setIsProcessing] = useState(false);

  // Cálculos seguros (si es undefined, usa 0)
  const totalUSD = cartItems.reduce((acc: number, item: CartItem) => acc + ((item.precioUSD || 0) * (item.cantidad || 1)), 0);
  const totalCOP = cartItems.reduce((acc: number, item: CartItem) => acc + ((item.precioCOP || 0) * (item.cantidad || 1)), 0);

  const handlePayment = async (provider: 'mercadopago' | 'paypal') => {
    setIsProcessing(true);
    // ... lógica de pago ...
    setTimeout(() => { setIsProcessing(false); alert("Simulación de pago"); }, 1000);
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0510] text-white p-6 relative z-20">
        <div className="bg-white/5 p-10 rounded-3xl border border-white/10 text-center backdrop-blur-md max-w-md">
            <h2 className="text-3xl font-serif mb-4 text-purple-300">Tu carrito está vacío</h2>
            <div className="flex flex-col gap-3">
                <Link to="/tienda" className="bg-purple-600 hover:bg-purple-500 text-white py-3 px-6 rounded-xl font-bold uppercase tracking-widest transition-all">Ir a Tienda Oficial</Link>
                <Link to="/clases/material" className="bg-transparent border border-purple-500/50 hover:bg-purple-900/20 text-purple-300 py-3 px-6 rounded-xl font-bold uppercase tracking-widest transition-all">Ver Material Educativo</Link>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-28 pb-20 px-4 md:px-8 font-sans relative z-20">
      
      <div className="max-w-7xl mx-auto mb-10 flex items-center gap-4">
          <Link to="/" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
              <FontAwesomeIcon icon={faArrowLeft} />
          </Link>
          <h1 className="text-4xl font-serif">Tu Carrito <span className="text-purple-500 text-lg align-middle bg-purple-900/30 px-3 py-1 rounded-full ml-2">{cartTotal} items</span></h1>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          <div className="lg:col-span-2 space-y-6">
              {cartItems.map((item) => (
                  <div key={item.id} className="group bg-white/5 border border-white/10 rounded-2xl p-4 flex gap-6 items-center hover:border-purple-500/30 transition-colors">
                      <div className="w-24 h-24 bg-black rounded-xl overflow-hidden shrink-0 relative">
                          {/* Fallback para imagen vacía */}
                          <img 
                            src={item.imagen || 'https://placehold.co/100x100?text=No+Image'} 
                            alt={item.nombre} 
                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                          />
                          {item.categoria && (
                              <div className="absolute bottom-0 left-0 w-full bg-black/60 text-[8px] text-center py-1 uppercase font-bold text-white backdrop-blur-sm">
                                  {item.categoria}
                              </div>
                          )}
                      </div>

                      <div className="flex-1">
                          <div className="flex justify-between items-start">
                              <h3 className="text-xl font-bold text-white font-espacial leading-tight">{item.nombre}</h3>
                              <button onClick={() => removeFromCart(item.id)} className="text-gray-500 hover:text-red-500 transition-colors p-2">
                                  <FontAwesomeIcon icon={faTrash} />
                              </button>
                          </div>
                          <div className="mt-4 flex items-center gap-4">
                              <div className="bg-black/40 px-3 py-1 rounded-lg border border-white/5">
                                  <span className="text-purple-400 font-mono font-bold">${item.precioUSD} USD</span>
                              </div>
                              <div className="w-px h-4 bg-gray-700"></div>
                              <div className="text-gray-500 font-mono text-sm">
                                  {/* Protección contra undefined en toLocaleString */}
                                  ~ ${(item.precioCOP || 0).toLocaleString()} COP
                              </div>
                              <div className="text-xs text-gray-600 ml-auto">Cant: {item.cantidad}</div>
                          </div>
                      </div>
                  </div>
              ))}
          </div>

          <div className="lg:col-span-1">
              <div className="bg-[#15101a] border border-purple-500/20 rounded-3xl p-8 sticky top-28 shadow-2xl shadow-purple-900/20">
                  <h3 className="text-xl font-bold mb-6 text-white font-espacial uppercase tracking-widest border-b border-white/10 pb-4">Resumen</h3>
                  
                  <div className="space-y-4 mb-8">
                      <div className="flex justify-between items-center text-gray-400">
                          <span>Subtotal (USD)</span>
                          <span className="font-mono text-white">${totalUSD}</span>
                      </div>
                      <div className="flex justify-between items-center text-gray-400">
                          <span>Subtotal (COP)</span>
                          <span className="font-mono text-white">${totalCOP.toLocaleString()}</span>
                      </div>
                  </div>

                  <div className="bg-purple-900/20 rounded-xl p-4 mb-8 border border-purple-500/30 text-center">
                      <p className="text-xs text-purple-300 uppercase tracking-widest mb-1">Total a Pagar</p>
                      <div className="text-3xl font-mono font-bold text-white mb-1">${totalUSD} USD</div>
                      <div className="text-sm font-mono text-gray-400">o ${totalCOP.toLocaleString()} COP</div>
                  </div>

                  <div className="space-y-3">
                      <button 
                        onClick={() => handlePayment('mercadopago')}
                        disabled={isProcessing}
                        className="w-full bg-[#009ee3] hover:bg-[#007eb5] text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                      >
                          <FontAwesomeIcon icon={faCreditCard} /> Pagar con MercadoPago
                      </button>

                      <button 
                        onClick={() => handlePayment('paypal')}
                        disabled={isProcessing}
                        className="w-full bg-[#ffc439] hover:bg-[#f4bb2e] text-blue-900 font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                      >
                          <FontAwesomeIcon icon={faPaypal} /> Pagar con PayPal
                      </button>
                  </div>

                  <div className="mt-8 pt-6 border-t border-white/5 text-center">
                      <div className="flex items-center justify-center gap-2 text-gray-500 text-xs mb-2">
                          <FontAwesomeIcon icon={faLock} /> Pagos 100% Encriptados
                      </div>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default Carrito;