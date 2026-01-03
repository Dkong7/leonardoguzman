import { useState, useEffect, useRef } from 'react';
import pb from '../lib/pocketbase';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faMusic, faStore, faTicketAlt, faSignOutAlt, faPlus, faSave, 
    faArrowLeft, faUpload, faCalendarAlt, faMapMarkerAlt, faLink, faDollarSign 
} from '@fortawesome/free-solid-svg-icons';

type Tab = 'music' | 'gigs' | 'store';

const Dashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('store');
  
  // Referencias a inputs de archivos
  const storeImageRef = useRef<HTMLInputElement>(null);
  const musicCoverRef = useRef<HTMLInputElement>(null);
  const musicAudioRef = useRef<HTMLInputElement>(null);
  const gigImageRef = useRef<HTMLInputElement>(null);

  // Estados generales
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // --- STORE STATES (Colección: tienda - Asumiendo campos estándar) ---
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productDesc, setProductDesc] = useState('');
  const [productType, setProductType] = useState('academico');

  // --- MUSIC STATES (Colección: musica) ---
  // Campos según tu imagen: titulo, artista, url_audio, audio (file), cover (file)
  const [musicTitle, setMusicTitle] = useState('');
  const [musicArtist, setMusicArtist] = useState('Leonardo Guzman'); // Default
  const [musicUrl, setMusicUrl] = useState(''); // Para url_audio (Spotify/YT)

  // --- GIGS STATES (Colección: conciertos) ---
  // Campos según tu imagen: lugar, ciudad, fecha, link_tiquetes, precio, tipo, descripcion, imagen (file)
  const [gigPlace, setGigPlace] = useState(''); // lugar
  const [gigCity, setGigCity] = useState('');   // ciudad
  const [gigDate, setGigDate] = useState('');   // fecha
  const [gigLink, setGigLink] = useState('');   // link_tiquetes
  const [gigPrice, setGigPrice] = useState(''); // precio
  const [gigType, setGigType] = useState('live'); // tipo (live, academic)
  const [gigDesc, setGigDesc] = useState('');   // descripcion

  useEffect(() => {
    if (!pb.authStore.isValid) navigate('/nardonardonardo');
  }, [navigate]);

  const handleLogout = () => {
      pb.authStore.clear();
      navigate('/');
  };

  const showStatus = (msg: string, isError = false) => {
      setStatusMsg(isError ? `Error: ${msg}` : msg);
      setTimeout(() => setStatusMsg(''), 5000);
  };

  // --- HANDLER: TIENDA ---
  const handleCreateProduct = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      try {
          const formData = new FormData();
          formData.append('nombre', productName);
          formData.append('precio_usd', productPrice); // Asumiendo que usas este campo para el precio base
          formData.append('descripcion', productDesc);
          formData.append('tipo', productType);
          
          if (storeImageRef.current?.files?.[0]) {
              formData.append('imagen', storeImageRef.current.files[0]);
          }
          await pb.collection('tienda').create(formData);
          showStatus('Producto creado correctamente.');
          setProductName(''); setProductPrice(''); setProductDesc('');
      } catch (err: any) { showStatus(err.message, true); } finally { setIsLoading(false); }
  };

  // --- HANDLER: MÚSICA (Ajustado a tu DB) ---
  const handleCreateTrack = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      try {
          const formData = new FormData();
          formData.append('titulo', musicTitle);
          formData.append('artista', musicArtist);
          formData.append('url_audio', musicUrl); // Link externo si no hay archivo
          
          // Subir Cover
          if (musicCoverRef.current?.files?.[0]) {
              formData.append('cover', musicCoverRef.current.files[0]);
          }
          // Subir Audio (MP3/WAV)
          if (musicAudioRef.current?.files?.[0]) {
              formData.append('audio', musicAudioRef.current.files[0]);
          }

          await pb.collection('musica').create(formData);
          showStatus('Track agregado correctamente.');
          setMusicTitle(''); setMusicUrl('');
      } catch (err: any) { showStatus(err.message, true); } finally { setIsLoading(false); }
  };

  // --- HANDLER: CONCIERTOS (Ajustado a tu DB) ---
  const handleCreateGig = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      try {
          const formData = new FormData();
          formData.append('lugar', gigPlace);
          formData.append('ciudad', gigCity);
          formData.append('fecha', gigDate);
          formData.append('link_tiquetes', gigLink);
          formData.append('precio', gigPrice);
          formData.append('tipo', gigType); // 'live' o 'academic'
          formData.append('descripcion', gigDesc);
          formData.append('activo', 'true');

          if (gigImageRef.current?.files?.[0]) {
              formData.append('imagen', gigImageRef.current.files[0]);
          }

          await pb.collection('conciertos').create(formData);
          showStatus('Concierto agendado correctamente.');
          setGigPlace(''); setGigCity(''); setGigLink(''); setGigDesc('');
      } catch (err: any) { showStatus(err.message, true); } finally { setIsLoading(false); }
  };

  // Estilos reutilizables
  const InputClass = "w-full bg-black border border-gray-700 p-3 rounded text-white focus:border-nardo-500 outline-none transition-colors placeholder-gray-600";
  const LabelClass = "block text-xs uppercase text-gray-500 mb-2 font-bold tracking-wider";
  const ButtonClass = "bg-nardo-600 hover:bg-nardo-500 text-white px-8 py-3 rounded font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-nardo-900/20 disabled:opacity-50";

  return (
    <div className="min-h-screen bg-[#080808] text-gray-200 font-sans flex">
       
       {/* SIDEBAR */}
       <aside className="w-64 border-r border-gray-800 bg-black/50 hidden md:flex flex-col fixed h-full z-20">
          <div className="p-8 border-b border-gray-800">
             <h1 className="text-xl font-bold text-nardo-500 tracking-widest">NARDO<span className="text-white">OS</span></h1>
             <p className="text-xs text-gray-500 mt-2">v2.1.0 - Admin</p>
          </div>
          <nav className="flex-1 p-4 space-y-2">
             <button onClick={() => setActiveTab('store')} className={`w-full text-left p-3 rounded transition-all flex items-center gap-3 ${activeTab === 'store' ? 'bg-nardo-900 text-white border border-nardo-700' : 'text-gray-500 hover:bg-gray-900'}`}>
                <FontAwesomeIcon icon={faStore} /> Tienda
             </button>
             <button onClick={() => setActiveTab('music')} className={`w-full text-left p-3 rounded transition-all flex items-center gap-3 ${activeTab === 'music' ? 'bg-nardo-900 text-white border border-nardo-700' : 'text-gray-500 hover:bg-gray-900'}`}>
                <FontAwesomeIcon icon={faMusic} /> Música
             </button>
             <button onClick={() => setActiveTab('gigs')} className={`w-full text-left p-3 rounded transition-all flex items-center gap-3 ${activeTab === 'gigs' ? 'bg-nardo-900 text-white border border-nardo-700' : 'text-gray-500 hover:bg-gray-900'}`}>
                <FontAwesomeIcon icon={faTicketAlt} /> Conciertos
             </button>
          </nav>
          <div className="p-4 border-t border-gray-800">
             <button onClick={() => navigate('/')} className="w-full text-left p-2 text-xs text-gray-500 hover:text-white flex items-center gap-2 mb-2">
                <FontAwesomeIcon icon={faArrowLeft} /> Volver a Web
             </button>
             <button onClick={handleLogout} className="w-full text-left p-2 text-xs text-red-500 hover:text-red-400 flex items-center gap-2">
                <FontAwesomeIcon icon={faSignOutAlt} /> Cerrar Sesión
             </button>
          </div>
       </aside>

       {/* MAIN CONTENT */}
       <main className="flex-1 p-8 md:ml-64 overflow-y-auto">
          
          <header className="mb-8 flex justify-between items-center md:hidden">
             <h2 className="text-xl font-bold text-nardo-500">NARDO OS</h2>
             <button onClick={handleLogout}><FontAwesomeIcon icon={faSignOutAlt} /></button>
          </header>

          {statusMsg && (
              <div className={`p-4 mb-6 rounded border ${statusMsg.includes('Error') ? 'bg-red-900/30 border-red-800 text-red-200' : 'bg-green-900/30 border-green-800 text-green-200'}`}>
                  {statusMsg}
              </div>
          )}

          {/* --- TAB: TIENDA --- */}
          {activeTab === 'store' && (
             <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-3xl font-serif italic text-white mb-6 border-b border-gray-800 pb-4">Gestión de Tienda</h2>
                <div className="bg-[#111] border border-gray-800 rounded-xl p-8 shadow-2xl">
                   <h3 className="text-lg text-nardo-400 mb-6 flex items-center gap-2"><FontAwesomeIcon icon={faPlus} /> Agregar Producto</h3>
                   <form onSubmit={handleCreateProduct} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div><label className={LabelClass}>Nombre</label><input required type="text" value={productName} onChange={e => setProductName(e.target.value)} className={InputClass} /></div>
                          <div><label className={LabelClass}>Precio Base (COP)</label><input required type="number" value={productPrice} onChange={e => setProductPrice(e.target.value)} className={InputClass} /></div>
                      </div>
                      <div>
                          <label className={LabelClass}>Tipo</label>
                          <select value={productType} onChange={e => setProductType(e.target.value)} className={InputClass}>
                              <option value="academico">Académico</option>
                              <option value="merch">Merch</option>
                          </select>
                      </div>
                      <div><label className={LabelClass}>Descripción</label><textarea required value={productDesc} onChange={e => setProductDesc(e.target.value)} rows={3} className={InputClass}></textarea></div>
                      
                      <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center hover:border-nardo-500 transition-colors">
                          <input type="file" ref={storeImageRef} className="hidden" id="store-upload" />
                          <label htmlFor="store-upload" className="cursor-pointer flex flex-col items-center gap-2"><FontAwesomeIcon icon={faUpload} className="text-2xl text-gray-500" /><span className="text-sm text-gray-400">Imagen del Producto</span></label>
                      </div>

                      <button disabled={isLoading} type="submit" className={ButtonClass}>{isLoading ? 'Guardando...' : 'Guardar Producto'}</button>
                   </form>
                </div>
             </div>
          )}

          {/* --- TAB: MUSICA --- */}
          {activeTab === 'music' && (
              <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <h2 className="text-3xl font-serif italic text-white mb-6 border-b border-gray-800 pb-4">Gestión de Música</h2>
                  <div className="bg-[#111] border border-gray-800 rounded-xl p-8 shadow-2xl">
                      <h3 className="text-lg text-nardo-400 mb-6 flex items-center gap-2"><FontAwesomeIcon icon={faMusic} /> Agregar Track</h3>
                      <form onSubmit={handleCreateTrack} className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div><label className={LabelClass}>Título</label><input required type="text" value={musicTitle} onChange={e => setMusicTitle(e.target.value)} className={InputClass} /></div>
                              <div><label className={LabelClass}>Artista</label><input required type="text" value={musicArtist} onChange={e => setMusicArtist(e.target.value)} className={InputClass} /></div>
                          </div>
                          
                          <div><label className={LabelClass}><FontAwesomeIcon icon={faLink} /> Link Externo (Spotify/YouTube)</label><input type="url" value={musicUrl} onChange={e => setMusicUrl(e.target.value)} className={InputClass} placeholder="https://..." /></div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center hover:border-nardo-500 transition-colors">
                                <input type="file" ref={musicCoverRef} className="hidden" id="cover-upload" />
                                <label htmlFor="cover-upload" className="cursor-pointer flex flex-col items-center gap-2"><FontAwesomeIcon icon={faUpload} className="text-2xl text-gray-500" /><span className="text-sm text-gray-400">Subir Carátula (Cover)</span></label>
                            </div>
                            <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center hover:border-green-500 transition-colors">
                                <input type="file" ref={musicAudioRef} className="hidden" id="audio-upload" accept="audio/*" />
                                <label htmlFor="audio-upload" className="cursor-pointer flex flex-col items-center gap-2"><FontAwesomeIcon icon={faMusic} className="text-2xl text-gray-500" /><span className="text-sm text-gray-400">Subir Archivo de Audio</span></label>
                            </div>
                          </div>

                          <button disabled={isLoading} type="submit" className={ButtonClass}>{isLoading ? 'Subiendo...' : 'Guardar Música'}</button>
                      </form>
                  </div>
              </div>
          )}

          {/* --- TAB: CONCIERTOS --- */}
          {activeTab === 'gigs' && (
              <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <h2 className="text-3xl font-serif italic text-white mb-6 border-b border-gray-800 pb-4">Gestión de Conciertos</h2>
                  <div className="bg-[#111] border border-gray-800 rounded-xl p-8 shadow-2xl">
                      <h3 className="text-lg text-nardo-400 mb-6 flex items-center gap-2"><FontAwesomeIcon icon={faTicketAlt} /> Nueva Fecha</h3>
                      <form onSubmit={handleCreateGig} className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div><label className={LabelClass}><FontAwesomeIcon icon={faCalendarAlt} /> Fecha y Hora</label><input required type="datetime-local" value={gigDate} onChange={e => setGigDate(e.target.value)} className={InputClass} /></div>
                              <div><label className={LabelClass}><FontAwesomeIcon icon={faMapMarkerAlt} /> Ciudad</label><input required type="text" value={gigCity} onChange={e => setGigCity(e.target.value)} className={InputClass} /></div>
                              <div><label className={LabelClass}>Lugar (Venue)</label><input required type="text" value={gigPlace} onChange={e => setGigPlace(e.target.value)} className={InputClass} /></div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div><label className={LabelClass}>Tipo</label>
                                    <select value={gigType} onChange={e => setGigType(e.target.value)} className={InputClass}>
                                        <option value="live">Live Show</option>
                                        <option value="academic">Masterclass / Taller</option>
                                    </select>
                                </div>
                                <div><label className={LabelClass}><FontAwesomeIcon icon={faDollarSign} /> Precio</label><input type="number" value={gigPrice} onChange={e => setGigPrice(e.target.value)} className={InputClass} placeholder="0 si es gratis" /></div>
                                <div><label className={LabelClass}><FontAwesomeIcon icon={faLink} /> Link Tiquetes</label><input type="url" value={gigLink} onChange={e => setGigLink(e.target.value)} className={InputClass} placeholder="https://..." /></div>
                          </div>

                          <div><label className={LabelClass}>Descripción del Evento</label><textarea value={gigDesc} onChange={e => setGigDesc(e.target.value)} rows={2} className={InputClass} placeholder="Detalles extra..."></textarea></div>

                          <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center hover:border-nardo-500 transition-colors">
                              <input type="file" ref={gigImageRef} className="hidden" id="gig-upload" />
                              <label htmlFor="gig-upload" className="cursor-pointer flex flex-col items-center gap-2"><FontAwesomeIcon icon={faUpload} className="text-2xl text-gray-500" /><span className="text-sm text-gray-400">Flyer / Imagen del Evento</span></label>
                          </div>

                          <button disabled={isLoading} type="submit" className={ButtonClass}>{isLoading ? 'Agendando...' : 'Publicar Concierto'}</button>
                      </form>
                  </div>
              </div>
          )}

       </main>
    </div>
  );
};
export default Dashboard;