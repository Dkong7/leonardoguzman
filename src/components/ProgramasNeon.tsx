import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight } from '@fortawesome/free-solid-svg-icons';

const categories = [
  {
    name: 'Esenciales',
    items: [
      { id: '1', title: 'VISUALIZACIÓN' },
      { id: '2', title: 'VOCABULARIO' },
      { id: '3', title: 'CONCEPTOS TEÓRICOS' }
    ]
  },
  {
    name: 'Físicos',
    items: [
      { id: '4', title: 'TÉCNICA GENERAL' },
      { id: '5', title: 'TÉCNICAS INDEPENDIENTES' },
      { id: '6', title: 'ESTILOS' }
    ]
  },
  {
    name: 'Creativos',
    items: [
      { id: '7', title: 'IMPROVISACIÓN' },
      { id: '8', title: 'COMPOSICIÓN' },
      { id: '9', title: 'PRODUCCIÓN' }
    ]
  },
  {
    name: 'Más',
    items: [
      { id: '10', title: 'MÉTODOS DE ESTUDIO' },
      { id: '11', title: '"OUT OF THE BOX"' },
      { id: '12', title: 'EXTRAS' }
    ]
  }
];

const ProgramasNeon = () => {
  return (
    <div className="py-24 bg-[#0a0510] relative overflow-hidden font-sans">
      {/* Fondo Cyberpunk */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-nardo-900/30 via-nardo-950 to-black pointer-events-none"></div>

      <div className="max-w-6xl mx-auto px-4 relative z-10">
        <h2 className="text-center text-5xl md:text-7xl font-black text-white mb-6 uppercase tracking-tighter drop-shadow-[0_0_15px_rgba(157,78,221,0.6)]">
          CLASES <span className="text-transparent bg-clip-text bg-gradient-to-r from-nardo-500 to-purple-300">PERSONALIZADAS</span>
        </h2>
        <p className="text-center text-gray-400 max-w-3xl mx-auto mb-20 text-lg leading-relaxed">
          Ya son más de 10 años de experiencia refinando una metodología única. Mis métodos abarcan desde temas estrictamente musicales como la técnica o la teoría, hasta tópicos como métodos de estudio y producción.
        </p>

        <div className="space-y-16">
          {categories.map((cat) => (
            <div key={cat.name} className="relative">
              {/* Category Title */}
              <h3 className="text-3xl font-serif italic text-nardo-500 mb-8 border-b border-nardo-800 pb-2 inline-block px-4">
                {cat.name}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {cat.items.map((item) => (
                  <div key={item.id} className="group relative h-40 flex items-center justify-center border border-white/5 bg-white/5 rounded-xl overflow-hidden hover:border-nardo-500/50 transition-all duration-500 hover:shadow-[0_0_30px_rgba(157,78,221,0.2)]">
                    
                    {/* Big Number Background */}
                    <span className="absolute text-9xl font-black text-nardo-900/50 group-hover:text-nardo-500/20 transition-colors z-0 select-none scale-150 transform group-hover:scale-125 duration-500">
                      {item.id}
                    </span>
                    
                    {/* Title */}
                    <h4 className="relative z-10 text-xl md:text-2xl font-black text-white text-center uppercase tracking-wider group-hover:text-nardo-300 transition-colors px-4">
                      {item.title}
                    </h4>

                    {/* Reflection/Glow Effect */}
                    <div className="absolute inset-0 bg-gradient-to-t from-nardo-500/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 transform translate-y-full group-hover:translate-y-0"></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div className="mt-24 flex flex-col md:flex-row gap-6 justify-center items-center">
           <a href="https://escuelademusikita.com" className="group relative px-10 py-4 bg-gradient-to-r from-nardo-600 to-nardo-800 text-white font-bold text-lg tracking-widest rounded skew-x-[-10deg] hover:from-nardo-500 hover:to-nardo-600 transition-all shadow-[0_0_20px_rgba(157,78,221,0.4)]">
             <span className="block skew-x-[10deg] flex items-center gap-3">
               PROGRAMAR UNA CLASE <FontAwesomeIcon icon={faArrowRight} />
             </span>
           </a>
           <a href="/tienda" className="group relative px-10 py-4 border border-nardo-500 text-nardo-500 font-bold text-lg tracking-widest rounded skew-x-[-10deg] hover:bg-nardo-500 hover:text-white transition-all">
             <span className="block skew-x-[10deg]">
               PLANES DE ESTUDIO
             </span>
           </a>
        </div>

      </div>
    </div>
  );
};
export default ProgramasNeon;