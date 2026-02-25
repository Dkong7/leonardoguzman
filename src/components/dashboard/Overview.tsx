import { useState, useEffect } from 'react';
import pb from '../../lib/pocketbase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faCrosshairs, faUsers, faExternalLinkAlt, 
    faSignal, faWallet, faMapMarkerAlt, 
    faChevronLeft, faChevronRight, faCalendarAlt
} from '@fortawesome/free-solid-svg-icons';
import { faGoogle } from '@fortawesome/free-brands-svg-icons';

// Importamos el Widget de Ubicación
import LocationWidget from './LocationWidget';

const Overview = () => {
    const [stats, setStats] = useState({
        totalStudents: 0,
        paidStudents: 0,
        estimatedRevenue: 0,
        lastLocation: 'Detectando...'
    });
    const [loading, setLoading] = useState(true);

    // Estado para el Mini Calendario Custom
    const [calendarDate, setCalendarDate] = useState(new Date());

    // Tasa de cambio aproximada para COP
    const TRM = 4000; 

    // URL de Looker Studio con /embed/
    const LOOKER_URL = "https://lookerstudio.google.com/embed/reporting/8a85ba57-274c-4898-8282-4be74ec54848/page/SvJqF";

    useEffect(() => {
        fetchRealStats();
    }, []);

    const fetchRealStats = async () => {
        try {
            // Obtenemos estudiantes y productos para cálculos reales
            const [users, products] = await Promise.all([
                pb.collection('users').getFullList(),
                pb.collection('tienda').getFullList()
            ]);

            const paidCount = users.filter((u: any) => u.pago_activo === true).length;
            
            // Simulación de ingresos basada en productos
            const revenueUSD = paidCount * 25; 

            setStats({
                totalStudents: users.length,
                paidStudents: paidCount,
                estimatedRevenue: revenueUSD,
                lastLocation: 'Bogotá, CO' 
            });
        } catch (error) {
            console.error("Error cargando estadísticas:", error);
        } finally {
            setLoading(false);
        }
    };

    const formatCOP = (usd: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            maximumFractionDigits: 0
        }).format(usd * TRM);
    };

    // --- LÓGICA DEL MINI CALENDARIO ---
    const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = (date: Date) => {
        let day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
        return day === 0 ? 6 : day - 1; // Lunes = 0
    };
    const changeMonth = (offset: number) => {
        setCalendarDate(new Date(calendarDate.setMonth(calendarDate.getMonth() + offset)));
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            
            {/* --- SECCIÓN 1: KPIs & PIXEL --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* TARJETA PIXEL */}
                <div className="bg-[#2a2420] p-6 rounded-2xl border border-orange-900/30 shadow-xl relative overflow-hidden group">
                    <div className="absolute -top-2 -right-2 p-4 text-orange-600/5 group-hover:text-orange-600/10 transition-all">
                        <FontAwesomeIcon icon={faCrosshairs} size="4x" />
                    </div>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-[#a8a29e] text-[10px] font-black uppercase tracking-[0.2em]">Google Pixel Data</h3>
                        <a href="https://ads.google.com" target="_blank" rel="noreferrer" className="bg-[#1c1917] hover:bg-orange-600/20 border border-[#443b34] text-[#78716c] hover:text-orange-500 p-2 rounded-lg transition-all shadow-sm">
                            <FontAwesomeIcon icon={faGoogle} className="text-xs" />
                        </a>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <p className="text-xl font-black text-[#e7e5e4]">PIXEL_ACTIVE</p>
                    </div>
                    <p className="text-[9px] text-[#78716c] mt-2 font-mono uppercase">Última actividad: {new Date().toLocaleDateString()}</p>
                </div>

                {/* TARJETA ESTUDIANTES */}
                <div className="bg-[#2a2420] p-6 rounded-2xl border border-[#443b34] shadow-xl">
                    <h3 className="text-[#a8a29e] text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                        <FontAwesomeIcon icon={faUsers} className="text-orange-500" /> Students CRM
                    </h3>
                    <div className="mt-4 flex items-end gap-3">
                        <p className="text-3xl font-black text-[#e7e5e4]">{stats.totalStudents}</p>
                        <p className="text-xs font-bold text-green-500 mb-1">
                            {stats.paidStudents} Pagos Activos
                        </p>
                    </div>
                    <p className="text-[10px] text-[#78716c] mt-1 italic">Ubicación principal: {stats.lastLocation}</p>
                </div>

                {/* TARJETA INGRESOS (USD / COP) */}
                <div className="bg-[#2a2420] p-6 rounded-2xl border border-[#443b34] shadow-xl">
                    <h3 className="text-[#a8a29e] text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                        <FontAwesomeIcon icon={faWallet} className="text-orange-500" /> Revenue Est.
                    </h3>
                    <div className="mt-4">
                        <p className="text-2xl font-black text-[#e7e5e4]">${stats.estimatedRevenue} <span className="text-xs text-[#78716c]">USD</span></p>
                        <p className="text-sm font-bold text-orange-600/80">{formatCOP(stats.estimatedRevenue)} <span className="text-[10px]">COP</span></p>
                    </div>
                </div>
            </div>

            {/* --- SECCIÓN 2: MAPA & CALENDARIO (Ahora en el medio) --- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[400px]">
                
                {/* WIDGET 1: UBICACIÓN */}
                <div className="h-full">
                    <LocationWidget />
                </div>

                {/* WIDGET 2: CALENDARIO CUSTOM */}
                <div className="bg-[#26201b] border border-[#443b34] rounded-2xl overflow-hidden shadow-xl p-6 flex flex-col">
                    {/* Header del Calendario */}
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <FontAwesomeIcon icon={faCalendarAlt} className="text-orange-600" />
                            <h3 className="text-[#e7e5e4] font-black uppercase tracking-widest text-sm">
                                {calendarDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                            </h3>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => changeMonth(-1)} className="p-2 bg-[#1c1917] rounded text-[#78716c] hover:text-white transition-colors"><FontAwesomeIcon icon={faChevronLeft}/></button>
                            <button onClick={() => changeMonth(1)} className="p-2 bg-[#1c1917] rounded text-[#78716c] hover:text-white transition-colors"><FontAwesomeIcon icon={faChevronRight}/></button>
                        </div>
                    </div>

                    {/* Grilla del Calendario */}
                    <div className="flex-1">
                        <div className="grid grid-cols-7 text-center mb-2">
                            {['L','M','M','J','V','S','D'].map(d => (
                                <span key={d} className="text-[10px] font-black text-[#574c43]">{d}</span>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1 h-full content-start">
                            {/* Días vacíos */}
                            {Array.from({ length: firstDayOfMonth(calendarDate) }).map((_, i) => (
                                <div key={`empty-${i}`} className="h-8 md:h-10"></div>
                            ))}
                            {/* Días del mes */}
                            {Array.from({ length: daysInMonth(calendarDate) }).map((_, i) => {
                                const day = i + 1;
                                const isToday = day === new Date().getDate() && calendarDate.getMonth() === new Date().getMonth();
                                return (
                                    <div 
                                        key={day} 
                                        className={`h-8 md:h-10 flex items-center justify-center rounded-lg text-xs font-bold transition-all cursor-default
                                            ${isToday 
                                                ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/50 scale-110' 
                                                : 'text-[#a8a29e] hover:bg-[#3a3028] hover:text-white'
                                            }
                                        `}
                                    >
                                        {day}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* --- SECCIÓN 3: GRÁFICO LOOKER STUDIO (Abajo del todo) --- */}
            <div className="bg-[#26201b] rounded-3xl border border-[#443b34] overflow-hidden shadow-2xl h-[600px] flex flex-col">
                <div className="p-5 bg-[#211c18] border-b border-[#443b34] flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-orange-600 rounded-full animate-pulse"></div>
                        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#e7e5e4]">Traffic Intelligence</h3>
                    </div>
                    <a 
                        href="https://lookerstudio.google.com/reporting/8a85ba57-274c-4898-8282-4be74ec54848" 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-[10px] text-orange-500 font-black hover:text-orange-400 transition-colors flex items-center gap-2"
                    >
                        REPORTE COMPLETO <FontAwesomeIcon icon={faExternalLinkAlt} />
                    </a>
                </div>
                
                <div className="flex-1 bg-white">
                    <iframe 
                        width="100%" 
                        height="100%" 
                        src={LOOKER_URL} 
                        style={{ border: 0 }} 
                        allowFullScreen 
                        title="Nardo Data Report"
                    />
                </div>
            </div>

        </div>
    );
};

export default Overview;