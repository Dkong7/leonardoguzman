import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import pb from '../lib/pocketbase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSignOutAlt, faCheckCircle, faFire, faTrophy, faGuitar, faMedal } from '@fortawesome/free-solid-svg-icons';

// Componente Heatmap (Simulando HabitKit)
const PracticeHeatmap = () => {
    // Generar días dummy
    const days = Array.from({ length: 42 }, (_, i) => ({
        active: Math.random() > 0.4, 
        opacity: Math.random() > 0.4 ? Math.random() * 0.6 + 0.4 : 0.1
    }));

    return (
        <div className="bg-[#1e1e1e] p-6 rounded-2xl border border-[#333]">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-200">Constancia de Práctica</h3>
                <span className="text-xs text-gray-500 uppercase tracking-widest">Últimos 42 días</span>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
                {days.map((day, i) => (
                    <div 
                        key={i} 
                        className={`w-full aspect-square rounded-sm transition-all hover:scale-110 ${day.active ? 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.4)]' : 'bg-[#333]'}`}
                        style={{ opacity: day.active ? day.opacity : 1 }}
                        title={day.active ? 'Práctica completada' : 'Sin actividad'}
                    ></div>
                ))}
            </div>
        </div>
    );
};

const MissionCard = ({ title, xp, done }: { title: string, xp: string, done?: boolean }) => (
    <div className={`p-4 rounded-xl border flex justify-between items-center transition-all cursor-pointer group
        ${done 
            ? 'bg-green-900/10 border-green-800/30 opacity-60' 
            : 'bg-[#1e1e1e] border-[#333] hover:border-orange-500/50 hover:bg-[#252525]'
        }`}
    >
        <div className="flex items-center gap-4">
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors
                ${done ? 'border-green-500 bg-green-500 text-black' : 'border-gray-600 text-transparent group-hover:border-orange-500'}
            `}>
                <FontAwesomeIcon icon={faCheckCircle} className="text-xs" />
            </div>
            <div>
                <h4 className={`text-sm font-bold ${done ? 'text-gray-500 line-through' : 'text-gray-200'}`}>{title}</h4>
                <span className={`text-[10px] font-bold ${done ? 'text-gray-600' : 'text-orange-400'}`}>+{xp} XP</span>
            </div>
        </div>
    </div>
);

const Aula = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (!pb.authStore.isValid) {
        navigate('/login');
    } else {
        setUser(pb.authStore.model);
    }
  }, [navigate]);

  const handleLogout = () => {
      pb.authStore.clear();
      navigate('/');
  };

  if (!user) return <div className="min-h-screen bg-[#121212] flex items-center justify-center text-orange-500">Cargando Dojo...</div>;

  return (
    <div className="min-h-screen bg-[#121212] text-gray-200 font-sans p-6 flex justify-center">
      
      <div className="w-full max-w-lg space-y-8 mt-10">
          
          {/* HEADER PERFIL */}
          <div className="flex justify-between items-center pb-8 border-b border-[#333]">
              <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-600 to-orange-800 flex items-center justify-center text-white font-bold text-2xl shadow-xl shadow-orange-900/30 border-2 border-[#121212]">
                      {user.username ? user.username.substring(0,2).toUpperCase() : 'U'}
                  </div>
                  <div>
                      <h1 className="text-white font-bold text-xl">{user.username}</h1>
                      <div className="flex items-center gap-2 mt-1">
                          <FontAwesomeIcon icon={faMedal} className="text-yellow-500 text-xs" />
                          <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Nivel 4: Shredder</p>
                      </div>
                  </div>
              </div>
              <button onClick={handleLogout} className="text-gray-600 hover:text-white transition-colors bg-[#1e1e1e] p-3 rounded-full hover:bg-red-900/20 hover:text-red-500">
                  <FontAwesomeIcon icon={faSignOutAlt} />
              </button>
          </div>

          {/* STATS ROW */}
          <div className="grid grid-cols-3 gap-4">
              <div className="bg-[#1e1e1e] p-4 rounded-2xl border border-[#333] text-center shadow-lg">
                  <FontAwesomeIcon icon={faFire} className="text-orange-500 mb-2 text-xl" />
                  <div className="text-2xl font-black text-white">12</div>
                  <div className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">Racha</div>
              </div>
              <div className="bg-[#1e1e1e] p-4 rounded-2xl border border-[#333] text-center shadow-lg">
                  <FontAwesomeIcon icon={faTrophy} className="text-yellow-500 mb-2 text-xl" />
                  <div className="text-2xl font-black text-white">450</div>
                  <div className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">XP Total</div>
              </div>
              <div className="bg-[#1e1e1e] p-4 rounded-2xl border border-[#333] text-center shadow-lg">
                  <FontAwesomeIcon icon={faGuitar} className="text-blue-500 mb-2 text-xl" />
                  <div className="text-2xl font-black text-white">85%</div>
                  <div className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">Curso</div>
              </div>
          </div>

          {/* HABIT TRACKER (HEATMAP) */}
          <PracticeHeatmap />

          {/* MISIONES DEL DÍA */}
          <div>
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 ml-1">Misiones de Hoy</h3>
              <div className="space-y-3">
                  <MissionCard title="Calentamiento Cromático (10 min)" xp="50" done={true} />
                  <MissionCard title="Ver Lección: Alternate Picking" xp="100" />
                  <MissionCard title="Subir video de progreso" xp="200" />
              </div>
          </div>

          {/* MENSAJE MAESTRO */}
          <div className="bg-gradient-to-r from-orange-900/20 to-[#1e1e1e] p-6 rounded-2xl border border-orange-500/20 mt-8">
              <h4 className="text-orange-500 font-bold text-sm mb-2">📢 Mensaje del Maestro</h4>
              <p className="text-gray-400 text-xs leading-relaxed">
                  "Recuerda que la velocidad es una consecuencia de la precisión. No corras antes de caminar. ¡Sigue con el buen trabajo en la lección de Legato!"
              </p>
          </div>

      </div>
    </div>
  );
};

export default Aula;