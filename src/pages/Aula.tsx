import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import pb from '../lib/pocketbase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faSignOutAlt, faCheckCircle, faFire, faTrophy, faGuitar, 
    faCloudUploadAlt, faCalendarAlt, faStickyNote, faDownload, 
    faCreditCard, faCamera, faVideo, faCommentDots, faArrowRight
} from '@fortawesome/free-solid-svg-icons';

// --- COMPONENTES AUXILIARES (ESTÉTICA LIGHT) ---

// Heatmap de Práctica (Tonos Violetas)
const PracticeHeatmap = () => {
    const days = Array.from({ length: 28 }, (_, i) => ({
        active: Math.random() > 0.3, 
        opacity: Math.random() * 0.6 + 0.2
    }));

    return (
        <div className="bg-white p-6 rounded-3xl border border-purple-50 shadow-lg shadow-purple-100/50">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <FontAwesomeIcon icon={faFire} className="text-purple-500" /> Racha de Práctica
            </h3>
            <div className="grid grid-cols-7 gap-2">
                {days.map((day, i) => (
                    <div 
                        key={i} 
                        className={`w-full aspect-square rounded-lg transition-all ${day.active ? 'bg-purple-600 shadow-md shadow-purple-200' : 'bg-gray-100'}`}
                        style={{ opacity: day.active ? day.opacity : 1 }}
                        title={day.active ? "Práctica completada" : "Sin actividad"}
                    ></div>
                ))}
            </div>
        </div>
    );
};

