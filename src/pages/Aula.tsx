import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import pb from '../lib/pocketbase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faSignOutAlt, faCheckCircle, faGuitar, 
    faCloudUploadAlt, faCalendarAlt, faDownload, 
    faCreditCard, faCamera, faVideo, faCommentDots, faArrowRight
} from '@fortawesome/free-solid-svg-icons';

const MissionCard = ({ title, done, type, onClick }: any) => (
    <div onClick={onClick} className={`p-5 rounded-2xl border transition-all cursor-pointer group flex justify-between items-center
        ${done ? 'bg-gray-50 border-gray-100' : 'bg-white border-purple-50 hover:border-purple-200 hover:shadow-lg shadow-purple-100/30'}
    `}>
        <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg
                ${done ? 'bg-green-100 text-green-500' : 'bg-purple-100 text-purple-600 group-hover:scale-110 transition-transform'}
            `}>
                {done ? <FontAwesomeIcon icon={faCheckCircle} /> : <FontAwesomeIcon icon={type === 'taller' ? faVideo : faGuitar} />}
            </div>
            <div>
                <h4 className={`font-bold ${done ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{title}</h4>
            </div>
        </div>
        {!done && <FontAwesomeIcon icon={faArrowRight} className="text-gray-300 group-hover:text-purple-400 transform group-hover:translate-x-1 transition-all" />}
    </div>
);

const Aula = () => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            setSelectedFile(event.target.files[0]);
        }
    };
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'home' | 'courses' | 'homework' | 'qa'>('home');
    
    const [settings, setSettings] = useState<any>({});
    const [materials, setMaterials] = useState<any[]>([]);

    useEffect(() => {
        if (!pb.authStore.isValid) {
            navigate('/login');
            return;
        }
        
        setUser(pb.authStore.model);
        
        const fetchData = async () => {
            try {
                const sett = await pb.collection('dojo_settings').getFirstListItem('');
                setSettings(sett);
            } catch (e) {
                setSettings({
                    mensaje: "Bienvenido al Dojo. Elige una misión para empezar.",
                    clase_titulo: "Próximamente",
                    clase_fecha: "Por definir"
                });
            }
            
            try {
                const accesos = await pb.collection('compras_accesos').getFullList({
                    filter: `estudiante_id="${pb.authStore.model?.id}"`,
                    expand: 'material_id'
                });
                const userMaterials = accesos.map(a => a.expand?.material_id).filter(Boolean);
                setMaterials(userMaterials);
            } catch (e) {
                console.error(e);
            }
        };
        fetchData();
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
                const updatedUser = await pb.collection('estudiantes').update(user.id, formData);
                setUser(updatedUser);
            } catch (err) { alert("Error al subir imagen"); }
        }
    };

    if (!user) return <div className="min-h-screen bg-[#faf8ff] flex items-center justify-center"><div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div></div>;

    const avatarUrl = user.avatar 
        ? `${import.meta.env.VITE_POCKETBASE_URL || window.location.origin}/api/files/estudiantes/${user.id}/${user.avatar}`
        : null;

    return (
        <div className="min-h-screen relative z-10 bg-[#faf8ff] font-sans flex text-[#1a0b2e]">
            
            <aside className="w-72 bg-white border-r border-purple-100 flex flex-col relative z-20 shadow-[0_0_30px_rgba(168,85,247,0.05)]">
                <div className="p-8 pb-4 flex flex-col items-center">
                    <img src="/eim-favicon.png" alt="Logo" className="w-12 mb-8 opacity-20" />
                    
                    <div className="relative group cursor-pointer mb-4">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-purple-100 to-pink-50 p-1 shadow-lg">
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-white rounded-full flex items-center justify-center text-3xl font-black text-purple-200">
                                    {user.username.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                        <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <FontAwesomeIcon icon={faCamera} className="text-white" />
                        </div>
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleAvatarUpload} accept="image/*" />
                    </div>

                    <h2 className="text-xl font-black text-[#1a0b2e]">{user.username}</h2>
                    <p className="text-[10px] font-bold text-purple-500 uppercase tracking-widest mt-1">NIVEL: SHREDDER</p>
                    
                    <div className={`mt-4 text-[10px] font-black uppercase px-4 py-2 rounded-full flex items-center gap-2
                        ${user.pago_activo ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
                    }`}>
                        <FontAwesomeIcon icon={faCreditCard} />
                        {user.pago_activo ? 'Activo' : 'Pago Pendiente'}
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-2 mt-2">
                    {[
                        { id: 'home', icon: faGuitar, label: 'Mi Progreso' },
                        { id: 'courses', icon: faVideo, label: 'Clases & Talleres' },
                        { id: 'homework', icon: faCloudUploadAlt, label: 'Entregas & Tareas' },
                        { id: 'qa', icon: faCommentDots, label: 'Consultas y Preguntas' }
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
                    <button
                        onClick={() => navigate('/guitarTracker')}
                        className="w-full text-left px-5 py-3.5 rounded-xl text-xs font-black transition-all flex items-center gap-3 bg-gradient-to-r from-cyan-500/15 to-purple-500/15 border border-cyan-500/30 text-purple-900 hover:border-cyan-500 hover:shadow-md mt-3"
                    >
                        <FontAwesomeIcon icon={faCamera} className="text-cyan-600" />
                        <span>GuitarTracker AR + VST</span>
                    </button>
                </nav>

                <div className="p-6">
                    <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 text-xs font-bold text-gray-400 hover:text-red-500 transition-colors py-2">
                        <FontAwesomeIcon icon={faSignOutAlt} /> Cerrar Sesión
                    </button>
                </div>
            </aside>

            <main className="flex-1 p-8 md:p-12 overflow-y-auto relative z-10">
                <header className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-serif text-[#1a0b2e] mb-2">
                            Hola, <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500">{user.username}</span>
                        </h1>
                        <p className="text-gray-400 text-sm">"La consistencia vence al talento." Sigue así.</p>
                    </div>
                </header>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    
                    <div className="xl:col-span-2 space-y-8">
                        
                        <div className="bg-[#1a0b2e] rounded-3xl p-8 relative overflow-hidden text-white shadow-xl shadow-purple-900/20">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600 blur-[80px] rounded-full opacity-20 -mr-20 -mt-20"></div>
                            
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-purple-300 mb-4">Mensaje del Sensei</h3>
                            <div className="flex gap-6 items-start">
                                <p className="text-xl font-serif leading-relaxed italic flex-1">
                                    "{settings?.mensaje}"
                                </p>
                                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                                    <FontAwesomeIcon icon={faCommentDots} className="text-purple-300" />
                                </div>
                            </div>
                        </div>

                        {activeTab === 'home' && (
                            <>
                                <div className="flex justify-between items-end mb-5">
                                    <h3 className="text-[#1a0b2e] font-serif font-bold text-2xl">Mi Progreso / Misiones</h3>
                                    <span className="text-xs font-bold text-purple-500 bg-purple-50 px-3 py-1 rounded-full">{materials.length} Pendientes</span>
                                </div>
                                <div className="space-y-4">
                                    {materials.length === 0 ? (
                                        <div className="text-center py-10 bg-white rounded-2xl border border-gray-100 text-gray-400">
                                            No tienes misiones asignadas actualmente.
                                        </div>
                                    ) : (
                                        materials.map(m => (
                                            <MissionCard key={m.id} title={m.titulo} done={false} type={m.tipo} onClick={() => setActiveTab('courses')} />
                                        ))
                                    )}
                                </div>
                            </>
                        )}

                        {activeTab === 'homework' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4">
                                <h3 className="text-[#1a0b2e] font-serif font-bold text-2xl mb-5">Entregar Tarea</h3>
                                <div className="border-2 border-dashed border-purple-200 bg-white rounded-[2rem] p-12 text-center hover:border-purple-400 hover:bg-purple-50/30 transition-all cursor-pointer group">
                                    <div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:bg-purple-100 transition-all">
                                        <FontAwesomeIcon icon={faCloudUploadAlt} className="text-3xl text-purple-400 group-hover:text-purple-600" />
                                    </div>
                                    <h4 className="text-gray-800 font-bold text-lg">Sube tu evidencia aquí</h4>
                                    <p className="text-sm text-gray-400 mt-2 mb-6">Video (MP4), Audio (MP3) o Tablatura (PDF)</p>
                                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept="video/mp4,audio/mp3,application/pdf" /><button onClick={() => fileInputRef.current?.click()} className="bg-[#1a0b2e] hover:bg-purple-900 text-white px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg transition-all transform group-hover:-translate-y-1">{selectedFile ? selectedFile.name : "Seleccionar Archivo"}</button>
                                </div>
                            </div>
                        )}
                        
                        {activeTab === 'courses' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4">
                                <h3 className="text-[#1a0b2e] font-serif font-bold text-2xl mb-5">Clases & Talleres</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {materials.length === 0 ? (
                                        <div className="col-span-2 text-center py-10 bg-white rounded-2xl border border-gray-100 text-gray-400">
                                            Aún no tienes materiales desbloqueados.
                                        </div>
                                    ) : (
                                        materials.map(m => (
                                            <div key={m.id} className="bg-white border border-purple-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer">
                                                <div className="w-full h-32 bg-purple-100 rounded-xl mb-4 flex items-center justify-center text-purple-300">
                                                    <FontAwesomeIcon icon={m.tipo === 'taller' ? faVideo : faGuitar} className="text-4xl" />
                                                </div>
                                                <span className={`text-[10px] font-bold uppercase tracking-widest mb-1 block ${m.tipo === 'taller' ? 'text-purple-500' : 'text-green-500'}`}>
                                                    {m.tipo}
                                                </span>
                                                <h4 className="font-bold text-gray-800 text-lg mb-2">{m.titulo}</h4>
                                                <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
                                                    <div className={`h-1.5 rounded-full ${m.tipo === 'taller' ? 'bg-purple-500' : 'bg-green-500'}`} style={{ width: "0%" }}></div>
                                                </div>
                                                <span className="text-xs text-gray-400 font-medium">0% Completado</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                        
                        {activeTab === 'qa' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4">
                                <h3 className="text-[#1a0b2e] font-serif font-bold text-2xl mb-5">Consultas y Preguntas</h3>
                                <div className="bg-white rounded-3xl p-6 shadow-sm border border-purple-50 h-[400px] flex flex-col">
                                    <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4">
                                        <div className="text-center text-gray-400 text-sm mt-10">Historial de consultas (Próximamente funcional)</div>
                                    </div>
                                    <div className="flex gap-2">
                                        <input type="text" placeholder="Escribe tu consulta aquí..." className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all" />
                                        <button className="bg-[#1a0b2e] text-white px-6 rounded-xl hover:bg-purple-900 transition-colors">
                                            Enviar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-8">
                        <div className="bg-white p-6 rounded-3xl border border-purple-50 shadow-lg shadow-purple-100/50">
                            <h3 className="text-gray-400 font-black uppercase text-xs tracking-widest mb-4 flex items-center gap-2">
                                <FontAwesomeIcon icon={faCalendarAlt} className="text-purple-500" /> Próxima Clase
                            </h3>
                            <div className="bg-gradient-to-br from-purple-50 to-white p-5 rounded-2xl border border-purple-100">
                                <div className="flex items-start justify-between mb-2">
                                    <span className="text-xs font-bold text-purple-600 bg-purple-100 px-2 py-1 rounded">ZOOM</span>
                                </div>
                                <p className="text-gray-800 font-bold text-lg leading-tight">{settings?.clase_titulo}</p>
                                <p className="text-gray-500 text-xs font-medium mt-1 uppercase">{settings?.clase_fecha}</p>
                                <button className="w-full mt-4 bg-white border border-purple-100 text-purple-700 hover:bg-purple-50 text-[10px] py-2.5 rounded-xl font-black uppercase transition-all shadow-sm">
                                    Unirse a la Clase
                                </button>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-3xl border border-purple-50 shadow-lg shadow-purple-100/50">
                            <h3 className="text-gray-400 font-black uppercase text-xs tracking-widest mb-4 flex items-center gap-2">
                                <FontAwesomeIcon icon={faDownload} className="text-purple-500" /> Baúl de Recursos
                            </h3>
                            <ul className="space-y-2">
                                <li className="flex justify-between items-center p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-400 flex items-center justify-center text-xs">PDF</div>
                                        <span className="text-xs font-bold text-gray-400 group-hover:text-purple-700">No hay archivos aún</span>
                                    </div>
                                </li>
                            </ul>
                        </div>

                    </div>

                </div>
            </main>
        </div>
    );
};

export default Aula;
