import { useContext, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import pb from '../lib/pocketbase';
import { CartContext } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext'; // AÑADIDO
import type { CartItem } from '../context/CartContext'; 
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faArrowLeft, faLock, faCreditCard, faDownload, faCheckCircle, faBoxOpen } from '@fortawesome/free-solid-svg-icons';
import { faPaypal } from '@fortawesome/free-brands-svg-icons';
import { motion, AnimatePresence } from 'framer-motion';

const Carrito = () => {
  const { cartItems, removeFromCart, cartTotal } = useContext(CartContext);
  const { lang, t } = useLanguage(); // Usamos idioma y traducciones
  
  // Estados de UI
  const [isProcessing, setIsProcessing] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [purchasedVaultItems, setPurchasedVaultItems] = useState<any[]>([]);

  // Cálculos
  const totalUSD = cartItems.reduce((acc: number, item: CartItem) => acc + ((item.precioUSD || 0) * (item.cantidad || 1)), 0);
  const totalCOP = cartItems.reduce((acc: number, item: CartItem) => acc + ((item.precioCOP || 0) * (item.cantidad || 1)), 0);
  
  const hasPhysicalItems = cartItems.some(item => item.tipo !== 'academico' && item.tipo !== 'digital');

  const [formData, setFormData] = useState({
      nombre: '', email: '', telefono: '', direccion: '', ciudad: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData({...formData, [e.target.name]: e.target.value});
  };

  const validateForm = () => {
      if (!formData.nombre || !formData.email || !formData.telefono) return false;
      if (hasPhysicalItems && (!formData.direccion || !formData.ciudad)) return false;
      return true;
  };

  const handlePayment = async (provider: 'mercadopago' | 'paypal') => {
    if (!validateForm()) {
        alert(lang === 'EN' ? "Please fill all required billing/shipping data." : "Por favor, completa todos los datos requeridos para la facturación/envío.");
        return;
    }

    setIsProcessing(true);
    
    try {
        const tipoPedido = hasPhysicalItems ? (cartItems.length > 1 ? 'mixto' : 'fisico') : 'digital';
        
        await pb.collection('pedidos').create({
            cliente_nombre: formData.nombre,
            cliente_email: formData.email,
            cliente_telefono: formData.telefono,
            direccion: hasPhysicalItems ? `${formData.direccion}, ${formData.ciudad}` : 'N/A (Digital)',
            tipo_pedido: tipoPedido,
            total_usd: totalUSD,
            total_cop: totalCOP, // Guardamos también el total en pesos
            estado: 'pagado', 
            items: cartItems
        });

        const productIds = cartItems.map(item => `producto="${item.id}"`).join(' || ');

        if (productIds) {
            const vaultRecords = await pb.collection('boveda_digital').getFullList({
                filter: productIds,
                expand: 'producto'
            });
            setPurchasedVaultItems(vaultRecords);
        }

        setTimeout(() => { 
            setIsProcessing(false); 
            setShowThankYou(true);
        }, 1500);

    } catch (error) {
        console.error("Error procesando pedido:", error);
        alert(lang === 'EN' ? "Error processing order. Try again." : "Hubo un error al procesar tu pedido. Intenta nuevamente.");
        setIsProcessing(false);
    }
  };

  if (cartItems.length === 0 && !showThankYou) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0510] text-white p-6 relative z-20">
        <div className="bg-white/5 p-10 rounded-3xl border border-white/10 text-center backdrop-blur-md max-w-md">
            <h2 className="text-3xl font-serif mb-4 text-purple-300">{t('empty_cart')}</h2>
            <div className="flex flex-col gap-3 mt-8">
                <Link to="/tienda" className="bg-purple-600 hover:bg-purple-500 text-white py-3 px-6 rounded-xl font-bold uppercase tracking-widest transition-all">{t('go_store')}</Link>
                <Link to="/clases/material" className="bg-transparent border border-purple-500/50 hover:bg-purple-900/20 text-purple-300 py-3 px-6 rounded-xl font-bold uppercase tracking-widest transition-all">{t('go_edu')}</Link>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-28 pb-20 px-4 md:px-8 font-sans relative z-20">
      
      <div className="max-w-7xl mx-auto mb-10 flex items-center gap-4">
          <Link to="/tienda" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
              <FontAwesomeIcon icon={faArrowLeft} />
          </Link>
          <h1 className="text-4xl font-serif">Checkout <span className="text-purple-500 text-lg align-middle bg-purple-900/30 px-3 py-1 rounded-full ml-2">{cartTotal} {t('items')}</span></h1>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-7 space-y-8">
              <div className="bg-[#15101a] border border-purple-500/20 rounded-3xl p-6 shadow-xl">
                  <h3 className="text-xl font-bold mb-4 font-espacial uppercase tracking-widest border-b border-white/10 pb-4">{t('summary')}</h3>
                  <div className="space-y-4">
                      {cartItems.map((item) => (
                          <div key={item.id} className="bg-black/40 border border-white/5 rounded-2xl p-4 flex gap-4 items-center">
                              <div className="w-20 h-20 bg-black rounded-xl overflow-hidden shrink-0 relative border border-white/10">
                                  <img src={item.imagen || '/placeholder.jpg'} alt={item.nombre} className="w-full h-full object-cover opacity-80" />
                              </div>
                              <div className="flex-1">
                                  <div className="flex justify-between items-start">
                                      <h3 className="text-lg font-bold text-white leading-tight">{item.nombre}</h3>
                                      <button onClick={() => removeFromCart(item.id)} className="text-gray-500 hover:text-red-500 transition-colors p-2">
                                          <FontAwesomeIcon icon={faTrash} />
                                      </button>
                                  </div>
                                  <div className="mt-2 flex items-center gap-3">
                                      {/* RENDERIZADO CONDICIONAL DEL PRECIO DEL ITEM */}
                                      {lang === 'EN' ? (
                                          <span className="text-purple-400 font-mono font-bold">${item.precioUSD} USD</span>
                                      ) : (
                                          <span className="text-purple-400 font-mono font-bold">${(item.precioCOP || 0).toLocaleString('es-CO')} COP</span>
                                      )}
                                      
                                      {/* El precio secundario como referencia */}
                                      <div className="w-px h-3 bg-gray-700"></div>
                                      {lang === 'EN' ? (
                                        <span className="text-gray-500 font-mono text-xs">~ ${(item.precioCOP || 0).toLocaleString('es-CO')} COP</span>
                                      ) : (
                                        <span className="text-gray-500 font-mono text-xs">~ ${item.precioUSD} USD</span>
                                      )}
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>

              <div className="bg-[#15101a] border border-purple-500/20 rounded-3xl p-6 shadow-xl">
                  <h3 className="text-xl font-bold mb-6 font-espacial uppercase tracking-widest border-b border-white/10 pb-4">
                      {lang === 'EN' ? 'Billing Details' : 'Datos de Facturación'} {hasPhysicalItems && (lang === 'EN' ? '& Shipping' : '& Envío')}
                  </h3>
                  
                  <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                              <label className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1 block">{lang === 'EN' ? 'Full Name *' : 'Nombre Completo *'}</label>
                              <input type="text" name="nombre" value={formData.nombre} onChange={handleInputChange} className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none" />
                          </div>
                          <div>
                              <label className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1 block">{lang === 'EN' ? 'Email (For Downloads) *' : 'Email (Para descargas) *'}</label>
                              <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none" />
                          </div>
                      </div>

                      <div>
                          <label className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1 block">{lang === 'EN' ? 'Phone / WhatsApp *' : 'Teléfono / WhatsApp *'}</label>
                          <input type="tel" name="telefono" value={formData.telefono} onChange={handleInputChange} className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none" />
                      </div>

                      {hasPhysicalItems && (
                          <div className="p-4 bg-purple-900/10 border border-purple-500/20 rounded-xl space-y-4 mt-4">
                              <div className="flex items-center gap-2 text-purple-300 text-sm font-bold mb-2">
                                  <FontAwesomeIcon icon={faBoxOpen} /> {lang === 'EN' ? 'Shipping Info (Physical Items)' : 'Información de Envío (Items Físicos)'}
                              </div>
                              <div>
                                  <label className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1 block">{lang === 'EN' ? 'Full Address *' : 'Dirección Completa *'}</label>
                                  <input type="text" name="direccion" value={formData.direccion} onChange={handleInputChange} className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none" />
                              </div>
                              <div>
                                  <label className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1 block">{lang === 'EN' ? 'City / Country *' : 'Ciudad / País *'}</label>
                                  <input type="text" name="ciudad" value={formData.ciudad} onChange={handleInputChange} className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none" />
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          </div>

          <div className="lg:col-span-5">
              <div className="bg-[#15101a] border border-purple-500/30 rounded-3xl p-8 sticky top-28 shadow-2xl shadow-purple-900/20">
                  <h3 className="text-xl font-bold mb-6 text-white font-espacial uppercase tracking-widest border-b border-white/10 pb-4">{t('total_pay')}</h3>
                  
                  {/* RENDERIZADO CONDICIONAL DEL TOTAL GIGANTE */}
                  <div className="bg-black/40 rounded-2xl p-6 mb-8 border border-white/5 text-center">
                      {lang === 'EN' ? (
                          <>
                              <div className="text-5xl font-mono font-black text-white mb-2">${totalUSD} <span className="text-xl text-purple-500">USD</span></div>
                              <div className="text-sm font-mono text-gray-500">{t('price_approx')} ${(totalCOP).toLocaleString('es-CO')} COP</div>
                          </>
                      ) : (
                          <>
                              <div className="text-4xl lg:text-5xl font-mono font-black text-white mb-2">${totalCOP.toLocaleString('es-CO')} <span className="text-xl text-purple-500">COP</span></div>
                              <div className="text-sm font-mono text-gray-500">{t('price_approx')} ${totalUSD} USD</div>
                          </>
                      )}
                  </div>

                  <div className="space-y-4">
                      {/* En Español la opción principal es MP, en Inglés es PayPal */}
                      {lang === 'ES' && (
                          <button 
                              onClick={() => handlePayment('mercadopago')}
                              disabled={isProcessing}
                              className="w-full bg-[#009ee3] hover:bg-[#007eb5] text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 text-lg shadow-lg"
                          >
                              {isProcessing ? <span className="animate-pulse">{t('processing')}</span> : <><FontAwesomeIcon icon={faCreditCard} /> {t('pay_mercadopago')}</>}
                          </button>
                      )}

                      <button 
                          onClick={() => handlePayment('paypal')}
                          disabled={isProcessing}
                          className="w-full bg-[#ffc439] hover:bg-[#f4bb2e] text-blue-900 font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 text-lg shadow-lg"
                      >
                          {isProcessing ? <span className="animate-pulse">{t('processing')}</span> : <><FontAwesomeIcon icon={faPaypal} /> {t('pay_paypal')}</>}
                      </button>
                      
                      {lang === 'EN' && (
                          <button 
                              onClick={() => handlePayment('mercadopago')}
                              disabled={isProcessing}
                              className="w-full bg-[#009ee3] hover:bg-[#007eb5] text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 text-sm shadow-lg"
                          >
                              {isProcessing ? <span className="animate-pulse">{t('processing')}</span> : <><FontAwesomeIcon icon={faCreditCard} /> Pay with LatAm Methods (COP)</>}
                          </button>
                      )}
                  </div>

                  <div className="mt-8 pt-6 border-t border-white/5 text-center">
                      <div className="flex items-center justify-center gap-2 text-gray-500 text-xs uppercase tracking-widest">
                          <FontAwesomeIcon icon={faLock} /> {t('secure_payment')}
                      </div>
                  </div>
              </div>
          </div>
      </div>

      <AnimatePresence>
          {showThankYou && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    className="bg-[#15101a] border border-purple-500/50 w-full max-w-2xl rounded-[2rem] shadow-[0_0_50px_rgba(168,85,247,0.3)] overflow-hidden flex flex-col max-h-[90vh]"
                  >
                      <div className="p-10 text-center border-b border-white/10 bg-gradient-to-b from-purple-900/20 to-transparent">
                          <div className="w-20 h-20 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                              <FontAwesomeIcon icon={faCheckCircle} />
                          </div>
                          <h2 className="text-3xl font-serif font-bold text-white mb-2">{lang === 'EN' ? 'Payment Successful!' : '¡Pago Exitoso!'}</h2>
                          <p className="text-gray-400 text-sm">{lang === 'EN' ? 'Receipt sent to' : 'El recibo ha sido enviado a'} <strong>{formData.email}</strong></p>
                      </div>

                      <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
                          {hasPhysicalItems && (
                              <div className="bg-orange-900/20 border border-orange-500/30 rounded-xl p-4 mb-6 text-center">
                                  <p className="text-orange-400 font-bold text-sm mb-1"><FontAwesomeIcon icon={faBoxOpen} /> {lang === 'EN' ? 'Preparing physical shipping' : 'Preparando tu envío físico'}</p>
                                  <p className="text-xs text-orange-200/70">{lang === 'EN' ? 'Your merch will be sent to the provided address.' : 'Tus items de Merch serán enviados a la dirección proporcionada.'}</p>
                              </div>
                          )}

                          {purchasedVaultItems.length > 0 && (
                              <div>
                                  <h3 className="text-sm font-black uppercase tracking-widest text-purple-400 mb-4 border-l-4 border-purple-500 pl-3">{lang === 'EN' ? 'Your Digital Downloads' : 'Tus Descargas Digitales'}</h3>
                                  <div className="space-y-4">
                                      {purchasedVaultItems.map((vaultItem, index) => {
                                          const prodName = vaultItem.expand?.producto?.nombre || "Material";
                                          const enlaces = Array.isArray(vaultItem.enlaces) ? vaultItem.enlaces : [];

                                          return (
                                              <div key={index} className="bg-black/50 border border-white/10 rounded-xl p-5">
                                                  <h4 className="text-lg font-bold text-white mb-3">{prodName}</h4>
                                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                      {enlaces.map((link: any, i: number) => (
                                                          <a 
                                                            key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                                                            className="flex items-center justify-between bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 rounded-lg p-3 transition-colors group"
                                                          >
                                                              <span className="text-xs font-bold text-purple-200 group-hover:text-white transition-colors">{link.titulo}</span>
                                                              <FontAwesomeIcon icon={faDownload} className="text-purple-400 group-hover:text-white" />
                                                          </a>
                                                      ))}
                                                  </div>
                                                  {enlaces.length === 0 && <p className="text-xs text-gray-500 italic">{lang === 'EN' ? 'No links available.' : 'No hay enlaces configurados.'}</p>}
                                              </div>
                                          );
                                      })}
                                  </div>
                              </div>
                          )}
                      </div>

                      <div className="p-6 border-t border-white/10 text-center bg-black/40">
                          <Link to="/clases" onClick={() => window.location.href = "/clases"} className="inline-block bg-white text-black font-bold uppercase tracking-widest text-xs px-8 py-4 rounded-xl hover:scale-105 transition-transform">
                              {lang === 'EN' ? 'GO TO DOJO' : 'IR AL DOJO DE CLASES'}
                          </Link>
                      </div>
                  </motion.div>
              </div>
          )}
      </AnimatePresence>
    </div>
  );
};

export default Carrito;