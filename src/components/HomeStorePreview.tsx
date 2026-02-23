import { useState, useContext } from 'react';
import { CartContext } from '../context/CartContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faCartPlus } from '@fortawesome/free-solid-svg-icons';

const mockProducts = [
  { id: '1', nombre: 'Preset Pack Vol. 1', precioUSD: 25, precioCOP: 100000, imagen: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=500', descripcion: 'Colección de 50 presets premium para guitarra eléctrica.', categoria: 'musica', setMarco: 'c' },
  { id: '2', nombre: 'Masterclass: Sweep Picking', precioUSD: 40, precioCOP: 160000, imagen: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=500', descripcion: 'Curso intensivo de 2 horas sobre técnicas avanzadas.', categoria: 'merch', setMarco: 'a' },
  { id: '3', nombre: 'Beats & Backing Tracks', precioUSD: 15, precioCOP: 60000, imagen: 'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=500', descripcion: 'Pack de 10 backing tracks en alta calidad (WAV).', categoria: 'musica', setMarco: 'd' }
];

const HomeStorePreview = () => {
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const { addToCart } = useContext(CartContext);

  const handleAddToCart = (product: any) => {
    addToCart(product);
    setSelectedProduct(null);
  };

  return (
    <>
      <style>{`
        .card-container {
            position: relative;
            /* Padding para que los bordes no tapen el contenido */
            padding: 45px 35px 25px 35px; 
            margin-bottom: 3rem;
            transition: transform 0.3s ease;
        }
        .card-container:hover { transform: translateY(-10px); }

        /* BORDES (Imágenes Reales) */
        .border-img-top {
            position: absolute;
            top: 0; left: 0;
            width: 100%; height: 50px; /* Altura fija para evitar colapso */
            object-fit: fill; 
            z-index: 10;
            pointer-events: none;
        }
        .border-img-left {
            position: absolute;
            top: 0; left: 0;
            width: 30px; height: 100%; /* Ancho fijo */
            object-fit: fill;
            z-index: 10;
            pointer-events: none;
        }
        .border-img-right {
            position: absolute;
            top: 0; right: 0;
            width: 30px; height: 100%;
            object-fit: fill;
            z-index: 10;
            pointer-events: none;
        }

        .card-bg {
            position: absolute;
            inset: 10px; /* Un poco adentro para asegurar que el borde tape la unión */
            background: linear-gradient(180deg, rgba(20,0,40,0.95) 0%, rgba(5,0,10,0.98) 100%);
            border: 1px solid rgba(255,255,255,0.05);
            z-index: 1;
        }

        .card-content {
            position: relative; z-index: 20; height: 100%; display: flex; flex-direction: column;
        }

        /* TEMA OSCURO */
        html.tema-oscuro .card-bg { background: rgba(255, 255, 255, 0.9); box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
        html.tema-oscuro .border-img-top,
        html.tema-oscuro .border-img-left,
        html.tema-oscuro .border-img-right { filter: grayscale(100%) brightness(0.2); }
        html.tema-oscuro .card-title { color: #000; text-shadow: none; }
        html.tema-oscuro .card-price { color: #444; font-weight: 800; }
        html.tema-oscuro .card-cat { color: #666; }
      `}</style>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 pt-8 pb-16 max-w-7xl mx-auto">
        {mockProducts.map((prod) => (
          <div key={prod.id} onClick={() => setSelectedProduct(prod)} className="card-container cursor-pointer group">
            
            {/* BORDES FLOTANTES */}
            <img src={`/card-top-${prod.setMarco}.png`} className="border-img-top" alt="" />
            <img src={`/card-left-${prod.setMarco}.png`} className="border-img-left" alt="" />
            <img src={`/card-right-${prod.setMarco}.png`} className="border-img-right" alt="" />

            <div className="card-bg"></div>

            <div className="card-content">
              <div className="h-52 overflow-hidden mb-4 border-b border-white/10 mx-auto w-full">
                <img src={prod.imagen} alt={prod.nombre} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
              </div>
              <div className="text-center flex-1 flex flex-col justify-between px-2">
                <div>
                    <span className="card-cat text-[9px] uppercase tracking-[0.2em] text-purple-400 font-bold mb-2 block opacity-80">{prod.categoria}</span>
                    <h4 className="card-title font-espacial font-bold text-xl mb-2 text-white leading-tight drop-shadow-md">{prod.nombre}</h4>
                </div>
                <p className="card-price text-purple-300 font-mono text-lg mt-3">${prod.precioUSD} USD</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-[#120024] border border-purple-500 rounded-2xl p-6 w-full max-w-lg relative shadow-[0_0_40px_rgba(138,43,226,0.3)]">
            <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
              <FontAwesomeIcon icon={faTimes} size="xl" />
            </button>
            <img src={selectedProduct.imagen} alt={selectedProduct.nombre} className="w-full h-64 object-cover rounded-lg mb-6 border border-white/10" />
            <h2 className="text-2xl font-black uppercase tracking-wide mb-2 text-white font-espacial">{selectedProduct.nombre}</h2>
            <p className="text-gray-300 mb-6 text-sm leading-relaxed">{selectedProduct.descripcion}</p>
            <div className="flex justify-between items-center mb-6 bg-black/50 p-4 rounded-lg border border-purple-900/50">
                 <p className="text-2xl font-mono font-bold text-purple-400">${selectedProduct.precioUSD} <span className="text-xs text-gray-500">USD</span></p>
            </div>
            <button onClick={() => handleAddToCart(selectedProduct)} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-lg uppercase tracking-widest transition-colors flex justify-center items-center gap-2">
              <FontAwesomeIcon icon={faCartPlus} /> Agregar al Carrito
            </button>
          </div>
        </div>
      )}
    </>
  );
};
export default HomeStorePreview;