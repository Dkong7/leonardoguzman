import { useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) navigate('/nardonardonardo');
    };
    checkUser();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#111] text-gray-200 p-8 font-mono">
       <header className="flex justify-between items-center mb-12 border-b border-gray-800 pb-4">
          <h1 className="text-2xl text-orange-600 uppercase">Panel de Control: Nardo</h1>
          <button onClick={() => supabase.auth.signOut().then(() => navigate('/'))} className="text-xs text-red-500 hover:text-white">Cerrar Sesión</button>
       </header>
       <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-black p-6 border border-gray-800 rounded">
             <h2 className="text-xl text-nardo-500 mb-4">🎵 Música</h2>
             <button className="w-full py-2 border border-gray-700">Editar Tracks</button>
          </div>
          <div className="bg-black p-6 border border-gray-800 rounded">
             <h2 className="text-xl text-green-500 mb-4">📅 Conciertos</h2>
             <button className="w-full py-2 border border-gray-700">Gestionar Tour</button>
          </div>
          <div className="bg-black p-6 border border-gray-800 rounded">
             <h2 className="text-xl text-yellow-500 mb-4">🛒 Tienda</h2>
             <button className="w-full py-2 border border-gray-700">Editar Productos</button>
          </div>
       </div>
    </div>
  );
};
export default Dashboard;