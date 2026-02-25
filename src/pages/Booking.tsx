import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faGlobeAmericas, faFileContract, faDownload, faPaperPlane } from '@fortawesome/free-solid-svg-icons';

const Booking = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    type: 'booking',
    message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Aquí iría la lógica de envío real
    alert("Solicitud recibida. Nos pondremos en contacto pronto.");
  };

  // Estilos Neumorfismo Oscuro + Glassmorphism
  const cardStyle = "bg-[#121212]/40 backdrop-blur-2xl border border-white/5 rounded-3xl p-8 shadow-[10px_10px_30px_rgba(0,0,0,0.5),-5px_-5px_15px_rgba(255,255,255,0.03)]";
  const inputStyle = "w-full bg-[#0a0a0a] border border-[#333] rounded-xl px-4 py-3 text-gray-200 focus:outline-none focus:border-purple-500/50 focus:shadow-[0_0_15px_rgba(168,85,247,0.2)] transition-all placeholder-gray-600 font-sans shadow-[inset_3px_3px_6px_rgba(0,0,0,0.8),inset_-2px_-2px_4px_rgba(255,255,255,0.05)]";

  return (
    <div className="min-h-screen bg-[#050505] text-white pt-32 pb-20 px-4 md:px-8 relative overflow-hidden font-sans">
      
      {/* Fondo Ambiental Sutil */}
      <div className="absolute top-0 left-0 w-full h-full z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[10%] left-[-10%] w-[600px] h-[600px] bg-blue-900/5 rounded-full blur-[120px]"></div>
        <div className="absolute top-[40%] left-[30%] w-[300px] h-[300px] bg-white/5 rounded-full blur-[100px] opacity-30"></div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* HEADER IMPONENTE */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <h4 className="text-purple-500 font-bold tracking-[0.4em] uppercase text-xs mb-4">Management & Press</h4>
          <h1 className="text-5xl md:text-7xl font-serif text-white mb-6">Booking</h1>
          <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-purple-500 to-transparent mx-auto"></div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          
          {/* COLUMNA IZQUIERDA: INFO DISQUERA / MANAGEMENT */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-8"
          >
            <div className={cardStyle}>
              <h2 className="text-2xl font-serif mb-6 text-white border-l-2 border-purple-500 pl-4">Representación</h2>
              <p className="text-gray-400 mb-8 leading-relaxed font-light">
                Para contrataciones, festivales, clínicas y colaboraciones de marca, por favor contacte a nuestro equipo de management. Nos reservamos el derecho de admisión de propuestas.
              </p>
              
              <div className="space-y-6">
                <div className="flex items-center gap-4 group">
                  <div className="w-12 h-12 rounded-full bg-black/50 border border-white/10 flex items-center justify-center text-purple-400 group-hover:text-white group-hover:border-purple-500 transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                    <FontAwesomeIcon icon={faEnvelope} />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Booking Agent</p>
                    <a href="mailto:booking@leonardoguzman.com" className="text-lg text-white font-serif hover:text-purple-400 transition-colors">booking@leonardoguzman.com</a>
                  </div>
                </div>

                <div className="flex items-center gap-4 group">
                  <div className="w-12 h-12 rounded-full bg-black/50 border border-white/10 flex items-center justify-center text-purple-400 group-hover:text-white group-hover:border-purple-500 transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                    <FontAwesomeIcon icon={faGlobeAmericas} />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Base</p>
                    <p className="text-lg text-white font-serif">Bogotá, Colombia (Available Worldwide)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* SECCIÓN DE DESCARGAS (EPK / RIDER) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button className={`${cardStyle} !p-6 flex items-center justify-between group hover:border-purple-500/30 transition-all cursor-pointer`}>
                <div className="flex items-center gap-3">
                  <FontAwesomeIcon icon={faDownload} className="text-gray-500 group-hover:text-white transition-colors" />
                  <div className="text-left">
                    <span className="block text-white font-bold text-sm">Download EPK</span>
                    <span className="block text-[10px] text-gray-500 uppercase tracking-wider">Press Kit 2026</span>
                  </div>
                </div>
              </button>

              <button className={`${cardStyle} !p-6 flex items-center justify-between group hover:border-purple-500/30 transition-all cursor-pointer`}>
                <div className="flex items-center gap-3">
                  <FontAwesomeIcon icon={faFileContract} className="text-gray-500 group-hover:text-white transition-colors" />
                  <div className="text-left">
                    <span className="block text-white font-bold text-sm">Tech Rider</span>
                    <span className="block text-[10px] text-gray-500 uppercase tracking-wider">Stage & Input List</span>
                  </div>
                </div>
              </button>
            </div>
          </motion.div>

          {/* COLUMNA DERECHA: FORMULARIO */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <div className={`${cardStyle} h-full`}>
              <h3 className="text-xl font-serif mb-8 text-white flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                Formulario de Contacto
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400 uppercase tracking-wider font-bold ml-1">Nombre / Entidad</label>
                    <input 
                      type="text" 
                      required
                      className={inputStyle}
                      placeholder="Tu nombre o empresa"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400 uppercase tracking-wider font-bold ml-1">Email Oficial</label>
                    <input 
                      type="email" 
                      required
                      className={inputStyle}
                      placeholder="email@dominio.com"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-gray-400 uppercase tracking-wider font-bold ml-1">Asunto</label>
                  <select 
                    className={`${inputStyle} appearance-none cursor-pointer`}
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                  >
                    <option value="booking">Booking / Concierto</option>
                    <option value="press">Prensa / Entrevista</option>
                    <option value="collab">Colaboración / Marca</option>
                    <option value="clinic">Clínica / Masterclass</option>
                    <option value="other">Otro</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-gray-400 uppercase tracking-wider font-bold ml-1">Mensaje / Propuesta</label>
                  <textarea 
                    rows={5}
                    required
                    className={`${inputStyle} resize-none`}
                    placeholder="Detalles del evento, fecha, lugar, presupuesto estimado..."
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                  ></textarea>
                </div>

                <button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-purple-900 to-purple-700 hover:from-purple-700 hover:to-purple-500 text-white font-bold py-4 rounded-xl shadow-[0_10px_20px_rgba(107,33,168,0.3)] hover:shadow-[0_10px_30px_rgba(107,33,168,0.5)] transition-all transform hover:-translate-y-1 uppercase tracking-widest text-xs flex items-center justify-center gap-3 border border-purple-500/20"
                >
                  <FontAwesomeIcon icon={faPaperPlane} /> Enviar Propuesta
                </button>
              </form>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
};

export default Booking;