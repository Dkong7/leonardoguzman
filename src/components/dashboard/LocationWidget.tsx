import { useState, useEffect } from 'react';
import pb from '../../lib/pocketbase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMapMarkerAlt, faGlobeAmericas, faCity } from '@fortawesome/free-solid-svg-icons';

const LocationWidget = () => {
    const [locations, setLocations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const processLocations = async () => {
            try {
                // Traemos todos los usuarios (optimizado: solo campos necesarios)
                const users = await pb.collection('users').getFullList({ fields: 'ciudad,pais' });
                
                // Algoritmo de conteo
                const count: any = {};
                users.forEach((u: any) => {
                    const loc = u.ciudad ? `${u.ciudad}, ${u.pais || ''}` : 'Desconocido';
                    count[loc] = (count[loc] || 0) + 1;
                });

                // Convertir a array ordenado
                const sorted = Object.entries(count)
                    .map(([name, val]: any) => ({ name, value: val }))
                    .sort((a: any, b: any) => b.value - a.value)
                    .slice(0, 5); // Top 5 ciudades

                setLocations(sorted);
            } catch (e) {
                console.error("Error geo:", e);
            } finally {
                setLoading(false);
            }
        };

        processLocations();
    }, []);

    const maxVal = locations[0]?.value || 1;

    return (
        <div className="bg-[#26201b] border border-[#443b34] rounded-2xl overflow-hidden shadow-xl relative h-full min-h-[300px]">
            {/* FONDO DE MAPA DECORATIVO (SVG) */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
                <svg viewBox="0 0 100 50" className="w-full h-full fill-[#a8a29e]">
                    <path d="M20,10 Q30,5 40,10 T60,20 T80,10 T90,20" stroke="none" />
                    {/* Silueta abstracta de mapa */}
                    <circle cx="25" cy="15" r="8" />
                    <circle cx="75" cy="25" r="10" />
                    <rect x="40" y="30" width="20" height="10" />
                </svg>
            </div>

            <div className="p-6 relative z-10">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-[#e7e5e4] font-black uppercase tracking-widest text-xs flex items-center gap-2">
                        <FontAwesomeIcon icon={faGlobeAmericas} className="text-orange-600" /> 
                        Top Ubicaciones
                    </h3>
                    <span className="text-[9px] bg-orange-900/30 text-orange-500 px-2 py-1 rounded border border-orange-500/20 font-bold">
                        LIVE DATA
                    </span>
                </div>

                <div className="space-y-4">
                    {loading ? (
                        <p className="text-[#78716c] text-xs italic">Triangulando ubicaciones...</p>
                    ) : locations.length === 0 ? (
                        <p className="text-[#78716c] text-xs">No hay datos de ubicación disponibles.</p>
                    ) : (
                        locations.map((loc, i) => (
                            <div key={i} className="group">
                                <div className="flex justify-between text-xs font-bold text-[#a8a29e] mb-1 group-hover:text-white transition-colors">
                                    <span className="flex items-center gap-2">
                                        <FontAwesomeIcon icon={i === 0 ? faMapMarkerAlt : faCity} className={i === 0 ? "text-orange-500" : "text-[#443b34]"} />
                                        {loc.name}
                                    </span>
                                    <span>{loc.value} Students</span>
                                </div>
                                {/* BARRA DE PROGRESO */}
                                <div className="w-full h-2 bg-[#1c1917] rounded-full overflow-hidden border border-[#333]">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-1000 ${i === 0 ? 'bg-orange-600' : 'bg-[#574c43]'}`} 
                                        style={{ width: `${(loc.value / maxVal) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default LocationWidget;