// Tarjeta de Misión (Estilo Glass/Clean)
const MissionCard = ({ title, xp, done, type }: { title: string, xp: string, done?: boolean, type: 'video' | 'practice' }) => (
    <div className={`p-5 rounded-2xl border flex justify-between items-center transition-all cursor-pointer group hover:shadow-md
        ${done 
            ? 'bg-gray-50 border-gray-100 opacity-60' 
            : 'bg-white border-purple-50 hover:border-purple-200 hover:bg-purple-50/30'
        }`}
    >
        <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors shadow-sm
                ${done ? 'bg-green-100 text-green-600' : 'bg-purple-100 text-purple-600 group-hover:bg-purple-600 group-hover:text-white'}
            `}>
                <FontAwesomeIcon icon={done ? faCheckCircle : (type === 'video' ? faVideo : faGuitar)} />
            </div>
            <div>
                <h4 className={`text-sm font-bold ${done ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{title}</h4>
                {!done && <span className="text-[10px] text-purple-500 font-bold bg-purple-50 px-2 py-0.5 rounded-full mt-1 inline-block">+{xp} XP</span>}
            </div>
        </div>
        {!done && <FontAwesomeIcon icon={faArrowRight} className="text-gray-300 group-hover:text-purple-400 transform group-hover:translate-x-1 transition-all" />}
    </div>
);

// --- COMPONENTE PRINCIPAL AULA ---
const Aula = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'home' | 'homework' | 'notes'>('home');

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

    const handleAvatarUpload = async (e: any) => {
        const file = e.target.files[0];
        if (file && user) {
            try {
                const formData = new FormData();
                formData.append('avatar', file);
                const updatedUser = await pb.collection('users').update(user.id, formData);
                setUser(updatedUser);
            } catch (err) { alert("Error al subir imagen"); }
        }
    };

    if (!user) return (
        <div className="min-h-screen bg-[#fcfbff] flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
            <p className="text-purple-900 font-bold tracking-widest text-xs uppercase">Conectando al Dojo...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#fcfbff] text-gray-700 font-sans flex flex-col md:flex-row overflow-hidden relative">
            
            {/* FONDO ANIMADO SUTIL */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-purple-100/40 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-blue-50/40 rounded-full blur-[120px]"></div>
            </div>

            {/* --- SIDEBAR IZQUIERDO --- */}
            <aside className="w-full md:w-72 bg-white/80 backdrop-blur-xl border-r border-purple-50 flex flex-col z-20 shadow-2xl shadow-purple-100/20">
                <div className="p-8 flex justify-center">
                    <img src="/guitarrosis-logo.svg" alt="Guitarrosis" className="h-10 w-auto" />
                </div>

                <div className="px-6 pb-6 flex flex-col items-center text-center">
                    {/* AVATAR */}
                    <label className="relative group cursor-pointer mb-4">
                        <div className="w-28 h-28 rounded-full bg-white p-1 border-2 border-purple-100 shadow-xl overflow-hidden">
                            <div className="w-full h-full rounded-full overflow-hidden bg-gray-50 flex items-center justify-center relative">
                                {user.avatar ? (
                                    <img src={pb.files.getUrl(user, user.avatar)} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-3xl font-black text-purple-200">{user.username.charAt(0).toUpperCase()}</span>
                                )}
                                {/* Overlay Hover */}
                                <div className="absolute inset-0 bg-purple-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <FontAwesomeIcon icon={faCamera} className="text-white drop-shadow-md" />
                                </div>
                            </div>
                        </div>
                        <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                    </label>
                    
                    <h2 className="font-serif font-bold text-gray-900 text-xl">{user.username}</h2>
                    <p className="text-xs text-purple-500 font-bold uppercase tracking-widest mt-1">Nivel: Shredder</p>

                    {/* STATUS DE PAGO */}
                    <div className={`mt-4 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border flex items-center gap-2 shadow-sm ${
                        user.pago_activo 
                        ? 'bg-green-50 text-green-600 border-green-100' 
                        : 'bg-red-50 text-red-500 border-red-100'
                    }`}>
                        <FontAwesomeIcon icon={faCreditCard} />
                        {user.pago_activo ? 'Activo' : 'Pago Pendiente'}
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-2 mt-2">
                    {[
                        { id: 'home', icon: faGuitar, label: 'Mi Progreso' },
                        { id: 'homework', icon: faCloudUploadAlt, label: 'Entregas & Tareas' },
                        { id: 'notes', icon: faStickyNote, label: 'Bitácora' }
                    ].map((item) => (
                        <button 
                            key={item.id}
                            onClick={() => setActiveTab(item.id as any)} 
                            className={`w-full text-left px-5 py-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-3 relative overflow-hidden
                                ${activeTab === item.id 
                                    ? 'bg-[#1a0b2e] text-white shadow-lg shadow-purple-900/20' 
                                    : 'text-gray-500 hover:bg-purple-50 hover:text-purple-700'
                                }`}
                        >
                            <FontAwesomeIcon icon={item.icon} className={activeTab === item.id ? 'text-purple-300' : 'text-gray-400'} />
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div className="p-6">
                    <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 text-xs font-bold text-gray-400 hover:text-red-500 transition-colors py-2">
                        <FontAwesomeIcon icon={faSignOutAlt} /> Cerrar Sesión
                    </button>
                </div>
            </aside>

            {/* --- CONTENIDO PRINCIPAL --- */}
            <main className="flex-1 p-8 md:p-12 overflow-y-auto relative z-10">
                <header className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-serif text-[#1a0b2e] mb-2">
                            Hola, <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500">{user.username}</span>
                        </h1>
                        <p className="text-gray-500 font-light">"La consistencia vence al talento." Sigue así.</p>
                    </div>
                    
                    {/* CARD XP */}
                    <div className="bg-white px-8 py-4 rounded-2xl border border-purple-50 shadow-xl shadow-purple-100/50 flex items-center gap-6">
                        <div className="text-center">
                            <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-widest">XP Total</span>
                            <span className="block text-2xl font-black text-purple-900">{user.xp || 0}</span>
                        </div>
                        <div className="h-10 w-px bg-gray-100"></div>
                        <div className="text-center">
                            <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-widest">Racha</span>
                            <div className="flex items-center gap-1 justify-center text-orange-500">
                                <FontAwesomeIcon icon={faFire} />
                                <span className="text-2xl font-black">12</span>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* COLUMNA CENTRAL (FEED) */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* MENSAJE DEL SENSEI */}
                        <div className="bg-gradient-to-r from-[#2d1b4e] to-[#1a0b2e] p-8 rounded-[2rem] shadow-2xl shadow-purple-900/10 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 rounded-full blur-[40px]"></div>
                            <FontAwesomeIcon icon={faCommentDots} className="absolute top-6 right-6 text-white/10 text-5xl" />
                            
                            <h3 className="text-purple-300 font-bold uppercase text-xs tracking-[0.2em] mb-3">Mensaje del Sensei</h3>
                            <p className="text-white text-lg font-serif italic leading-relaxed relative z-10">
                                "Esta semana estamos trabajando la articulación en la mano derecha. No corras. Enfócate en que cada nota suene limpia. Espero tu video del ejercicio #4."
                            </p>
                        </div>

                        {/* MISIONES */}
                        <div>
                            <div className="flex justify-between items-end mb-5">
                                <h3 className="text-[#1a0b2e] font-serif font-bold text-2xl">Misiones de Hoy</h3>
                                <span className="text-xs font-bold text-purple-500 bg-purple-50 px-3 py-1 rounded-full">3 Pendientes</span>
                            </div>
                            <div className="space-y-4">
                                <MissionCard title="Ejercicio Spider (15 min)" xp="50" done={true} type="practice" />
                                <MissionCard title="Teoría: Escala Menor Armónica" xp="100" type="video" />
                                <MissionCard title="Subir Video: Improvisación en Am" xp="300" type="video" />
                            </div>
                        </div>

                        {/* ZONA DE UPLOAD (CONDICIONAL) */}
                        {activeTab === 'homework' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4">
                                <h3 className="text-[#1a0b2e] font-serif font-bold text-2xl mb-5">Entregar Tarea</h3>
                                <div className="border-2 border-dashed border-purple-200 bg-white rounded-[2rem] p-12 text-center hover:border-purple-400 hover:bg-purple-50/30 transition-all cursor-pointer group">
                                    <div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:bg-purple-100 transition-all">
                                        <FontAwesomeIcon icon={faCloudUploadAlt} className="text-3xl text-purple-400 group-hover:text-purple-600" />
                                    </div>
                                    <h4 className="text-gray-800 font-bold text-lg">Sube tu evidencia aquí</h4>
                                    <p className="text-sm text-gray-400 mt-2 mb-6">Video (MP4), Audio (MP3) o Tablatura (PDF)</p>
                                    <button className="bg-[#1a0b2e] hover:bg-purple-900 text-white px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg transition-all transform group-hover:-translate-y-1">
                                        Seleccionar Archivo
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* COLUMNA DERECHA (WIDGETS) */}
                    <div className="space-y-8">
                        {/* CALENDARIO / AGENDA */}
                        <div className="bg-white p-6 rounded-3xl border border-purple-50 shadow-lg shadow-purple-100/50">
                            <h3 className="text-gray-400 font-black uppercase text-xs tracking-widest mb-4 flex items-center gap-2">
                                <FontAwesomeIcon icon={faCalendarAlt} className="text-purple-500" /> Próxima Clase
                            </h3>
                            <div className="bg-gradient-to-br from-purple-50 to-white p-5 rounded-2xl border border-purple-100">
                                <div className="flex items-start justify-between mb-2">
                                    <span className="text-xs font-bold text-purple-600 bg-purple-100 px-2 py-1 rounded">ZOOM</span>
                                    <span className="text-2xl font-black text-gray-800">26</span>
                                </div>
                                <p className="text-gray-800 font-bold text-lg leading-tight">Técnica Avanzada: Legato</p>
                                <p className="text-gray-500 text-xs font-medium mt-1 uppercase">Jueves • 7:00 PM</p>
                                <button className="w-full mt-4 bg-white border border-purple-100 text-purple-700 hover:bg-purple-50 text-[10px] py-2.5 rounded-xl font-black uppercase transition-all shadow-sm">
                                    Unirse a la Clase
                                </button>
                            </div>
                        </div>

                        {/* RECURSOS */}
                        <div className="bg-white p-6 rounded-3xl border border-purple-50 shadow-lg shadow-purple-100/50">
                            <h3 className="text-gray-400 font-black uppercase text-xs tracking-widest mb-4 flex items-center gap-2">
                                <FontAwesomeIcon icon={faDownload} className="text-purple-500" /> Baúl de Recursos
                            </h3>
                            <ul className="space-y-2">
                                <li className="flex justify-between items-center p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-red-50 text-red-400 flex items-center justify-center text-xs">PDF</div>
                                        <span className="text-xs font-bold text-gray-600 group-hover:text-purple-700">Escalas Pentatónicas</span>
                                    </div>
                                    <FontAwesomeIcon icon={faDownload} className="text-gray-300 group-hover:text-purple-500" />
                                </li>
                                <li className="flex justify-between items-center p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-400 flex items-center justify-center text-xs">MP3</div>
                                        <span className="text-xs font-bold text-gray-600 group-hover:text-purple-700">Backing Track: Blues Am</span>
                                    </div>
                                    <FontAwesomeIcon icon={faDownload} className="text-gray-300 group-hover:text-purple-500" />
                                </li>
                            </ul>
                        </div>

                        {/* HEATMAP */}
                        <PracticeHeatmap />
                    </div>

                </div>
            </main>
        </div>
    );
};

export default Aula;