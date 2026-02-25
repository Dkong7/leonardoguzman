import { useEffect, useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import { CartContext } from '../context/CartContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faShoppingCart, faCartPlus } from '@fortawesome/free-solid-svg-icons';

// Mock Data
const academicProducts = [
  { id: 'acad_1', nombre: 'Teoría Musical Aplicada (PDF)', precioUSD: 15, precioCOP: 60000, imagen: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500', categoria: 'libro', descripcion: 'Manual completo de armonía moderna.', setMarco: 'c' },
  { id: 'acad_2', nombre: 'Pack de Backing Tracks Jazz', precioUSD: 10, precioCOP: 40000, imagen: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=500', categoria: 'audio', descripcion: '10 Pistas en HQ para improvisar.', setMarco: 'a' },
  { id: 'acad_3', nombre: 'Rutina de Técnica Diaria', precioUSD: 20, precioCOP: 80000, imagen: 'https://images.unsplash.com/photo-1514117445516-2ec90fa4b84b?w=500', categoria: 'video', descripcion: 'Video curso descargable de 1 hora.', setMarco: 'd' },
];

const TiendaAcademia = () => {
  const { addToCart, cartTotal } = useContext(CartContext);
  const [filter, setFilter] = useState('todos');

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const filteredProducts = filter === 'todos' 
    ? academicProducts 
    : academicProducts.filter(p => p.categoria === filter);

  // MANEJADOR SEGURO PARA TYPESCRIPT
  const handleAdd = (prod: typeof academicProducts[0]) => {
      // Inyectamos 'cantidad: 1' para satisfacer la interfaz CartItem
      addToCart({ ...prod, cantidad: 1 });
  };

  return (
    <div className="min-h-screen bg-white text-gray-700 font-sans selection:bg-purple-200">
      
      {/* NAVBAR ZEN INTEGRADO */}
      <nav className="sticky top-0 w-full px-6 py-4 bg-white/90 backdrop-blur-md flex justify-between items-center z-50 border-b border-purple-50">
          <Link to="/clases" className="text-gray-400 hover:text-purple-600 transition-colors text-xs font-bold tracking-[0.2em] uppercase flex items-center gap-2">
             <FontAwesomeIcon icon={faArrowLeft} /> Volver al Dojo
          </Link>
          
          <div className="flex items-center gap-6">
             <Link to="/carrito" className="relative group">
                <FontAwesomeIcon icon={faShoppingCart} className="text-gray-400 group-hover:text-purple-600 transition-colors text-lg" />
                {cartTotal > 0 && (
                    <span className="absolute -top-2 -right-2 bg-purple-600 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                        {cartTotal}
                    </span>
                )}
             </Link>
          </div>
      </nav>

      <header className="pt-16 pb-12 text-center px-6">
          <h1 className="text-4xl md:text-5xl font-serif text-purple-900 mb-4">Material de Estudio</h1>
          <p className="text-gray-500 font-light max-w-xl mx-auto">Herramientas diseñadas para acelerar tu proceso. Descargas digitales inmediatas tras la compra.</p>
      </header>

      {/* FILTROS */}
      <div className="flex justify-center gap-4 mb-12">
          {['todos', 'libro', 'audio', 'video'].map((cat) => (
              <button 
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider border transition-all ${filter === cat ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-400 border-gray-200 hover:border-purple-300'}`}
              >
                  {cat}
              </button>
          ))}
      </div>

      {/* GRID PRODUCTOS */}
      <div className="max-w-6xl mx-auto px-6 pb-24 grid grid-cols-1 md:grid-cols-3 gap-8">
          {filteredProducts.map((prod) => (
              <div key={prod.id} className="group bg-white rounded-3xl p-6 border border-gray-100 shadow-lg hover:shadow-purple-100/50 transition-all hover:-translate-y-1">
                  <div className="h-48 rounded-2xl overflow-hidden mb-6 relative">
                      <img src={prod.imagen} alt={prod.nombre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide text-purple-600">
                          {prod.categoria}
                      </div>
                  </div>
                  
                  <h3 className="text-lg font-bold text-gray-800 mb-2 font-serif">{prod.nombre}</h3>
                  <p className="text-sm text-gray-500 mb-6 line-clamp-2">{prod.descripcion}</p>
                  
                  <div className="flex items-center justify-between border-t border-gray-50 pt-4">
                      <div className="flex flex-col">
                          <span className="text-xl font-serif text-purple-900">${prod.precioUSD} <span className="text-[10px] text-gray-400">USD</span></span>
                          <span className="text-[10px] text-gray-400">${prod.precioCOP.toLocaleString()} COP</span>
                      </div>
                      <button 
                        onClick={() => handleAdd(prod)}
                        className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center hover:bg-purple-600 hover:text-white transition-all shadow-sm"
                      >
                          <FontAwesomeIcon icon={faCartPlus} />
                      </button>
                  </div>
              </div>
          ))}
      </div>

    </div>
  );
};

export default TiendaAcademia;