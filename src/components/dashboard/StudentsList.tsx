import { useState, useEffect } from 'react';
import pb from '../../lib/pocketbase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faSearch, faTrash, faEdit, faCheckCircle, faTimesCircle, 
    faStar, faUserPlus, faTimes, faSave, faFileAlt, faDownload, faCamera
} from '@fortawesome/free-solid-svg-icons';

const StudentsList = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState<any | null>(null);
    const [userFiles, setUserFiles] = useState<any[]>([]); // Para el contenido subido
    
    // Estado del formulario
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        passwordConfirm: '',
        xp: 0,
        pago_activo: false
    });

    useEffect(() => { loadUsers(); }, []);

    const loadUsers = async () => {
        try {
            const records = await pb.collection('users').getFullList({ sort: '-created' });
            setUsers(records);
        } catch (e) { console.error("Error loading users:", e); }
    };

    // Cargar contenido subido por el estudiante (Simulado o real si tienes la colección 'entregas')
    const loadUserContent = async (userId: string) => {
        try {
            // Ajusta 'entregas' al nombre real de tu colección de tareas/archivos
            // const records = await pb.collection('entregas').getList(1, 10, { filter: `user = "${userId}"` });
            // setUserFiles(records.items);
            
            // Mock visual por ahora
            setUserFiles([
                { id: 1, titulo: 'Práctica de Escalas.mp3', fecha: '2026-02-20', tipo: 'audio' },
                { id: 2, titulo: 'Tarea Armonía.pdf', fecha: '2026-02-18', tipo: 'pdf' }
            ]);
        } catch (e) {
            console.log("No content found or collection missing");
            setUserFiles([]);
        }
    };

    const openModal = (user: any = null) => {
        setEditingUser(user);
        if (user) {
            setFormData({
                username: user.username,
                email: user.email,
                password: '',
                passwordConfirm: '',
                xp: user.xp || 0,
                pago_activo: user.pago_activo
            });
            loadUserContent(user.id);
        } else {
            setFormData({
                username: '',
                email: '',
                password: '',
                passwordConfirm: '',
                xp: 0,
                pago_activo: false
            });
            setUserFiles([]);
        }
        setShowModal(true);
    };

    const handleSave = async () => {
        try {
            const dataToUpdate: any = {
                username: formData.username,
                email: formData.email,
                xp: formData.xp,
                pago_activo: formData.pago_activo
            };
            
            if (formData.password) {
                dataToUpdate.password = formData.password;
                dataToUpdate.passwordConfirm = formData.password;
            }

            if (editingUser) {
                await pb.collection('users').update(editingUser.id, dataToUpdate);
            } else {
                await pb.collection('users').create({ ...formData, emailVisibility: true });
            }
            setShowModal(false);
            loadUsers();
        } catch (e: any) {
            alert("Error: " + e.message);
        }
    };

    const deleteUser = async (id: string) => {
        if (confirm("ADVERTENCIA: ¿Borrar estudiante y todo su historial?")) {
            await pb.collection('users').delete(id);
            loadUsers();
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-[#26201b] border border-[#443b34] rounded-2xl overflow-hidden shadow-xl animate-in fade-in">
                {/* HEADER LISTA */}
                <div className="p-6 border-b border-[#443b34] flex justify-between items-center bg-[#211c18]">
                    <h3 className="text-lg font-black text-white uppercase tracking-tighter flex items-center gap-3">
                        <span className="bg-orange-600 text-black px-2 rounded text-xs">CRM</span>
                        Directorio Académico
                    </h3>
                    <div className="flex gap-4">
                        <div className="relative">
                            <input type="text" placeholder="Buscar..." className="bg-[#1c1917] border border-[#443b34] text-[#e7e5e4] text-xs p-2.5 pl-9 rounded-lg w-64 focus:border-orange-600 outline-none" />
                            <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-3 text-[#78716c] text-xs" />
                        </div>
                        <button onClick={() => openModal(null)} className="bg-orange-700 hover:bg-orange-600 text-white text-[10px] font-black uppercase px-4 py-2 rounded-lg flex items-center gap-2 transition-all">
                            <FontAwesomeIcon icon={faUserPlus} /> Nuevo
                        </button>
                    </div>
                </div>

                {/* TABLA DE USUARIOS */}
                <table className="w-full text-left border-collapse">
                    <thead className="bg-[#1f1a17] text-[#78716c] text-[10px] uppercase font-black tracking-widest">
                        <tr>
                            <th className="p-4 border-b border-[#443b34]">Estudiante</th>
                            <th className="p-4 border-b border-[#443b34]">Estado</th>
                            <th className="p-4 border-b border-[#443b34]">Nivel</th>
                            <th className="p-4 border-b border-[#443b34] text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#333] text-sm font-medium">
                        {users.map((u) => (
                            <tr key={u.id} className="hover:bg-[#2f2822] transition-colors group cursor-pointer" onClick={() => openModal(u)}>
                                <td className="p-4 flex items-center gap-4">
                                    <div className="w-10 h-10 bg-[#1c1917] rounded-full border border-[#443b34] flex items-center justify-center overflow-hidden relative">
                                        {u.avatar ? <img src={pb.files.getUrl(u, u.avatar)} className="w-full h-full object-cover" /> : <span className="text-orange-600 font-black">{(u.username || 'U').charAt(0).toUpperCase()}</span>}
                                        {u.pago_activo && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#1c1917]"></div>}
                                    </div>
                                    <div>
                                        <p className="text-[#e7e5e4] font-bold group-hover:text-orange-500 transition-colors">{u.username}</p>
                                        <p className="text-[#a8a29e] text-[10px] font-mono">{u.email}</p>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <span className={`text-[9px] font-black px-2 py-1 rounded border ${u.pago_activo ? 'bg-green-900/20 text-green-500 border-green-900/30' : 'bg-red-900/20 text-red-500 border-red-900/30'}`}>
                                        {u.pago_activo ? 'MEMBRESÍA ACTIVA' : 'INACTIVO'}
                                    </span>
                                </td>
                                <td className="p-4 text-orange-500 text-xs font-bold flex items-center gap-2">
                                    <FontAwesomeIcon icon={faStar} /> {u.xp || 0} XP
                                </td>
                                <td className="p-4 text-right">
                                    <button onClick={(e) => { e.stopPropagation(); deleteUser(u.id); }} className="text-[#443b34] hover:text-red-600 p-2 transition-colors">
                                        <FontAwesomeIcon icon={faTrash} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* --- MODAL DE PERFIL --- */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-[#26201b] border border-orange-600/30 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[600px] animate-in zoom-in-95">
                        
                        {/* COLUMNA IZQUIERDA: IDENTIDAD (1/3) */}
                        <div className="w-full md:w-1/3 bg-[#1f1a17] border-r border-[#443b34] p-8 flex flex-col items-center text-center relative">
                            {/* Banner Decorativo */}
                            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-orange-900/20 to-transparent pointer-events-none"></div>
                            
                            <div className="w-32 h-32 bg-[#1c1917] rounded-full border-4 border-[#3a3028] mb-4 flex items-center justify-center overflow-hidden shadow-2xl relative z-10">
                                {editingUser?.avatar ? (
                                    <img src={pb.files.getUrl(editingUser, editingUser.avatar)} className="w-full h-full object-cover" />
                                ) : (
                                    <FontAwesomeIcon icon={faCamera} className="text-4xl text-[#3a3028]" />
                                )}
                            </div>
                            
                            <h2 className="text-xl font-black text-white uppercase tracking-tight break-all">{formData.username || 'Nuevo Usuario'}</h2>
                            <p className="text-[#78716c] text-xs font-mono mt-1 mb-6 break-all">{formData.email}</p>

                            <div className="w-full space-y-4">
                                <div className="bg-[#1c1917] p-4 rounded-xl border border-[#333]">
                                    <label className="text-[9px] font-black text-[#574c43] uppercase block mb-1">Status Membresía</label>
                                    <button 
                                        onClick={() => setFormData({...formData, pago_activo: !formData.pago_activo})}
                                        className={`w-full py-2 rounded-lg text-xs font-black uppercase transition-all flex items-center justify-center gap-2 ${formData.pago_activo ? 'bg-green-600 text-white shadow-lg shadow-green-900/20' : 'bg-red-900/20 text-red-500 border border-red-900/30'}`}
                                    >
                                        <FontAwesomeIcon icon={formData.pago_activo ? faCheckCircle : faTimesCircle} />
                                        {formData.pago_activo ? 'ACTIVO' : 'SUSPENDIDO'}
                                    </button>
                                </div>

                                <div className="bg-[#1c1917] p-4 rounded-xl border border-[#333]">
                                    <label className="text-[9px] font-black text-[#574c43] uppercase block mb-1">Nivel Académico (XP)</label>
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="number" 
                                            className="bg-transparent text-xl font-black text-orange-500 w-full outline-none text-center border-b border-[#333] focus:border-orange-500"
                                            value={formData.xp}
                                            onChange={e => setFormData({...formData, xp: parseInt(e.target.value) || 0})}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* COLUMNA DERECHA: DATOS & CONTENIDO (2/3) */}
                        <div className="flex-1 flex flex-col bg-[#26201b]">
                            {/* Header Modal */}
                            <div className="p-6 border-b border-[#443b34] flex justify-between items-center">
                                <h3 className="font-black text-[#e7e5e4] uppercase tracking-widest text-sm">Gestión de Perfil</h3>
                                <button onClick={() => setShowModal(false)} className="text-[#78716c] hover:text-white transition-colors"><FontAwesomeIcon icon={faTimes} size="lg" /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 space-y-8">
                                {/* Formulario Datos */}
                                <section className="space-y-4">
                                    <h4 className="text-xs font-black text-orange-500 uppercase border-b border-[#333] pb-2">Información Personal</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-bold text-[#78716c] uppercase block mb-2">Nombre de Usuario</label>
                                            <input 
                                                className="w-full bg-[#1c1917] border border-[#443b34] p-3 rounded-lg text-white text-sm focus:border-orange-600 outline-none transition-colors"
                                                value={formData.username}
                                                onChange={e => setFormData({...formData, username: e.target.value})}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-[#78716c] uppercase block mb-2">Email</label>
                                            <input 
                                                className="w-full bg-[#1c1917] border border-[#443b34] p-3 rounded-lg text-white text-sm focus:border-orange-600 outline-none transition-colors"
                                                value={formData.email}
                                                onChange={e => setFormData({...formData, email: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-[#78716c] uppercase block mb-2">
                                            Contraseña {editingUser && <span className="text-orange-500/50 normal-case ml-1">(Opcional para actualizar)</span>}
                                        </label>
                                        <input 
                                            type="password"
                                            className="w-full bg-[#1c1917] border border-[#443b34] p-3 rounded-lg text-white text-sm focus:border-orange-600 outline-none transition-colors"
                                            placeholder="••••••••"
                                            value={formData.password}
                                            onChange={e => setFormData({...formData, password: e.target.value, passwordConfirm: e.target.value})}
                                        />
                                    </div>
                                </section>

                                {/* Sección de Contenido Subido */}
                                <section className="space-y-4">
                                    <div className="flex justify-between items-end border-b border-[#333] pb-2">
                                        <h4 className="text-xs font-black text-orange-500 uppercase">Portafolio & Entregas</h4>
                                        <span className="text-[9px] text-[#78716c]">{userFiles.length} Archivos</span>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 gap-2">
                                        {userFiles.length > 0 ? userFiles.map((file) => (
                                            <div key={file.id} className="bg-[#1c1917] p-3 rounded-lg border border-[#333] flex justify-between items-center group hover:border-orange-500/30 transition-all">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-[#2a2420] rounded flex items-center justify-center text-orange-500">
                                                        <FontAwesomeIcon icon={faFileAlt} />
                                                    </div>
                                                    <div>
                                                        <p className="text-white text-xs font-bold">{file.titulo}</p>
                                                        <p className="text-[9px] text-[#78716c]">{file.fecha}</p>
                                                    </div>
                                                </div>
                                                <button className="text-[#443b34] hover:text-white transition-colors p-2">
                                                    <FontAwesomeIcon icon={faDownload} />
                                                </button>
                                            </div>
                                        )) : (
                                            <div className="text-center py-6 border-2 border-dashed border-[#333] rounded-xl">
                                                <p className="text-[#574c43] text-xs font-bold uppercase">Sin entregas recientes</p>
                                            </div>
                                        )}
                                    </div>
                                </section>
                            </div>

                            {/* Footer Modal */}
                            <div className="p-6 border-t border-[#443b34] bg-[#211c18] flex justify-end gap-4">
                                {editingUser && (
                                    <button 
                                        onClick={() => { if(confirm('¿Borrar?')) deleteUser(editingUser.id); }}
                                        className="px-6 py-3 rounded-xl text-xs font-black text-red-500 hover:bg-red-900/20 transition-colors uppercase tracking-widest"
                                    >
                                        Eliminar Usuario
                                    </button>
                                )}
                                <button 
                                    onClick={handleSave}
                                    className="bg-orange-700 hover:bg-orange-600 text-white px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg transition-all flex items-center gap-2"
                                >
                                    <FontAwesomeIcon icon={faSave} />
                                    Guardar Perfil
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentsList;