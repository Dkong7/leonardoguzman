import { useState, useEffect } from 'react';
import pb from '../../lib/pocketbase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faPlus, faTrash, faMapMarkerAlt, faCalendarDay, 
    faTicketAlt, faEdit, faTimes, faSave, faMicrophoneAlt 
} from '@fortawesome/free-solid-svg-icons';

const ConcertsManager = () => {
    const [concerts, setConcerts] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingGig, setEditingGig] = useState<any | null>(null);

    // Estado del Formulario
    const [formData, setFormData] = useState({
        lugar: '',
        ciudad: '',
        fecha: '',
        tipo: 'Concierto', // Default
        ticket_link: '',
        sold_out: false
    });

    useEffect(() => {
        loadConcerts();
    }, []);

    const loadConcerts = async () => {
        try {
            const records = await pb.collection('conciertos').getFullList({ sort: '-fecha' });
            setConcerts(records);
        } catch (e) { console.error("Error loading gigs:", e); }
    };

    // --- LÓGICA DEL MODAL ---
    const openModal = (gig: any = null) => {
        setEditingGig(gig);
        if (gig) {
            // Modo Edición: Formatear fecha para el input datetime-local
            const dateObj = new Date(gig.fecha);
            // Ajuste simple para formato local YYYY-MM-DDTHH:MM
            const dateString = dateObj.toISOString().slice(0, 16); 

            setFormData({
                lugar: gig.lugar,
                ciudad: gig.ciudad,
                fecha: dateString,
                tipo: gig.tipo,
                ticket_link: gig.ticket_link || '',
                sold_out: gig.sold_out || false
            });
        } else {
            // Modo Creación
            setFormData({
                lugar: '',
                ciudad: '',
                fecha: '',
                tipo: 'Concierto',
                ticket_link: '',
                sold_out: false
            });
        }
        setShowModal(true);
    };

    const handleSave = async () => {
        try {
            const dataToSave = {
                ...formData,
                fecha: new Date(formData.fecha).toISOString() // Asegurar formato PB
            };

            if (editingGig) {
                await pb.collection('conciertos').update(editingGig.id, dataToSave);
            } else {
                await pb.collection('conciertos').create(dataToSave);
            }
            setShowModal(false);
            loadConcerts();
        } catch (e: any) {
            alert("Error al guardar concierto: " + e.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("ADVERTENCIA: ¿Eliminar este concierto de la gira?")) {
            await pb.collection('conciertos').delete(id);
            loadConcerts();
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* HEADER */}
            <div className="flex justify-between items-center border-b border-[#443b34] pb-6">
                <div>
                    <h3 className="text-2xl font-black text-orange-500 uppercase italic tracking-tighter">Gigs & Tour Manager</h3>
                    <p className="text-[#78716c] text-xs font-mono mt-1">Gestión de fechas en vivo</p>
                </div>
                <button 
                    onClick={() => openModal(null)}
                    className="bg-orange-700 hover:bg-orange-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg hover:shadow-orange-900/40 flex items-center gap-2"
                >
                    <FontAwesomeIcon icon={faPlus} /> Añadir Fecha
                </button>
            </div>

            {/* GRID DE CONCIERTOS (CARDS) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {concerts.map(gig => (
                    <div 
                        key={gig.id} 
                        onClick={() => openModal(gig)}
                        className="bg-[#26201b] border border-[#443b34] p-6 rounded-2xl relative group cursor-pointer hover:border-orange-600/50 transition-all hover:-translate-y-1 shadow-xl"
                    >
                        {/* Badge Tipo */}
                        <div className="flex justify-between items-start mb-4">
                            <span className={`text-[9px] px-3 py-1 rounded-full font-black uppercase tracking-widest border ${
                                gig.sold_out 
                                ? 'bg-red-900/20 text-red-500 border-red-900/30' 
                                : 'bg-orange-900/20 text-orange-500 border-orange-900/30'
                            }`}>
                                {gig.sold_out ? 'SOLD OUT' : gig.tipo}
                            </span>
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleDelete(gig.id); }} 
                                className="text-[#443b34] hover:text-red-500 transition-colors p-2"
                            >
                                <FontAwesomeIcon icon={faTrash} />
                            </button>
                        </div>

                        {/* Info Principal */}
                        <h4 className="text-xl font-black text-white leading-tight mb-2 uppercase">{gig.lugar}</h4>
                        
                        <div className="space-y-2 mt-4 border-t border-[#333] pt-4">
                            <p className="text-xs text-[#a8a29e] flex items-center gap-3">
                                <FontAwesomeIcon icon={faMapMarkerAlt} className="text-orange-600 w-4" /> 
                                <span className="font-bold">{gig.ciudad}</span>
                            </p>
                            <p className="text-xs text-[#a8a29e] flex items-center gap-3">
                                <FontAwesomeIcon icon={faCalendarDay} className="text-orange-600 w-4" /> 
                                {new Date(gig.fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                            <p className="text-xs text-[#a8a29e] flex items-center gap-3">
                                <FontAwesomeIcon icon={faTicketAlt} className="text-orange-600 w-4" /> 
                                {gig.ticket_link ? <span className="text-green-500 font-bold">Venta Activa</span> : <span className="opacity-50">Sin Link</span>}
                            </p>
                        </div>

                        {/* Hover Overlay Hint */}
                        <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[1px]">
                            <span className="bg-orange-600 text-white px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                <FontAwesomeIcon icon={faEdit} /> Editar Evento
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* --- MODAL DE GESTIÓN --- */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-[#26201b] border border-orange-600/30 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95">
                        
                        {/* Header Modal */}
                        <div className="p-6 bg-[#211c18] border-b border-[#443b34] flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="text-orange-500"><FontAwesomeIcon icon={faMicrophoneAlt} size="lg" /></div>
                                <h3 className="font-black text-[#e7e5e4] uppercase tracking-tighter text-sm">
                                    {editingGig ? 'Editar Evento' : 'Nueva Fecha'}
                                </h3>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-[#78716c] hover:text-white transition-colors">
                                <FontAwesomeIcon icon={faTimes} />
                            </button>
                        </div>

                        <div className="p-8 space-y-5">
                            {/* Inputs */}
                            <div>
                                <label className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-2 block">Lugar / Venue</label>
                                <input 
                                    className="w-full bg-[#1c1917] border border-[#443b34] p-4 rounded-xl text-[#e7e5e4] font-bold focus:border-orange-600 outline-none uppercase placeholder:text-[#443b34]"
                                    placeholder="TEATRO MAYOR..."
                                    value={formData.lugar}
                                    onChange={e => setFormData({...formData, lugar: e.target.value})}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-[#78716c] uppercase block mb-2">Ciudad</label>
                                    <input 
                                        className="w-full bg-[#1c1917] border border-[#443b34] p-3 rounded-xl text-white text-sm focus:border-orange-600 outline-none"
                                        value={formData.ciudad}
                                        onChange={e => setFormData({...formData, ciudad: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-[#78716c] uppercase block mb-2">Tipo</label>
                                    <select 
                                        className="w-full bg-[#1c1917] border border-[#443b34] p-3 rounded-xl text-white text-sm focus:border-orange-600 outline-none uppercase"
                                        value={formData.tipo}
                                        onChange={e => setFormData({...formData, tipo: e.target.value})}
                                    >
                                        <option value="Concierto">Concierto</option>
                                        <option value="Festival">Festival</option>
                                        <option value="Masterclass">Masterclass</option>
                                        <option value="Privado">Privado</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-[#78716c] uppercase block mb-2">Fecha y Hora</label>
                                    <input 
                                        type="datetime-local"
                                        className="w-full bg-[#1c1917] border border-[#443b34] p-3 rounded-xl text-white text-sm focus:border-orange-600 outline-none"
                                        value={formData.fecha}
                                        onChange={e => setFormData({...formData, fecha: e.target.value})}
                                    />
                                </div>
                                <div className="flex items-end">
                                    <button 
                                        onClick={() => setFormData({...formData, sold_out: !formData.sold_out})}
                                        className={`w-full py-3 rounded-xl text-xs font-black uppercase transition-all border ${
                                            formData.sold_out 
                                            ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-900/20' 
                                            : 'bg-[#1c1917] text-[#78716c] border-[#443b34] hover:border-white'
                                        }`}
                                    >
                                        {formData.sold_out ? '🔴 SOLD OUT' : '🟢 Entradas Disponibles'}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-[#78716c] uppercase block mb-2">Link de Entradas (URL)</label>
                                <div className="relative">
                                    <input 
                                        className="w-full bg-[#1c1917] border border-[#443b34] p-3 pl-10 rounded-xl text-orange-500 text-sm focus:border-orange-600 outline-none font-mono"
                                        placeholder="https://..."
                                        value={formData.ticket_link}
                                        onChange={e => setFormData({...formData, ticket_link: e.target.value})}
                                    />
                                    <FontAwesomeIcon icon={faTicketAlt} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#443b34]" />
                                </div>
                            </div>

                            <button 
                                onClick={handleSave}
                                className="w-full bg-orange-700 hover:bg-orange-600 text-white font-black py-4 rounded-xl uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 mt-4"
                            >
                                <FontAwesomeIcon icon={faSave} />
                                Guardar Información
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConcertsManager;