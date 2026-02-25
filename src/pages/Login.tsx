import { useState } from 'react';
import pb from '../lib/pocketbase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash, faUserAstronaut } from '@fortawesome/free-solid-svg-icons'; // Importación corregida
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const navigate = useNavigate();
  
  // Estados del Formulario
  const [email, setEmail] = useState('admin@nardo.com'); 
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    console.log("Intentando login con:", email); 

    try {
        // Autenticación directa a colección 'users'
        const authData = await pb.collection('users').authWithPassword(email, password);
        console.log("Login Exitoso:", authData);

        if (pb.authStore.isValid) {
            navigate('/nardonardonardo/dashboard');
        }
    } catch (err: any) {
        console.error("Error de PocketBase:", err);
        setErrorMsg('Credenciales inválidas o error de conexión.');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] font-mono">
       
       <div className="w-full max-w-md p-8 border border-gray-800 bg-[#0a0a0a] shadow-2xl relative">
          
          {/* Header */}
          <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-orange-900/10 rounded-full mb-4 border border-orange-500/20 text-orange-600">
                  <FontAwesomeIcon icon={faUserAstronaut} className="text-4xl" />
              </div>
              <h1 className="text-2xl text-white font-bold tracking-widest uppercase">ACCESO MAESTRO</h1>
              <p className="text-xs text-gray-500 mt-2">GUITARROSIS ACADEMY ADMIN</p>
          </div>

          {/* Mensaje de Error */}
          {errorMsg && (
              <div className="mb-6 p-3 bg-red-900/20 border border-red-800 text-red-400 text-xs text-center font-bold uppercase tracking-wider">
                  {errorMsg}
              </div>
          )}
          
          <form onSubmit={handleLogin} className="space-y-6">
              
              {/* Email Input */}
              <div>
                  <label className="block text-gray-500 text-[10px] uppercase tracking-widest mb-2 font-bold">Identificación</label>
                  <input 
                    type="email" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    className="w-full bg-[#121212] border border-gray-700 text-white p-3 focus:border-orange-500 outline-none transition-colors text-sm"
                    placeholder="admin@nardo.com"
                  />
              </div>

              {/* Password Input */}
              <div>
                  <label className="block text-gray-500 text-[10px] uppercase tracking-widest mb-2 font-bold">Clave de Acceso</label>
                  <div className="relative">
                      <input 
                        type={showPassword ? "text" : "password"} 
                        value={password} 
                        onChange={e => setPassword(e.target.value)} 
                        className="w-full bg-[#121212] border border-gray-700 text-white p-3 pr-10 focus:border-orange-500 outline-none transition-colors text-sm"
                        placeholder="••••••••"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                      >
                         <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                      </button>
                  </div>
              </div>
              
              {/* Botón */}
              <button 
                type="submit" 
                disabled={loading} 
                className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-4 transition-all uppercase tracking-[0.2em] text-sm mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                  {loading ? 'VERIFICANDO...' : 'INICIAR SESIÓN'}
              </button>
          </form>

          <div className="mt-8 text-center">
              <span className="text-[10px] text-gray-700 uppercase">Sistema KongOS v2.4</span>
          </div>
       </div>
    </div>
  );
};

export default Login;