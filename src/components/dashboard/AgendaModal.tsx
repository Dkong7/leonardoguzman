import { useState, useEffect } from 'react';
import pb from '../../lib/pocketbase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faCalendarCheck, faUserGraduate, faEnvelope, faInfoCircle } from '@fortawesome/free-solid-svg-icons';

interface ModalProps {
    date: Date;
    onClose: () => void;
    onSave: (data: any) => void;
}

const AgendaModal = ({ date, onClose, onSave }: ModalProps) => {
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        titulo: '',
        hora: '10:00',
        tipo: 'clase',
        estudianteId: '',
        enviarEmail: true,
        notas: ''
    });

    // Cargar lista de estudiantes de PocketBase al abrir
    useEffect(() => {
        const fetchStudents = async () => {
            try {
                const records = await pb.collection('users').getFullList({
                    sort: 'username',
                });
                setStudents(records);
            } catch (error) {
                console.error("Error cargando estudiantes:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStudents();
    }, []);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-[#26201b] border border-orange-600/30 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                
                {/* HEADER */}
                <div className="p-6 bg-[#211c18] border-b border-[#443b34] flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="text-orange-500"><FontAwesomeIcon icon={faCalendarCheck} size="lg" /></div>
                        <h3 className="font-black text-[#e7e5e4] uppercase tracking-tighter italic text-sm">Programar Actividad</h3>
                    </div>
                    <button onClick={onClose} className="text-[#78716c] hover:text-white transition-colors">
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    {/* INFO FECHA */}
                    <div className="bg-[#1c1917] p-4 rounded-2xl border border-[#443b34]">
                        <label className="text-[9px] font-black text-orange-500 uppercase tracking-[0.2em] mb-1 block">Fecha de Actividad</label>
                        <p className="text-white font-bold capitalize">{date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>

                    <div className="space-y-4">
                        {/* TÍTULO */}
                        <input 
                            type="text" 
                            placeholder="TÍTULO DE LA CLASE O EVENTO" 
                            className="w-full bg-[#1c1917] border border-[#443b34] p-4 rounded-xl text-[#e7e5e4] font-bold focus:border-orange-600 outline-none uppercase placeholder:text-[#443b34] text-sm"
                            value={formData.titulo}
                            onChange={(e) => setFormData({...formData, titulo: e.target.value})}
                        />

                        {/* ESTUDIANTE (VINCULADO A POCKETBASE) */}
                        <div className="relative">
                            <select 
                                className="w-full bg-[#1c1917] border border-[#443b34] p-4 rounded-xl text-white font-bold outline-none focus:border-orange-600 appearance-none uppercase text-xs"
                                value={formData.estudianteId}
                                onChange={(e) => setFormData({...formData, estudianteId: e.target.value})}
                            >
                                <option value="">— SELECCIONAR ESTUDIANTE —</option>
                                {students.map(s => (
                                    <option key={s.id} value={s.id}>{s.username || s.email}</option>
                                ))}
                            </select>
                            <FontAwesomeIcon icon={faUserGraduate} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#443b34] pointer-events-none" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* HORA */}
                            <input 
                                type="time" 
                                className="bg-[#1c1917] border border-[#443b34] p-4 rounded-xl text-white font-bold outline-none focus:border-orange-600"
                                value={formData.hora}
                                onChange={(e) => setFormData({...formData, hora: e.target.value})}
                            />
                            {/* TIPO */}
                            <select 
                                className="bg-[#1c1917] border border-[#443b34] p-4 rounded-xl text-white font-bold outline-none focus:border-orange-600 uppercase text-xs"
                                value={formData.tipo}
                                onChange={(e) => setFormData({...formData, tipo: e.target.value as any})}
                            >
                                <option value="clase">Clase</option>
                                <option value="recordatorio">Recordatorio</option>
                                <option value="pago">Pago</option>
                            </select>
                        </div>

                        {/* NOTIFICACIÓN POR EMAIL */}
                        <div className="flex items-center justify-between bg-[#1c1917]/50 p-4 rounded-xl border border-[#443b34]/50">
                            <div className="flex items-center gap-3">
                                <FontAwesomeIcon icon={faEnvelope} className={formData.enviarEmail ? "text-orange-500" : "text-[#443b34]"} />
                                <span className="text-[10px] font-black text-[#a8a29e] uppercase tracking-widest">Notificar al estudiante</span>
                            </div>
                            <input 
                                type="checkbox" 
                                className="w-5 h-5 accent-orange-600 cursor-pointer"
                                checked={formData.enviarEmail}
                                onChange={(e) => setFormData({...formData, enviarEmail: e.target.checked})}
                            />
                        </div>

                        {/* NOTAS */}
                        <textarea 
                            placeholder="NOTAS ADICIONALES PARA EL ESTUDIANTE..."
                            className="w-full bg-[#1c1917] border border-[#443b34] p-4 rounded-xl text-[#e7e5e4] text-xs h-24 focus:border-orange-600 outline-none scrollbar-hide"
                            value={formData.notas}
                            onChange={(e) => setFormData({...formData, notas: e.target.value})}
                        />
                    </div>

                    <button 
                        onClick={() => onSave(formData)}
                        disabled={!formData.titulo}
                        className="w-full bg-orange-700 hover:bg-orange-600 disabled:bg-[#3a3028] disabled:text-[#574c43] text-white font-black py-4 rounded-xl uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        <FontAwesomeIcon icon={faCalendarCheck} />
                        Guardar en Agenda
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AgendaModal;