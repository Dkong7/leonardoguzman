import { useState, useEffect, useContext } from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faGlobeAmericas, faFileContract, faDownload, faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import SpaceBackground from '../components/SpaceBackground';
import { ThemeContext } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const Booking = () => {
  const { theme } = useContext(ThemeContext);
  const { t } = useLanguage();
  const isDark = theme === 'purple';

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
    alert("Message sent! (Demo)");
  };

  // --- ESTILOS DINÁMICOS ---
  const textPrimary = isDark ? 'text-white' : 'text-gray-800';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';

  // Panel Container
  const cardStyle = isDark
    ? 'bg-[#1a1a24]/60 backdrop-blur-xl border border-white/10 shadow-[0_0_40px_rgba(147,51,234,0.15)]' // Dark Glass
    : 'bg-[#e0e5ec] border border-white/60 shadow-[20px_20px_60px_#bebebe,-20px_-20px_60px_#ffffff]'; // Light Neumorphism

  // Inputs
  const inputStyle = isDark
    ? 'bg-black/40 border border-white/10 text-white focus:border-purple-500 focus:shadow-[0_0_15px_rgba(168,85,247,0.3)] placeholder-gray-600'
    : 'bg-[#e0e5ec] border-transparent text-gray-700 shadow-[inset_5px_5px_10px_#bebebe,inset_-5px_-5px_10px_#ffffff] focus:shadow-[inset_2px_2px_5px_#bebebe,inset_-2px_-2px_5px_#ffffff] placeholder-gray-400';

  // Botones Pequeños (Download)
  const buttonSmallStyle = isDark
    ? 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-purple-500/50 text-white'
    : 'bg-[#e0e5ec] shadow-[5px_5px_10px_#bebebe,-5px_-5px_10px_#ffffff] hover:shadow-[inset_3px_3px_6px_#bebebe,inset_-3px_-3px_6px_#ffffff] text-gray-700';

  // Botón Submit (Siempre destacado)
  const submitBtnStyle = isDark
    ? 'bg-gradient-to-r from-purple-900 to-purple-600 hover:from-purple-700 hover:to-purple-500 text-white shadow-[0_0_20px_rgba(147,51,234,0.4)] border border-purple-500/30'
    : 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-[6px_6px_12px_#bebebe,-6px_-6px_12px_#ffffff] hover:shadow-lg border border-transparent';

  return (
    <div className={`min-h-screen relative font-sans pt-32 pb-20 px-4 md:px-8 overflow-x-hidden transition-colors duration-500 ${isDark ? 'bg-[#050505]' : 'bg-[#e0e5ec]'}`}>
      
      {/* FONDO DE ESTRELLAS (Solo Dark) */}
      {isDark && (
          <div className="fixed inset-0 z-0">
              <SpaceBackground />
          </div>
      )}

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* HEADER */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <h4 className={`font-bold tracking-[0.4em] uppercase text-xs mb-4 ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
            {t('management_press')}
          </h4>
          <h1 className={`text-5xl md:text-7xl font-serif mb-6 ${textPrimary} drop-shadow-xl`}>
            {t('booking_title')}
          </h1>
          <div className={`h-[2px] w-24 mx-auto rounded-full ${isDark ? 'bg-purple-600' : 'bg-purple-500'}`}></div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          
          {/* COLUMNA IZQUIERDA: INFO */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-8"
          >
            <div className={`${cardStyle} rounded-[2.5rem] p-8 md:p-10 transition-all duration-300`}>
              <h2 className={`text-2xl font-serif mb-6 border-l-4 border-purple-500 pl-4 ${textPrimary}`}>
                {t('representation')}
              </h2>
              <p className={`${textSecondary} mb-10 leading-relaxed font-light text-sm md:text-base`}>
                {t('representation_desc')}
              </p>
              
              <div className="space-y-8">
                {/* Contact Item */}
                <div className="flex items-center gap-6 group">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl transition-all ${isDark ? 'bg-black/40 border border-purple-500/30 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 'bg-[#e0e5ec] shadow-[inset_4px_4px_8px_#bebebe,inset_-4px_-4px_8px_#ffffff] text-purple-600'}`}>
                    <FontAwesomeIcon icon={faEnvelope} />
                  </div>
                  <div>
                    <p className={`text-[10px] uppercase tracking-widest font-bold mb-1 ${textSecondary}`}>{t('booking_agent')}</p>
                    <a href="mailto:booking@leonardoguzman.com" className={`text-lg md:text-xl font-serif transition-colors ${isDark ? 'text-white hover:text-purple-400' : 'text-gray-800 hover:text-purple-600'}`}>
                      booking@leonardoguzman.com
                    </a>
                  </div>
                </div>

                {/* Location Item */}
                <div className="flex items-center gap-6 group">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl transition-all ${isDark ? 'bg-black/40 border border-purple-500/30 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 'bg-[#e0e5ec] shadow-[inset_4px_4px_8px_#bebebe,inset_-4px_-4px_8px_#ffffff] text-purple-600'}`}>
                    <FontAwesomeIcon icon={faGlobeAmericas} />
                  </div>
                  <div>
                    <p className={`text-[10px] uppercase tracking-widest font-bold mb-1 ${textSecondary}`}>{t('base')}</p>
                    <p className={`text-lg md:text-xl font-serif ${textPrimary}`}>
                      {t('base_location')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* DOWNLOADS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <button className={`${buttonSmallStyle} rounded-2xl p-5 flex items-center justify-between group transition-all`}>
                <div className="flex items-center gap-4">
                  <FontAwesomeIcon icon={faDownload} className={`text-lg ${isDark ? 'text-purple-400' : 'text-purple-500'}`} />
                  <div className="text-left">
                    <span className={`block font-bold text-sm ${textPrimary}`}>{t('download_epk')}</span>
                    <span className={`block text-[9px] uppercase tracking-wider ${textSecondary}`}>{t('press_kit')}</span>
                  </div>
                </div>
              </button>

              <button className={`${buttonSmallStyle} rounded-2xl p-5 flex items-center justify-between group transition-all`}>
                <div className="flex items-center gap-4">
                  <FontAwesomeIcon icon={faFileContract} className={`text-lg ${isDark ? 'text-purple-400' : 'text-purple-500'}`} />
                  <div className="text-left">
                    <span className={`block font-bold text-sm ${textPrimary}`}>{t('tech_rider')}</span>
                    <span className={`block text-[9px] uppercase tracking-wider ${textSecondary}`}>{t('stage_plot')}</span>
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
            <div className={`${cardStyle} rounded-[2.5rem] p-8 md:p-10 h-full`}>
              <h3 className={`text-xl font-serif mb-8 flex items-center gap-3 ${textPrimary}`}>
                <span className={`w-2 h-2 rounded-full animate-pulse ${isDark ? 'bg-green-500' : 'bg-green-600'}`}></span>
                {t('contact_form')}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className={`text-[10px] uppercase tracking-wider font-bold ml-1 ${textSecondary}`}>{t('name_entity')}</label>
                    <input 
                      type="text" 
                      required
                      className={`${inputStyle} w-full rounded-xl px-4 py-3 outline-none transition-all`}
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={`text-[10px] uppercase tracking-wider font-bold ml-1 ${textSecondary}`}>{t('email_official')}</label>
                    <input 
                      type="email" 
                      required
                      className={`${inputStyle} w-full rounded-xl px-4 py-3 outline-none transition-all`}
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className={`text-[10px] uppercase tracking-wider font-bold ml-1 ${textSecondary}`}>{t('subject')}</label>
                  <select 
                    className={`${inputStyle} w-full rounded-xl px-4 py-3 outline-none appearance-none cursor-pointer`}
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                  >
                    <option value="booking">{t('opt_booking')}</option>
                    <option value="press">{t('opt_press')}</option>
                    <option value="collab">{t('opt_collab')}</option>
                    <option value="clinic">{t('opt_clinic')}</option>
                    <option value="other">{t('opt_other')}</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className={`text-[10px] uppercase tracking-wider font-bold ml-1 ${textSecondary}`}>{t('message_proposal')}</label>
                  <textarea 
                    rows={5}
                    required
                    className={`${inputStyle} w-full rounded-xl px-4 py-3 outline-none resize-none`}
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                  ></textarea>
                </div>

                <button 
                  type="submit" 
                  className={`w-full font-bold py-4 rounded-xl transition-all transform hover:-translate-y-1 uppercase tracking-widest text-xs flex items-center justify-center gap-3 ${submitBtnStyle}`}
                >
                  <FontAwesomeIcon icon={faPaperPlane} /> {t('send_proposal')}
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