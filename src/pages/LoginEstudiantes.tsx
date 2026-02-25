import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import pb from '../lib/pocketbase';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faLock, faArrowRight, faCircleNotch, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../context/LanguageContext';

const LoginEstudiantes = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await pb.collection('users').authWithPassword(email, password);
      if (pb.authStore.isValid) {
          navigate('/aula'); 
      }
    } catch (err: any) {
      console.error(err);
      setError('Credenciales incorrectas. Por favor verifica tu correo y contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0510] flex items-center justify-center p-6 relative overflow-hidden font-sans">
      
      {/* --- ELEMENTOS DE FONDO (ORBES PURPURA) --- */}
      <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-purple-900/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-fuchsia-900/10 rounded-full blur-[120px] pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-5xl bg-[#1a0b2e]/60 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_0_80px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col md:flex-row relative z-10 border border-purple-500/20"
      >
        
        {/* LADO IZQUIERDO: ARTE Y LOGO */}
        <div className="md:w-1/2 bg-[#120621] text-white p-12 flex flex-col justify-between relative overflow-hidden border-r border-purple-500/10">
            {/* Imagen de fondo sutil con overlay morado */}
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center opacity-10 mix-blend-luminosity"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#1a0b2e] via-[#1a0b2e]/80 to-transparent"></div>
            
            <div className="relative z-10">
                <Link to="/clases" className="group flex items-center gap-2 text-purple-400 hover:text-white transition-all text-[10px] font-black tracking-[0.2em] uppercase mb-12">
                    <FontAwesomeIcon icon={faArrowLeft} className="group-hover:-translate-x-1 transition-transform" /> {t('home')}
                </Link>
                
                {/* INTEGRACIÓN LOGO GUITARROSIS */}
                <img src="/guitarrosis-logo.svg" alt="Guitarrosis" className="h-16 mb-10 drop-shadow-[0_0_15px_rgba(168,85,247,0.4)]" />
                
                <h2 className="text-4xl md:text-5xl font-serif leading-[1.1] mb-6 text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-300">
                    Tu viaje musical continúa aquí.
                </h2>
                <p className="text-purple-200/60 font-light text-lg leading-relaxed">
                    Accede a tu panel personalizado, descarga de materiales y seguimiento de objetivos.
                </p>
            </div>

            <div className="relative z-10 mt-12">
                <div className="flex items-center gap-4 text-[10px] font-bold text-purple-400/50 uppercase tracking-[0.3em]">
                    <div className="h-px w-8 bg-purple-500/30"></div>
                    Guitarrosis Academy
                </div>
            </div>
        </div>

        {/* LADO DERECHO: FORMULARIO NEUMÓRFICO OSCURO */}
        <div className="md:w-1/2 p-12 flex flex-col justify-center bg-transparent">
            <div className="mb-10 text-center md:text-left">
                <img src="/guitarrosis-logo.svg" alt="Guitarrosis" className="h-8 mb-6 mx-auto md:mx-0 opacity-50 md:hidden" />
                <h3 className="text-3xl font-serif text-white mb-2 tracking-tight">Aula Virtual</h3>
                <p className="text-purple-300/50 text-sm font-medium uppercase tracking-widest">Identificación de Alumno</p>
            </div>

            {error && (
                <motion.div 
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    className="mb-8 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-3 backdrop-blur-md"
                >
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                    {error}
                </motion.div>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em] ml-1">Email</label>
                    <div className="relative group">
                        <FontAwesomeIcon icon={faEnvelope} className="absolute left-5 top-1/2 -translate-y-1/2 text-purple-500/50 group-focus-within:text-purple-400 transition-colors" />
                        <input 
                            type="email" 
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-[#0a0510]/50 border border-purple-500/20 text-white text-sm rounded-2xl py-4 pl-14 pr-4 focus:outline-none focus:border-purple-500/60 focus:ring-4 focus:ring-purple-500/5 transition-all placeholder-purple-900 shadow-inner"
                            placeholder="correo@ejemplo.com"
                        />
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between items-center ml-1">
                        <label className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em]">Password</label>
                        <a href="#" className="text-[9px] font-bold text-purple-500 hover:text-purple-300 transition-colors uppercase tracking-widest">¿Olvidaste el acceso?</a>
                    </div>
                    <div className="relative group">
                        <FontAwesomeIcon icon={faLock} className="absolute left-5 top-1/2 -translate-y-1/2 text-purple-500/50 group-focus-within:text-purple-400 transition-colors" />
                        <input 
                            type="password" 
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-[#0a0510]/50 border border-purple-500/20 text-white text-sm rounded-2xl py-4 pl-14 pr-4 focus:outline-none focus:border-purple-500/60 focus:ring-4 focus:ring-purple-500/5 transition-all placeholder-purple-900 shadow-inner"
                            placeholder="••••••••"
                        />
                    </div>
                </div>

                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-purple-700 to-purple-500 hover:from-purple-600 hover:to-purple-400 text-white font-black py-4 rounded-2xl shadow-[0_10px_20px_rgba(107,33,168,0.3)] transform transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 uppercase text-xs tracking-[0.2em] mt-4"
                >
                    {loading ? (
                        <FontAwesomeIcon icon={faCircleNotch} spin className="text-lg" />
                    ) : (
                        <>Entrar al Dojo <FontAwesomeIcon icon={faArrowRight} /></>
                    )}
                </button>
            </form>

            <div className="mt-10 text-center">
                <p className="text-[10px] text-purple-400/40 uppercase tracking-[0.15em]">
                    ¿Aún no eres estudiante? <Link to="/clases" className="text-purple-400 font-black hover:text-purple-200 hover:underline ml-1">Ver Programas</Link>
                </p>
            </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginEstudiantes;