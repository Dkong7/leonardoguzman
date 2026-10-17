import { useState, useEffect } from 'react';
import pb from '../lib/pocketbase';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faMusic, faStore, faSignOutAlt, faUsers, faChartPie, 
    faMicrophoneAlt, faReceipt, faCommentDots
} from '@fortawesome/free-solid-svg-icons';
import { faGoogle } from '@fortawesome/free-brands-svg-icons';
import { faBook } from '@fortawesome/free-solid-svg-icons';

// ImportaciÃ³n de MÃ³dulos
import Overview from '../components/dashboard/Overview';
import StudentsList from '../components/dashboard/StudentsList';
import MusicManager from '../components/dashboard/MusicManager';
import StoreManager from '../components/dashboard/StoreManager';
import ConcertsManager from '../components/dashboard/ConcertsManager';
import OrdersManager from '../components/dashboard/OrdersManager';
import DojoManager from '../components/dashboard/DojoManager';
import QuestionsManager from '../components/dashboard/QuestionsManager';

type Tab = 'overview' | 'orders' | 'music' | 'store' | 'users' | 'concerts' | 'dojo' | 'questions';

const Dashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  useEffect(() => {
    if (!pb.authStore.isValid) navigate('/nardonardonardo');
  }, [navigate]);

  const handleLogout = () => {
    pb.authStore.clear();
    navigate('/');
  };

  return (
    <div className="min-h-screen relative z-10 bg-[#fdfbf7] text-[#4a4059] font-sans flex">
      
      <aside className="w-72 bg-white border-r border-purple-100 hidden md:flex flex-col z-20 shadow-[0_0_30px_rgba(168,85,247,0.05)]">
        <div className="p-8 border-b border-purple-50 bg-[#faf8ff] flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center font-bold shadow-lg shadow-orange-500/20 text-white">D</div>
          <div>
            <h1 className="text-lg font-black tracking-wide text-purple-950">KONG<span className="text-orange-500">OS</span></h1>
            <p className="text-[9px] text-purple-400 font-mono tracking-widest uppercase">Admin System v4.0</p>
          </div>
        </div>

        <nav className="flex-1 mt-8 space-y-2 px-4">
          <SidebarButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={faChartPie} label="Visión General" />
          <SidebarButton active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} icon={faReceipt} label="Ventas y Pedidos" />
          <SidebarButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={faUsers} label="Estudiantes / CRM" />
          <SidebarButton active={activeTab === 'dojo'} onClick={() => setActiveTab('dojo')} icon={faBook} label="Dojo: Materiales" />
          <SidebarButton active={activeTab === 'questions'} onClick={() => setActiveTab('questions')} icon={faCommentDots} label="Consultas Estudiantes" />
          <SidebarButton active={activeTab === 'concerts'} onClick={() => setActiveTab('concerts')} icon={faMicrophoneAlt} label="Tour / Conciertos" />
          <SidebarButton active={activeTab === 'music'} onClick={() => setActiveTab('music')} icon={faMusic} label="Discografía" />
          <SidebarButton active={activeTab === 'store'} onClick={() => setActiveTab('store')} icon={faStore} label="Tiendas (Mix)" />
        </nav>

        <div className="p-6 space-y-2">
            <button onClick={() => navigate('/nardonardonardo/guitarTracker')} className="w-full bg-purple-900 hover:bg-purple-800 border border-purple-700 text-cyan-300 text-[10px] font-black py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md uppercase tracking-widest">
                🎸 GuitarTracker AR + VST
            </button>
            <button className="w-full bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 text-[10px] font-black py-3 rounded-xl flex items-center justify-center gap-3 transition-all shadow-sm uppercase tracking-widest">
                <FontAwesomeIcon icon={faGoogle} className="text-orange-500" />
                Sincronizar Google
            </button>
        </div>

        <div className="p-4 border-t border-purple-100 bg-[#faf8ff]">
          <button onClick={handleLogout} className="flex items-center gap-3 text-xs font-bold text-purple-400 hover:text-red-500 transition-colors w-full p-3 rounded hover:bg-red-50">
            <FontAwesomeIcon icon={faSignOutAlt} /> CERRAR SESIÓN
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-16 bg-white border-b border-purple-100 flex justify-between items-center px-8 shadow-sm">
          <h2 className="font-black uppercase tracking-widest text-purple-800">{activeTab} Manager</h2>
        </header>

        <div className="flex-1 overflow-y-auto p-8 bg-[#fdfbf7]">
            {activeTab === 'overview' && <Overview />}
            {activeTab === 'orders' && <OrdersManager />}
            {activeTab === 'users' && <StudentsList />}
            {activeTab === 'dojo' && <DojoManager />}
            {activeTab === 'questions' && <QuestionsManager />}
            {activeTab === 'music' && <MusicManager />}
            {activeTab === 'store' && <StoreManager />}
            {activeTab === 'concerts' && <ConcertsManager />}
        </div>
      </main>
    </div>
  );
};

const SidebarButton = ({ active, onClick, icon, label }: any) => (
    <button onClick={onClick} className={`w-full flex items-center gap-4 p-4 rounded-xl text-sm font-bold transition-all ${active ? 'bg-purple-100 text-purple-900 shadow-sm' : 'border-transparent text-purple-400 hover:bg-purple-50 hover:text-purple-700'}`}>
        <FontAwesomeIcon icon={icon} className={active ? 'text-orange-500' : ''} />
        {label}
    </button>
);

export default Dashboard;
