import { useState } from 'react';
import { supabase } from '../services/supabase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    else navigate('/nardonardonardo/dashboard');
    setLoading(false);
  };

  const handleRegister = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) alert(error.message);
    else alert('Revisa tu email para confirmar!');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center font-mono">
       <div className="w-full max-w-md p-8 bg-[#0a0a0a] border border-gray-900 rounded-lg text-center shadow-[0_0_50px_rgba(255,100,0,0.1)]">
          <div className="mb-8 animate-pulse">
             <FontAwesomeIcon icon={faEye} className="text-6xl text-orange-600" />
          </div>
          <h1 className="text-2xl text-gray-200 mb-8 uppercase tracking-widest border-b border-gray-800 pb-4">¿Quién frutas eres?</h1>
          
          <form onSubmit={handleLogin} className="space-y-6 text-left">
             <div>
                <label className="block text-orange-600 text-xs mb-2 uppercase">Espacio de Usuario</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-black border border-gray-800 text-white p-3 focus:border-orange-600 outline-none rounded-none" />
             </div>
             <div>
                <label className="block text-orange-600 text-xs mb-2 uppercase">¿Cuál es la palabra mágica?</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-black border border-gray-800 text-white p-3 focus:border-orange-600 outline-none rounded-none" />
             </div>
             
             <div className="flex gap-4 pt-4">
                <button type="submit" disabled={loading} className="flex-1 bg-orange-700 text-black font-bold py-3 hover:bg-orange-600 transition-colors uppercase">
                   {loading ? '...' : 'Entrar'}
                </button>
                <button type="button" onClick={handleRegister} className="flex-1 border border-gray-800 text-gray-500 py-3 hover:text-white transition-colors uppercase text-xs">
                   Registrarme
                </button>
             </div>
          </form>
       </div>
    </div>
  );
};
export default Login;