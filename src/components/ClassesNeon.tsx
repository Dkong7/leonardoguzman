const steps = [
  { id: 1, title: 'VISUALIZACIÓN', cat: 'Esenciales' },
  { id: 2, title: 'VOCABULARIO', cat: 'Esenciales' },
  { id: 3, title: 'CONCEPTOS', cat: 'Esenciales' },
  { id: 4, title: 'TÉCNICA GRAL', cat: 'Físicos' },
  { id: 5, title: 'INDEPENDENCIA', cat: 'Físicos' },
  { id: 6, title: 'ESTILOS', cat: 'Físicos' },
  { id: 7, title: 'IMPROVISACIÓN', cat: 'Creativos' },
  { id: 8, title: 'COMPOSICIÓN', cat: 'Creativos' },
  { id: 9, title: 'PRODUCCIÓN', cat: 'Creativos' },
  { id: 10, title: 'MÉTODOS', cat: 'Mas' },
  { id: 11, title: 'OUT OF BOX', cat: 'Mas' },
  { id: 12, title: 'EXTRAS', cat: 'Mas' },
];

const ClassesNeon = () => {
  return (
    <div className="py-20 bg-nardo-950 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-nardo-500/10 rounded-full blur-[120px]"></div>
      <div className="max-w-6xl mx-auto px-4 relative z-10">
        <h2 className="text-center text-5xl md:text-6xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-600 mb-4 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
          CLASES PERSONALIZADAS
        </h2>
        <p className="text-center text-gray-400 max-w-2xl mx-auto mb-16">
          Más de 10 años de experiencia refinando una metodología única que abarca desde la física del instrumento hasta la psicología del artista.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
          {steps.map((s) => (
            <div key={s.id} className="group relative p-6 border border-nardo-800 bg-nardo-900/50 hover:bg-nardo-800/80 transition-all duration-300 rounded-xl hover:shadow-[0_0_30px_rgba(255,0,0,0.2)] hover:border-red-500/50">
               <div className="text-6xl font-black text-nardo-800 group-hover:text-red-600/20 absolute top-2 right-4 transition-colors">{s.id}</div>
               <div className="text-red-500 font-serif italic text-sm mb-2">{s.cat}</div>
               <h3 className="text-xl font-bold text-white group-hover:text-red-400 transition-colors">{s.title}</h3>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
           <a href="https://escuelademusikita.com" className="inline-block px-12 py-4 bg-gradient-to-r from-red-600 to-red-800 text-white font-bold text-lg tracking-widest rounded-full shadow-[0_0_20px_#ff0000] hover:scale-105 transition-transform animate-pulse">
             PROGRAMAR UNA CLASE
           </a>
        </div>
      </div>
    </div>
  );
};
export default ClassesNeon;