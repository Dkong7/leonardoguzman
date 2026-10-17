import { useState } from 'react';
import pb from '../lib/pocketbase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash, faUserAstronaut } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@nardo.com'); 
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
        await pb.collection('users').authWithPassword(email, password);
        if (pb.authStore.isValid) navigate('/nardonardonardo/dashboard');
    } catch (err: any) {
        setErrorMsg('Credenciales inválidas o error de conexión.');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center font-mono relative z-50">
       <div className="absolute top-0 left-0 w-[200vw] h-[200vh] bg-[#fdfbf7] z-[-1]" style={{ transform: 'translate(-50vw, -50vh)' }}></div>
       
       <div className="w-full max-w-md p-8 border border-purple-100 bg-white rounded-3xl shadow-[0_10px_40px_rgba(168,85,247,0.1)] relative">
          
          <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-orange-50 rounded-2xl mb-4 border border-orange-100 text-orange-500 shadow-sm">
                  <FontAwesomeIcon icon={faUserAstronaut} className="text-4xl" />
              </div>
              <h1 className="text-2xl text-purple-950 font-bold tracking-widest uppercase">ACCESO MAESTRO</h1>
              <p className="text-xs text-purple-400 mt-2">EIM ADMIN</p>
          </div>

          {errorMsg && (
              <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-500 rounded-xl text-xs text-center font-bold uppercase tracking-wider">
                  {errorMsg}
              </div>
          )}
          
          <form onSubmit={handleLogin} className="space-y-6">
              
              <div>
                  <label className="block text-purple-800 text-[10px] uppercase tracking-widest mb-2 font-bold">Identificación</label>
                  <input 
                    type="email" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    className="w-full bg-[#faf8ff] border border-purple-100 rounded-xl text-purple-900 p-3 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all text-sm"
                    placeholder="admin@nardo.com"
                  />
              </div>

              <div>
                  <label className="block text-purple-800 text-[10px] uppercase tracking-widest mb-2 font-bold">Clave de Acceso</label>
                  <div className="relative">
                      <input 
                        type={showPassword ? "text" : "password"} 
                        value={password} 
                        onChange={e => setPassword(e.target.value)} 
                        className="w-full bg-[#faf8ff] border border-purple-100 rounded-xl text-purple-900 p-3 pr-10 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all text-sm"
                        placeholder="••••••••"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-purple-300 hover:text-purple-600 transition-colors"
                      >
                         <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                      </button>
                  </div>
              </div>
              
              <button 
                type="submit" 
                disabled={loading} 
                className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-black py-4 transition-all uppercase tracking-[0.2em] text-sm mt-4 shadow-md shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                  {loading ? 'VERIFICANDO...' : 'INICIAR SESIÓN'}
              </button>
          </form>

          <div className="mt-8 text-center">
              <span className="text-[10px] text-purple-300 uppercase font-bold tracking-widest">Sistema KongOS v2.4</span>
          </div>
       </div>
    </div>
  );
};
export default Login;
