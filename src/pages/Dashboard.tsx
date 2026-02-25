import { useState, useEffect } from 'react';
import pb from '../lib/pocketbase';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faMusic, faStore, faTicketAlt, faSignOutAlt, faUsers,
    faChartLine, faSearch, faBell, faBoxOpen, faGuitar, faPlus
} from '@fortawesome/free-solid-svg-icons';
// Librería de Gráficas Profesional
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Datos Simulados para la Gráfica (En producción esto vendría de una API de Analíticas)
const analyticsData = [
  { name: 'Lun', visitas: 400, ventas: 240 },
  { name: 'Mar', visitas: 300, ventas: 139 },
  { name: 'Mie', visitas: 200, ventas: 980 },
  { name: 'Jue', visitas: 278, ventas: 390 },
  { name: 'Vie', visitas: 189, ventas: 480 },
  { name: 'Sab', visitas: 239, ventas: 380 },
  { name: 'Dom', visitas: 349, ventas: 430 },
];

type Tab = 'overview' | 'music' | 'store' | 'users';

const Dashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [userList, setUserList] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    if (!pb.authStore.isValid) navigate('/login');
    
    // Carga inicial de datos según Tab
    if (activeTab === 'users') loadUsers();
    if (activeTab === 'store') loadStore();
  }, [activeTab, navigate]);

  const loadUsers = async () => {
      const records = await pb.collection('users').getFullList({ sort: '-created' });
      setUserList(records);
  };

  const loadStore = async () => {
      const records = await pb.collection('tienda').getFullList({ sort: '-created' });
      setProducts(records);
  };

  const handleLogout = () => {
      pb.authStore.clear();
      navigate('/');
  };

  // --- UI COMPONENTS ---
  const SidebarItem = ({ icon, label, id }: { icon: any, label: string, id: Tab }) => (
      <button 
          onClick={() => setActiveTab(id)}
          className={`w-full flex items-center gap-4 p-4 text-sm font-bold transition-all border-l-4
          ${activeTab === id 
              ? 'border-orange-500 bg-[#252525] text-white' 
              : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-[#1f1f1f]'}`}
      >
          <FontAwesomeIcon icon={icon} className={activeTab === id ? 'text-orange-500' : ''} />
          {label}
      </button>
  );

  const StatCard = ({ title, value, change }: { title: string, value: string, change: string }) => (
      <div className="bg-[#1e1e1e] p-6 rounded border border-[#333] shadow-lg">
          <h3 className="text-gray-500 text-xs uppercase tracking-widest font-bold mb-2">{title}</h3>
          <div className="flex justify-between items-end">
              <span className="text-3xl font-bold text-white">{value}</span>
              <span className="text-xs font-bold text-green-500 bg-green-900/20 px-2 py-1 rounded border border-green-900/30">{change}</span>
          </div>
      </div>
  );

  return (
    <div className="min-h-screen bg-[#121212] text-gray-200 font-sans flex overflow-hidden">
       
       {/* SIDEBAR */}
       <aside className="w-64 bg-[#181818] border-r border-[#333] hidden md:flex flex-col z-20">
          <div className="p-8 flex items-center gap-3 border-b border-[#222]">
             <div className="w-8 h-8 bg-orange-600 rounded flex items-center justify-center font-bold text-black shadow-lg shadow-orange-900/20">K</div>
             <div>
                 <h1 className="text-lg font-bold text-white tracking-wide">KONG<span className="text-orange-500">OS</span></h1>
                 <p className="text-[10px] text-gray-600 font-mono tracking-widest">GUITARROSIS ADMIN</p>
             </div>
          </div>

          <nav className="flex-1 mt-6">
             <div className="px-6 mb-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest">Analytics & CRM</div>
             <SidebarItem id="overview" icon={faChartLine} label="Dashboard" />
             <SidebarItem id="users" icon={faUsers} label="Estudiantes" />
             
             <div className="px-6 mb-4 mt-8 text-[10px] font-bold text-gray-600 uppercase tracking-widest">CMS & Content</div>
             <SidebarItem id="store" icon={faStore} label="Tienda & Merch" />
             <SidebarItem id="music" icon={faMusic} label="Discografía" />
          </nav>

          <div className="p-4 border-t border-[#333]">
             <button onClick={handleLogout} className="flex items-center gap-3 text-xs font-bold text-gray-500 hover:text-orange-500 transition-colors w-full p-2">
                <FontAwesomeIcon icon={faSignOutAlt} /> LOGOUT
             </button>
          </div>
       </aside>

       {/* MAIN AREA */}
       <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
          
          {/* TOP BAR */}
          <header className="h-16 bg-[#181818] border-b border-[#333] flex justify-between items-center px-8">
              <h2 className="text-white font-bold uppercase tracking-wider text-sm">{activeTab} VIEW</h2>
              <div className="flex items-center gap-6">
                  <div className="relative cursor-pointer hover:text-white text-gray-500 transition-colors">
                      <FontAwesomeIcon icon={faBell} />
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full border border-[#181818]"></span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-700 to-gray-600 border border-gray-500 flex items-center justify-center text-white font-bold text-xs">
                      LG
                  </div>
              </div>
          </header>

          {/* SCROLLABLE CONTENT */}
          <div className="flex-1 overflow-y-auto p-8">
              
              {/* --- VISTA: OVERVIEW (ANALYTICS) --- */}
              {activeTab === 'overview' && (
                  <div className="space-y-8 animate-in fade-in duration-500">
                      {/* KPI CARDS */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                          <StatCard title="Estudiantes Activos" value="342" change="+12%" />
                          <StatCard title="Ingresos (Mes)" value="$4,200" change="+8.5%" />
                          <StatCard title="Tráfico Web" value="12.5k" change="+24%" />
                          <StatCard title="Conversión Tienda" value="3.2%" change="+1.1%" />
                      </div>

                      {/* CHART GOOGLE ANALYTICS STYLE */}
                      <div className="bg-[#1e1e1e] border border-[#333] rounded p-6 shadow-lg h-[400px]">
                          <div className="flex justify-between items-center mb-6">
                              <h3 className="text-white font-bold flex items-center gap-2">
                                  <FontAwesomeIcon icon={faChartLine} className="text-orange-500" />
                                  Tráfico de Sesiones
                              </h3>
                              <select className="bg-[#252525] text-xs text-white border border-[#444] rounded p-1 outline-none">
                                  <option>Últimos 7 días</option>
                                  <option>Últimos 30 días</option>
                              </select>
                          </div>
                          <ResponsiveContainer width="100%" height="90%">
                              <AreaChart data={analyticsData}>
                                  <defs>
                                      <linearGradient id="colorVisitas" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                                          <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                                      </linearGradient>
                                  </defs>
                                  <XAxis dataKey="name" stroke="#555" tick={{fill: '#888', fontSize: 11}} tickLine={false} axisLine={false} />
                                  <YAxis stroke="#555" tick={{fill: '#888', fontSize: 11}} tickLine={false} axisLine={false} />
                                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                  <Tooltip 
                                      contentStyle={{ backgroundColor: '#181818', border: '1px solid #333', color: '#fff', borderRadius: '4px' }} 
                                      itemStyle={{ color: '#f97316' }}
                                  />
                                  <Area type="monotone" dataKey="visitas" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorVisitas)" />
                              </AreaChart>
                          </ResponsiveContainer>
                      </div>
                  </div>
              )}

              {/* --- VISTA: USUARIOS --- */}
              {activeTab === 'users' && (
                  <div className="bg-[#1e1e1e] border border-[#333] rounded overflow-hidden animate-in fade-in">
                      <div className="p-4 border-b border-[#333] flex justify-between items-center bg-[#252525]">
                          <h3 className="font-bold text-white">Base de Estudiantes</h3>
                          <div className="relative">
                              <input type="text" placeholder="Buscar estudiante..." className="bg-[#111] border border-[#444] text-white text-xs p-2 pl-8 rounded w-64 focus:border-orange-500 outline-none" />
                              <FontAwesomeIcon icon={faSearch} className="absolute left-2.5 top-2.5 text-gray-500 text-xs" />
                          </div>
                      </div>
                      <table className="w-full text-left border-collapse">
                          <thead className="bg-[#181818] text-gray-500 text-[10px] uppercase font-bold tracking-wider">
                              <tr>
                                  <th className="p-4 border-b border-[#333]">Usuario</th>
                                  <th className="p-4 border-b border-[#333]">Email</th>
                                  <th className="p-4 border-b border-[#333]">Nivel</th>
                                  <th className="p-4 border-b border-[#333]">Membresía</th>
                                  <th className="p-4 border-b border-[#333] text-right">Estado</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-[#333] text-sm">
                              {userList.map((user) => (
                                  <tr key={user.id} className="hover:bg-[#252525] transition-colors group">
                                      <td className="p-4 flex items-center gap-3">
                                          <div className="w-8 h-8 bg-[#333] rounded-full flex items-center justify-center text-orange-500 font-bold text-xs group-hover:bg-orange-600 group-hover:text-white transition-colors">
                                              {user.username.substring(0,2).toUpperCase()}
                                          </div>
                                          <span className="text-white font-medium">{user.username}</span>
                                      </td>
                                      <td className="p-4 text-gray-400">{user.email}</td>
                                      <td className="p-4">
                                          <div className="flex items-center gap-2">
                                              <div className="w-full bg-[#333] rounded-full h-1.5 w-16">
                                                  <div className="bg-orange-500 h-1.5 rounded-full" style={{width: '45%'}}></div>
                                              </div>
                                              <span className="text-xs text-gray-500">Lvl 4</span>
                                          </div>
                                      </td>
                                      <td className="p-4"><span className="text-[10px] border border-orange-900/50 text-orange-400 bg-orange-900/10 px-2 py-1 rounded">PRO</span></td>
                                      <td className="p-4 text-right">
                                          <span className="text-[10px] text-green-500 font-bold">● ACTIVO</span>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              )}

              {/* --- VISTA: STORE --- */}
              {activeTab === 'store' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in">
                      {products.map((prod) => (
                          <div key={prod.id} className="bg-[#1e1e1e] border border-[#333] rounded p-4 flex gap-4 hover:border-orange-500/50 transition-colors">
                              <div className="w-20 h-20 bg-[#111] rounded flex items-center justify-center text-gray-600">
                                  {prod.imagen ? <img src={pb.files.getUrl(prod, prod.imagen)} className="w-full h-full object-cover rounded" /> : <FontAwesomeIcon icon={faBoxOpen} size="lg" />}
                              </div>
                              <div className="flex-1">
                                  <h4 className="text-white font-bold truncate">{prod.nombre}</h4>
                                  <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">{prod.tipo}</p>
                                  <p className="text-orange-500 font-bold">${prod.precio_usd} USD</p>
                              </div>
                          </div>
                      ))}
                      <div className="border-2 border-dashed border-[#333] rounded flex flex-col items-center justify-center text-gray-500 hover:border-orange-500 hover:text-orange-500 cursor-pointer transition-all h-32 md:h-auto">
                          <FontAwesomeIcon icon={faPlus} className="text-2xl mb-2" />
                          <span className="text-xs font-bold uppercase">Agregar Producto</span>
                      </div>
                  </div>
              )}

          </div>
       </main>
    </div>
  );
};

export default Dashboard;