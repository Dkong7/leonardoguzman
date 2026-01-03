import { useState, useEffect } from 'react';
import pb from '../lib/pocketbase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash, faFaceAngry, faFaceGrinTongueWink, faSkull } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const Login = () => {
  const GHOST_USER = 'admin@nardo.com'; 

  const [secretWord, setSecretWord] = useState('');
  const [showPassword, setShowPassword] = useState(false); // Estado para ver/ocultar
  const [honeyPot, setHoneyPot] = useState(''); 
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [modalMsg, setModalMsg] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handleContextMenu = (e: Event) => e.preventDefault();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
        e.preventDefault();
      }
    };
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const triggerPunishment = (count: number) => {
    if (count === 1) setModalMsg("Esa no es la palabra. Cuidado.");
    if (count === 2) setModalMsg("Me estás haciendo perder el tiempo.");
    if (count === 3) setModalMsg("ÚLTIMA OPORTUNIDAD.");
    if (count >= 4) {
        setModalMsg("Te dije que no jugaras.");
        setTimeout(() => {
            window.location.href = 'https://www.pixar.com';
        }, 2000);
    }
    if (count < 4) setTimeout(() => setModalMsg(''), 3000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (honeyPot) return;

    setLoading(true);
    try {
        await pb.collection('users').authWithPassword(GHOST_USER, secretWord);
        setAttempts(0);
        navigate('/nardonardonardo/dashboard');
    } catch (error: any) {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        triggerPunishment(newAttempts);
        await new Promise(r => setTimeout(r, 1000 * newAttempts));
    } finally {
        setLoading(false);
        setSecretWord(''); 
    }
  };

  const getIcon = () => {
      if (attempts === 0) return <FontAwesomeIcon icon={faEye} className="text-6xl text-orange-600 animate-pulse" />;
      if (attempts === 1) return <FontAwesomeIcon icon={faFaceAngry} className="text-7xl text-red-600 shake-slow" />;
      if (attempts === 2) return <FontAwesomeIcon icon={faFaceGrinTongueWink} className="text-8xl text-purple-600 shake-hard" />;
      return <FontAwesomeIcon icon={faSkull} className="text-9xl text-gray-200 animate-bounce glitch-effect" />;
  };

  return (
    <div className={`min-h-screen flex items-center justify-center font-mono transition-colors duration-1000 ${attempts >= 3 ? 'bg-red-950' : 'bg-[#050505]'}`}>
       
       <AnimatePresence>
         {modalMsg && (
            <motion.div 
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
            >
                <h2 className="text-4xl md:text-6xl font-black text-red-600 uppercase text-center tracking-tighter drop-shadow-[0_0_15px_rgba(255,0,0,1)]">
                    {modalMsg}
                </h2>
            </motion.div>
         )}
       </AnimatePresence>

       <div className="w-full max-w-md p-10 bg-[#0a0a0a] border border-gray-900 rounded-none text-center shadow-[0_0_50px_rgba(255,50,0,0.1)] relative overflow-hidden">
          {attempts >= 2 && <div className="absolute inset-0 bg-[url('https://media.giphy.com/media/oEI9uBYSzLpBK/giphy.gif')] opacity-10 pointer-events-none mix-blend-overlay"></div>}

          <div className="mb-10 relative z-10">
             {getIcon()}
          </div>

          <h1 className="text-xl text-gray-400 mb-8 uppercase tracking-[0.3em] pb-4 relative z-10">
              {attempts < 3 ? "SOLO PERSONAL AUTORIZADO" : "CORRE."}
          </h1>
          
          <form onSubmit={handleLogin} className="space-y-8 text-left relative z-10">
              <input type="text" name="user_trap" value={honeyPot} onChange={e => setHoneyPot(e.target.value)} style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />

              <div>
                 <label className="block text-orange-600 text-[10px] mb-2 uppercase tracking-widest text-center">La Palabra Mágica</label>
                 <div className="relative">
                    <input 
                        type={showPassword ? "text" : "password"} 
                        value={secretWord} 
                        onChange={e => setSecretWord(e.target.value)} 
                        className="w-full bg-black border-b-2 border-gray-800 text-white p-4 text-center text-xl focus:border-orange-600 outline-none rounded-none placeholder-gray-900 transition-colors pr-10"
                        placeholder="***"
                        autoFocus
                    />
                    {/* BOTÓN OJITO */}
                    <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-orange-500 transition-colors focus:outline-none"
                    >
                        <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                    </button>
                 </div>
              </div>
              
              <div className="pt-2">
                 <button type="submit" disabled={loading} className="w-full bg-orange-900/20 hover:bg-orange-600 hover:text-black text-orange-600 font-bold py-4 transition-all duration-300 uppercase tracking-[0.3em] border border-orange-900/50 hover:shadow-[0_0_30px_rgba(255,100,0,0.6)]">
                    {loading ? 'Validando...' : 'Entrar'}
                 </button>
              </div>
          </form>
       </div>
       <style>{`.shake-slow { animation: shake 0.5s infinite; } .shake-hard { animation: shake 0.1s infinite; } @keyframes shake { 0% { transform: translate(1px, 1px) rotate(0deg); } 10% { transform: translate(-1px, -2px) rotate(-1deg); } 20% { transform: translate(-3px, 0px) rotate(1deg); } 30% { transform: translate(3px, 2px) rotate(0deg); } 40% { transform: translate(1px, -1px) rotate(1deg); } 50% { transform: translate(-1px, 2px) rotate(-1deg); } 60% { transform: translate(-3px, 1px) rotate(0deg); } 70% { transform: translate(3px, 1px) rotate(-1deg); } 80% { transform: translate(-1px, -1px) rotate(1deg); } 90% { transform: translate(1px, 2px) rotate(0deg); } 100% { transform: translate(1px, -2px) rotate(-1deg); } }`}</style>
    </div>
  );
};
export default Login;