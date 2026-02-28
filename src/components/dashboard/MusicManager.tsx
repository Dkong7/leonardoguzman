import { useState, useEffect } from 'react';
import pb from '../../lib/pocketbase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faPlus, faTrash, faPlayCircle, faEdit, faTimes, 
    faSave, faCloudUploadAlt, faCompactDisc, faEye, faEyeSlash, faPauseCircle 
} from '@fortawesome/free-solid-svg-icons';
import { 
    faSpotify, faApple, faYoutube, faSoundcloud 
} from '@fortawesome/free-brands-svg-icons';

const MusicManager = () => {
    const [music, setMusic] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingTrack, setEditingTrack] = useState<any | null>(null);
    
    // Estado del Player
    const [currentTrack, setCurrentTrack] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    // Estado del Formulario
    const [formData, setFormData] = useState({
        titulo: '',
        tipo: 'Single',
        anio: new Date().getFullYear(),
        publico: false,
        links: { spotify: '', apple: '', youtube: '', soundcloud: '', bandcamp: '' },
        cover: null as File | null
    });
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => { loadMusic(); }, []);

    const loadMusic = async () => {
        const records = await pb.collection('musica').getFullList({ sort: '-created' });
        setMusic(records);
    };

    // --- LÓGICA DEL PLAYER ---
    const togglePlay = (trackUrl: string) => {
        const audio = document.getElementById('admin-audio') as HTMLAudioElement;
        if (currentTrack === trackUrl && isPlaying) {
            audio.pause();
            setIsPlaying(false);
        } else {
            setCurrentTrack(trackUrl);
            setIsPlaying(true);
            setTimeout(() => audio.play(), 100);
        }
    };

    // --- LÓGICA DEL MODAL ---
    const openModal = (track: any = null) => {
        setEditingTrack(track);
        if (track) {
            setFormData({
                titulo: track.titulo,
                tipo: track.tipo,
                anio: track.anio,
                publico: track.publico,
                links: track.links || { spotify: '', apple: '', youtube: '', soundcloud: '', bandcamp: '' },
                cover: null
            });
            setPreviewUrl(track.cover ? pb.files.getUrl(track, track.cover) : null);
        } else {
            setFormData({
                titulo: '',
                tipo: 'Single',
                anio: new Date().getFullYear(),
                publico: false,
                links: { spotify: '', apple: '', youtube: '', soundcloud: '', bandcamp: '' },
                cover: null
            });
            setPreviewUrl(null);
        }
        setShowModal(true);
    };

    const handleFileChange = (e: any) => {
        const file = e.target.files[0];
        if (file) {
            setFormData({ ...formData, cover: file });
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSave = async () => {
        try {
            const data = new FormData();
            data.append('titulo', formData.titulo);
            data.append('tipo', formData.tipo);
            data.append('anio', formData.anio.toString());
            data.append('publico', formData.publico.toString());
            data.append('links', JSON.stringify(formData.links));
            
            if (formData.cover) {
                data.append('cover', formData.cover);
            }

            if (editingTrack) {
                await pb.collection('musica').update(editingTrack.id, data);
            } else {
                await pb.collection('musica').create(data);
            }
            setShowModal(false);
            loadMusic();
        } catch (e: any) {
            alert("Error guardando música: " + e.message);
        }
    };

    const deleteTrack = async (id: string) => {
        if (confirm("¿Eliminar este lanzamiento permanentemente?")) {
            await pb.collection('musica').delete(id);
            loadMusic();
        }
    };

    return (
        <div className="space-y-6 pb-24 relative">
            
            {/* HEADER */}
            <div className="flex justify-between items-center border-b border-[#443b34] pb-6">
                <div>
                    <h3 className="text-2xl font-black text-orange-500 uppercase italic tracking-tighter">Discography Manager</h3>
                    <p className="text-[#78716c] text-xs font-mono mt-1">Catálogo de Lanzamientos</p>
                </div>
                <button 
                    onClick={() => openModal(null)}
                    className="bg-orange-700 hover:bg-orange-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-2"
                >
                    <FontAwesomeIcon icon={faPlus} /> Lanzamiento
                </button>
            </div>

            {/* LISTA DE TRACKS */}
            <div className="grid grid-cols-1 gap-3">
                {music.map(m => {
                    const trackFileUrl = m.audio ? pb.files.getUrl(m, m.audio) : null;
                    const isCurrent = currentTrack === trackFileUrl;

                    return (
                        <div key={m.id} className="bg-[#26201b] border border-[#443b34] p-4 rounded-xl flex items-center gap-5 hover:bg-[#2f2822] transition-all group relative overflow-hidden">
                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${m.publico ? 'bg-green-500' : 'bg-[#443b34]'}`}></div>

                            <div className="w-16 h-16 bg-[#1c1917] rounded-lg overflow-hidden shadow-2xl border border-[#443b34] relative group-hover:scale-105 transition-transform">
                                {m.cover ? <img src={pb.files.getUrl(m, m.cover)} className="w-full h-full object-cover" /> : <FontAwesomeIcon icon={faCompactDisc} className="p-4 text-[#3a3028] w-full h-full" />}
                                {trackFileUrl && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={() => togglePlay(trackFileUrl)}>
                                        <FontAwesomeIcon icon={isCurrent && isPlaying ? faPauseCircle : faPlayCircle} className="text-white text-2xl" />
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <h4 className="text-[#e7e5e4] font-black text-lg leading-none mb-1 truncate">{m.titulo}</h4>
                                <div className="flex items-center gap-2 text-[#78716c] text-[10px] font-bold uppercase tracking-widest">
                                    <span>{m.tipo}</span>
                                    <span>•</span>
                                    <span>{m.anio}</span>
                                    {m.publico ? (
                                        <span className="text-green-500 bg-green-900/20 px-1 rounded flex items-center gap-1"><FontAwesomeIcon icon={faEye} /> Público</span>
                                    ) : (
                                        <span className="text-red-500 bg-red-900/20 px-1 rounded flex items-center gap-1"><FontAwesomeIcon icon={faEyeSlash} /> Privado</span>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-3 pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openModal(m)} className="w-8 h-8 rounded bg-[#1c1917] border border-[#443b34] text-[#a8a29e] hover:text-orange-500 hover:border-orange-500 transition-all">
                                    <FontAwesomeIcon icon={faEdit} />
                                </button>
                                <button onClick={() => deleteTrack(m.id)} className="w-8 h-8 rounded bg-[#1c1917] border border-[#443b34] text-[#a8a29e] hover:text-red-500 hover:border-red-500 transition-all">
                                    <FontAwesomeIcon icon={faTrash} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* PLAYER FLOTANTE */}
            <div className={`fixed bottom-0 left-0 md:left-72 right-0 bg-[#1c1917] border-t border-orange-600/30 p-4 transition-transform duration-500 transform ${currentTrack ? 'translate-y-0' : 'translate-y-full'} z-50 shadow-[0_-5px_20px_rgba(0,0,0,0.5)]`}>
                <div className="flex items-center gap-4 max-w-4xl mx-auto">
                    <audio id="admin-audio" src={currentTrack || ''} controls className="w-full h-8 invert opacity-80" onEnded={() => setIsPlaying(false)} />
                    <button onClick={() => setCurrentTrack(null)} className="text-[#78716c] hover:text-white"><FontAwesomeIcon icon={faTimes} /></button>
                </div>
            </div>

            {/* --- MODAL DE EDICIÓN --- */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-[#26201b] border border-orange-600/30 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[600px] animate-in zoom-in-95">
                        
                        <div className="w-full md:w-1/3 bg-[#1f1a17] border-r border-[#443b34] p-6 flex flex-col items-center">
                            <label className="w-48 h-48 bg-[#1c1917] border-2 border-dashed border-[#443b34] rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-orange-500 hover:text-orange-500 transition-all group overflow-hidden relative shadow-xl">
                                {previewUrl ? (
                                    <img src={previewUrl} className="w-full h-full object-cover" />
                                ) : (
                                    <>
                                        <FontAwesomeIcon icon={faCloudUploadAlt} size="2x" className="text-[#3a3028] group-hover:text-orange-500 mb-2" />
                                        <span className="text-[10px] font-black uppercase text-[#574c43] group-hover:text-orange-500">Subir Portada</span>
                                    </>
                                )}
                                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                    <span className="text-white text-xs font-bold">Cambiar</span>
                                </div>
                            </label>

                            <div className="mt-8 w-full bg-[#1c1917] p-4 rounded-xl border border-[#333]">
                                <label className="text-[9px] font-black text-[#574c43] uppercase block mb-2">Visibilidad</label>
                                <button 
                                    onClick={() => setFormData({ ...formData, publico: !formData.publico })}
                                    className={`w-full py-2 rounded-lg text-xs font-black uppercase transition-all flex items-center justify-center gap-2 ${formData.publico ? 'bg-green-600 text-white shadow-lg' : 'bg-[#333] text-gray-500'}`}
                                >
                                    <FontAwesomeIcon icon={formData.publico ? faEye : faEyeSlash} />
                                    {formData.publico ? 'PÚBLICO' : 'OCULTO'}
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col bg-[#26201b]">
                            <div className="p-6 border-b border-[#443b34] flex justify-between items-center">
                                <h3 className="font-black text-[#e7e5e4] uppercase tracking-widest text-sm">Metadatos del Release</h3>
                                <button onClick={() => setShowModal(false)} className="text-[#78716c] hover:text-white"><FontAwesomeIcon icon={faTimes} size="lg" /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-bold text-orange-500 uppercase block mb-1">Título</label>
                                        <input className="w-full bg-[#1c1917] border border-[#443b34] p-3 rounded-lg text-white font-bold outline-none focus:border-orange-600" value={formData.titulo} onChange={e => setFormData({...formData, titulo: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-[#78716c] uppercase block mb-1">Tipo</label>
                                        <select className="w-full bg-[#1c1917] border border-[#443b34] p-3 rounded-lg text-white text-xs font-bold outline-none" value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value})}>
                                            <option>Single</option>
                                            <option>EP</option>
                                            <option>Album</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-[#78716c] uppercase block mb-1">Año</label>
                                        <input type="number" className="w-full bg-[#1c1917] border border-[#443b34] p-3 rounded-lg text-white text-xs font-bold outline-none" value={formData.anio} onChange={e => setFormData({...formData, anio: parseInt(e.target.value)})} />
                                    </div>
                                </div>

                                <div className="space-y-3 pt-4 border-t border-[#333]">
                                    <h4 className="text-xs font-black text-[#a8a29e] uppercase mb-2">Plataformas Digitales (Links)</h4>
                                    
                                    <div className="flex items-center gap-3 bg-[#1c1917] p-2 rounded-lg border border-[#333] focus-within:border-green-500">
                                        <FontAwesomeIcon icon={faSpotify} className="text-green-500 text-xl w-6" />
                                        <input placeholder="Spotify URL..." className="bg-transparent w-full text-xs text-white outline-none" value={formData.links.spotify} onChange={e => setFormData({...formData, links: {...formData.links, spotify: e.target.value}})} />
                                    </div>

                                    <div className="flex items-center gap-3 bg-[#1c1917] p-2 rounded-lg border border-[#333] focus-within:border-red-500">
                                        <FontAwesomeIcon icon={faApple} className="text-white text-xl w-6" />
                                        <input placeholder="Apple Music URL..." className="bg-transparent w-full text-xs text-white outline-none" value={formData.links.apple} onChange={e => setFormData({...formData, links: {...formData.links, apple: e.target.value}})} />
                                    </div>

                                    <div className="flex items-center gap-3 bg-[#1c1917] p-2 rounded-lg border border-[#333] focus-within:border-red-600">
                                        <FontAwesomeIcon icon={faYoutube} className="text-red-600 text-xl w-6" />
                                        <input placeholder="YouTube URL..." className="bg-transparent w-full text-xs text-white outline-none" value={formData.links.youtube} onChange={e => setFormData({...formData, links: {...formData.links, youtube: e.target.value}})} />
                                    </div>

                                    <div className="flex items-center gap-3 bg-[#1c1917] p-2 rounded-lg border border-[#333] focus-within:border-orange-500">
                                        <FontAwesomeIcon icon={faSoundcloud} className="text-orange-500 text-xl w-6" />
                                        <input placeholder="SoundCloud URL..." className="bg-transparent w-full text-xs text-white outline-none" value={formData.links.soundcloud} onChange={e => setFormData({...formData, links: {...formData.links, soundcloud: e.target.value}})} />
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 border-t border-[#443b34] bg-[#211c18] flex justify-end">
                                <button onClick={handleSave} className="bg-orange-700 hover:bg-orange-600 text-white px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg transition-all flex items-center gap-2">
                                    <FontAwesomeIcon icon={faSave} /> Guardar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MusicManager;