import { useState, useEffect } from 'react';
import pb from '../../lib/pocketbase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBook, faSave, faUpload, faQuoteLeft } from '@fortawesome/free-solid-svg-icons';

export default function DojoManager() {
    const [subTab, setSubTab] = useState<'material' | 'settings' | 'recursos'>('settings');

    const [materiales, setMateriales] = useState<any[]>([]);
    const [estudiantes, setEstudiantes] = useState<any[]>([]);
    
    // Material states
    const [newTitulo, setNewTitulo] = useState('');
    const [newTipo, setNewTipo] = useState('taller');
    
    // Settings states
    const [settings, setSettings] = useState<any>({ mensaje: '', clase_titulo: '', clase_fecha: '' });
    const [settingsId, setSettingsId] = useState('');
    
    // Recursos states
    const [recTitulo, setRecTitulo] = useState('');
    const [recTipo, setRecTipo] = useState('PDF');
    const [recEstudiante, setRecEstudiante] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const mats = await pb.collection('dojo_material').getFullList();
            setMateriales(mats);
            const ests = await pb.collection('estudiantes').getFullList();
            setEstudiantes(ests);
            
            try {
                const sett = await pb.collection('dojo_settings').getFirstListItem('');
                setSettings(sett);
                setSettingsId(sett.id);
            } catch (e) { }
            
        } catch (e) {
            console.error(e);
        }
    };

    const handleCrearMaterial = async () => {
        if (!newTitulo) return;
        try {
            await pb.collection('dojo_material').create({
                titulo: newTitulo,
                tipo: newTipo
            });
            setNewTitulo('');
            loadData();
        } catch (e) { alert("Error al crear"); }
    };
    
    const handleSaveSettings = async () => {
        try {
            if (settingsId) {
                await pb.collection('dojo_settings').update(settingsId, settings);
            } else {
                const created = await pb.collection('dojo_settings').create(settings);
                setSettingsId(created.id);
            }
            alert("Ajustes guardados!");
        } catch(e) { alert("Error guardando ajustes"); }
    };
    
    const handleCrearRecurso = async () => {
        // Dummy function for now until collection works perfectly
        alert("Recurso creado (Próximamente disponible 100%)");
    };

    return (
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-purple-50">
            <h3 className="text-2xl font-black text-[#1a0b2e] mb-6 flex items-center gap-3">
                <FontAwesomeIcon icon={faBook} className="text-purple-500" /> Dojo Manager
            </h3>

            <div className="flex gap-4 mb-8">
                <button onClick={() => setSubTab('settings')} className={`px-4 py-2 rounded-xl text-xs font-bold ${subTab === 'settings' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-500'}`}>Ajustes Globales</button>
                <button onClick={() => setSubTab('material')} className={`px-4 py-2 rounded-xl text-xs font-bold ${subTab === 'material' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-500'}`}>Material General</button>
                <button onClick={() => setSubTab('recursos')} className={`px-4 py-2 rounded-xl text-xs font-bold ${subTab === 'recursos' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-500'}`}>Baúl Estudiantes</button>
            </div>

            {subTab === 'settings' && (
                <div className="space-y-6 max-w-2xl">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest"><FontAwesomeIcon icon={faQuoteLeft} /> Mensaje del Sensei</label>
                        <textarea 
                            value={settings.mensaje} 
                            onChange={e => setSettings({...settings, mensaje: e.target.value})}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm focus:border-purple-500 outline-none"
                            rows={3}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">Próxima Clase (Título)</label>
                            <input 
                                value={settings.clase_titulo} 
                                onChange={e => setSettings({...settings, clase_titulo: e.target.value})}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">Fecha/Hora</label>
                            <input 
                                value={settings.clase_fecha} 
                                onChange={e => setSettings({...settings, clase_fecha: e.target.value})}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm outline-none"
                            />
                        </div>
                    </div>
                    <button onClick={handleSaveSettings} className="bg-green-500 text-white px-6 py-3 rounded-xl text-xs font-bold shadow-md hover:bg-green-600">
                        <FontAwesomeIcon icon={faSave} className="mr-2"/> Guardar Ajustes Globales
                    </button>
                </div>
            )}

            {subTab === 'material' && (
                <div>
                    <div className="flex gap-4 mb-6">
                        <input type="text" placeholder="Título del Material..." className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm" value={newTitulo} onChange={e => setNewTitulo(e.target.value)} />
                        <select className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm" value={newTipo} onChange={e => setNewTipo(e.target.value)}>
                            <option value="taller">Video / Taller</option>
                            <option value="libro">Libro / PDF</option>
                        </select>
                        <button onClick={handleCrearMaterial} className="bg-[#1a0b2e] text-white px-6 rounded-xl hover:bg-purple-900 transition-colors text-xs font-bold">
                            + Crear Material
                        </button>
                    </div>

                    <div className="space-y-4">
                        {materiales.map(m => (
                            <div key={m.id} className="p-4 rounded-xl border border-gray-100 flex justify-between items-center">
                                <div>
                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded ${m.tipo === 'taller' ? 'bg-purple-100 text-purple-600' : 'bg-green-100 text-green-600'}`}>{m.tipo}</span>
                                    <h4 className="font-bold text-gray-800 mt-2">{m.titulo}</h4>
                                </div>
                                <div className="text-xs text-gray-400">ID: {m.id}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {subTab === 'recursos' && (
                <div className="max-w-3xl">
                    <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100 mb-8">
                        <h4 className="font-bold text-purple-900 mb-4 flex items-center gap-2"><FontAwesomeIcon icon={faUpload}/> Subir Recurso a Estudiante</h4>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <select value={recEstudiante} onChange={e=>setRecEstudiante(e.target.value)} className="bg-white border border-purple-200 rounded-xl p-3 text-sm">
                                <option value="">Seleccionar Estudiante...</option>
                                {estudiantes.map(e => <option key={e.id} value={e.id}>{e.username}</option>)}
                            </select>
                            <select value={recTipo} onChange={e=>setRecTipo(e.target.value)} className="bg-white border border-purple-200 rounded-xl p-3 text-sm">
                                <option value="PDF">PDF</option>
                                <option value="MP3">MP3</option>
                                <option value="ZIP">ZIP</option>
                            </select>
                        </div>
                        <input value={recTitulo} onChange={e=>setRecTitulo(e.target.value)} type="text" placeholder="Título del archivo" className="w-full bg-white border border-purple-200 rounded-xl p-3 text-sm mb-4"/>
                        <button onClick={handleCrearRecurso} className="bg-purple-600 text-white w-full py-3 rounded-xl font-bold text-xs shadow-md">Subir Archivo</button>
                    </div>
                    <p className="text-sm text-gray-400 text-center">La lista de recursos individuales se mostrará aquí.</p>
                </div>
            )}
        </div>
    );
}
