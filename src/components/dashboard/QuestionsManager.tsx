import { useState, useEffect } from 'react';
import pb from '../../lib/pocketbase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCommentDots, faCheck, faTrash } from '@fortawesome/free-solid-svg-icons';

export default function QuestionsManager() {
    const [preguntas, setPreguntas] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadPreguntas = async () => {
        try {
            const records = await pb.collection('consultas_dudas').getFullList({
                sort: '-created',
                expand: 'estudiante_id'
            });
            setPreguntas(records);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPreguntas();
    }, []);

    const handleResponder = async (id: string) => {
        const respuesta = prompt("Escribe tu respuesta Sensei:");
        if (!respuesta) return;
        try {
            await pb.collection('consultas_dudas').update(id, {
                respuesta: respuesta,
                resuelta: true
            });
            loadPreguntas();
        } catch (e) {
            alert("Error al guardar respuesta");
        }
    };

    const handleEliminar = async (id: string) => {
        if (!confirm("¿Eliminar esta consulta?")) return;
        try {
            await pb.collection('consultas_dudas').delete(id);
            loadPreguntas();
        } catch (e) {
            alert("Error al eliminar");
        }
    };

    if (loading) return <div>Cargando consultas...</div>;

    return (
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-purple-50">
            <h3 className="text-2xl font-black text-[#1a0b2e] mb-6 flex items-center gap-3">
                <FontAwesomeIcon icon={faCommentDots} className="text-purple-500" /> Consultas de Estudiantes
            </h3>

            <div className="space-y-4">
                {preguntas.map(p => (
                    <div key={p.id} className={`p-5 rounded-2xl border ${p.resuelta ? 'bg-gray-50 border-gray-100' : 'bg-purple-50 border-purple-200'}`}>
                        <div className="flex justify-between items-start mb-2">
                            <span className="font-bold text-gray-800">{p.expand?.estudiante_id?.username || 'Estudiante Desconocido'}</span>
                            <span className="text-xs text-gray-400">{new Date(p.created).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm text-gray-700 mb-4">{p.mensaje}</p>
                        
                        {p.resuelta ? (
                            <div className="bg-white p-4 rounded-xl border border-gray-100 mt-2">
                                <span className="text-[10px] font-black text-purple-400 uppercase block mb-1">Tu Respuesta</span>
                                <p className="text-sm text-gray-600">{p.respuesta}</p>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <button onClick={() => handleResponder(p.id)} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-purple-700">
                                    <FontAwesomeIcon icon={faCheck} className="mr-2" /> Responder
                                </button>
                                <button onClick={() => handleEliminar(p.id)} className="bg-red-50 text-red-500 px-4 py-2 rounded-lg text-xs font-bold hover:bg-red-100">
                                    <FontAwesomeIcon icon={faTrash} />
                                </button>
                            </div>
                        )}
                    </div>
                ))}
                {preguntas.length === 0 && <p className="text-gray-400 text-center py-8">No hay consultas pendientes.</p>}
            </div>
        </div>
    );
}
