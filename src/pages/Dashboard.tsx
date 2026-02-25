import { useState, useEffect } from 'react';
import pb from '../lib/pocketbase';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faMusic, faStore, faSignOutAlt, faUsers, faChartPie, 
    faCalendarAlt, faMicrophoneAlt, faPlus
} from '@fortawesome/free-solid-svg-icons';
import { faGoogle } from '@fortawesome/free-brands-svg-icons';

// Importación de Módulos
import Overview from '../components/dashboard/Overview';
import StudentsList from '../components/dashboard/StudentsList';
import MusicManager from '../components/dashboard/MusicManager';
import StoreManager from '../components/dashboard/StoreManager';
import ConcertsManager from '../components/dashboard/ConcertsManager';
import AgendaModal from '../components/dashboard/AgendaModal';

type Tab = 'overview' | 'music' | 'store' | 'users' | 'concerts';

const Dashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showAgendaModal, setShowAgendaModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    if (!pb.authStore.isValid) navigate('/nardonardonardo');
  }, [navigate]);

  const handleLogout = () => {
    pb.authStore.clear();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#1c1917] text-[#e7e5e4] font-sans flex overflow-hidden">
      
      {/* SIDEBAR TIERRA */}
      <aside className="w-72 bg-[#26201b] border-r border-[#443b34] hidden md:flex flex-col z-20 shadow-2xl">
        <div className="p-8 border-b border-[#443b34] bg-[#211c18] flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-700 rounded-lg flex items-center justify-center font-bold shadow-lg text-white">D</div>
          <div>
            <h1 className="text-lg font-black tracking-wide">KONG<span className="text-orange-600">OS</span></h1>
            <p className="text-[9px] text-[#78716c] font-mono tracking-widest uppercase">Admin System v4.0</p>
          </div>
        </div>

        <nav className="flex-1 mt-8 space-y-1">
          <SidebarButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={faChartPie} label="Visión General" />
          <SidebarButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={faUsers} label="Estudiantes / CRM" />
          <SidebarButton active={activeTab === 'concerts'} onClick={() => setActiveTab('concerts')} icon={faMicrophoneAlt} label="Tour / Conciertos" />
          <SidebarButton active={activeTab === 'music'} onClick={() => setActiveTab('music')} icon={faMusic} label="Discografía" />
          <SidebarButton active={activeTab === 'store'} onClick={() => setActiveTab('store')} icon={faStore} label="Tiendas (Mix)" />
        </nav>

        {/* BOTÓN GOOGLE CALENDAR DISCRETO */}
        <div className="p-6">
            <button className="w-full bg-[#1a1a1a] hover:bg-[#222] border border-[#443b34] text-[#a8a29e] hover:text-white text-[10px] font-black py-3 rounded-xl flex items-center justify-center gap-3 transition-all shadow-lg uppercase tracking-widest">
                <FontAwesomeIcon icon={faGoogle} className="text-orange-500" />
                Sincronizar Google
            </button>
        </div>

        <div className="p-4 border-t border-[#443b34] bg-[#1f1a17]">
          <button onClick={handleLogout} className="flex items-center gap-3 text-xs font-bold text-[#78716c] hover:text-red-400 transition-colors w-full p-3 rounded hover:bg-red-900/10">
            <FontAwesomeIcon icon={faSignOutAlt} /> CERRAR SESIÓN
          </button>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-[#26201b] border-b border-[#443b34] flex justify-between items-center px-8 shadow-md">
          <h2 className="font-black uppercase tracking-tighter text-orange-500">{activeTab} Manager</h2>
          <div className="flex items-center gap-4">
             <button 
                onClick={() => setShowAgendaModal(true)}
                className="bg-orange-600 hover:bg-orange-500 text-black text-[10px] font-black px-4 py-2 rounded-lg flex items-center gap-2 transition-all"
             >
                <FontAwesomeIcon icon={faPlus} /> AGENDAR
             </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 bg-[#1c1917]">
            {activeTab === 'overview' && <Overview />}
            {activeTab === 'users' && <StudentsList />}
            {activeTab === 'music' && <MusicManager />}
            {activeTab === 'store' && <StoreManager />}
            {activeTab === 'concerts' && <ConcertsManager />}
        </div>
      </main>

      {/* MODAL DE AGENDA */}
      {showAgendaModal && (
          <AgendaModal 
            date={selectedDate} 
            onClose={() => setShowAgendaModal(false)} 
            onSave={(data) => { console.log(data); setShowAgendaModal(false); }} 
          />
      )}
    </div>
  );
};

const SidebarButton = ({ active, onClick, icon, label }: any) => (
    <button onClick={onClick} className={`w-full flex items-center gap-4 p-4 text-sm font-bold border-l-4 transition-all ${active ? 'border-orange-600 bg-[#3a3028] text-white' : 'border-transparent text-[#a8a29e] hover:bg-[#2c2520]'}`}>
        <FontAwesomeIcon icon={icon} className={active ? 'text-orange-500' : ''} />
        {label}
    </button>
);

export default Dashboard;