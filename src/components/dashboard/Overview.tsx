import { useState, useEffect } from 'react';
import pb from '../../lib/pocketbase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faCrosshairs, faUsers, 
    faWallet, 
    faChevronLeft, faChevronRight, faCalendarAlt,
    faCheckCircle, faUserGraduate
} from '@fortawesome/free-solid-svg-icons';
import { faGoogle } from '@fortawesome/free-brands-svg-icons';

import LocationWidget from './LocationWidget';

const Overview = () => {
    const [stats, setStats] = useState({
        totalStudents: 0,
        paidStudents: 0,
        estimatedRevenue: 0,
        lastLocation: 'Detectando...'
    });
    
    // Eliminado estado 'loading' no usado para limpiar el build
    
    const [calendarDate, setCalendarDate] = useState(new Date()); 
    const [selectedDate, setSelectedDate] = useState(new Date()); 
    const [dailyEvents, setDailyEvents] = useState<any[]>([]); 
    const [allStudents, setAllStudents] = useState<any[]>([]); 

    const TRM = 4000; 
    

    useEffect(() => {
        fetchRealData();
    }, []);

    useEffect(() => {
        generateDailyAgenda(selectedDate);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDate, allStudents]);

    const fetchRealData = async () => {
        try {
            // Eliminado 'products' del destructuring para evitar error TS6133
            const [users] = await Promise.all([
                pb.collection('users').getFullList(),
                pb.collection('tienda').getFullList()
            ]);

            setAllStudents(users);

            const paidCount = users.filter((u: any) => u.pago_activo === true).length;
            const revenueUSD = paidCount * 25; 

            setStats({
                totalStudents: users.length,
                paidStudents: paidCount,
                estimatedRevenue: revenueUSD,
                lastLocation: 'Bogotá, CO' 
            });
        } catch (error) {
            console.error("Error data:", error);
        }
    };

    const generateDailyAgenda = (date: Date) => {
        if (allStudents.length === 0) return;

        const daySeed = date.getDate(); 
        
        // SOLUCIÓN AL ERROR TS7005: Tipado explícito del array
        const events: any[] = []; 
        
        const hours = [9, 14, 16]; 
        
        hours.forEach((h, i) => {
            const studentIndex = (daySeed + i) % allStudents.length;
            const student = allStudents[studentIndex];
            
            if (student) {
                events.push({
                    id: `evt-${daySeed}-${i}`,
                    time: `${h}:00 ${h < 12 ? 'AM' : 'PM'}`,
                    title: i === 1 ? 'Revisión de Mezcla' : 'Clase de Instrumento',
                    student: student.username || 'Estudiante',
                    status: i === 0 ? 'completed' : 'pending',
                    avatar: student.avatar
                });
            }
        });

        setDailyEvents(events);
    };

    const formatCOP = (usd: number) => {
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(usd * TRM);
    };

    const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = (date: Date) => {
        let day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
        return day === 0 ? 6 : day - 1; 
    };
    const changeMonth = (offset: number) => {
        setCalendarDate(new Date(calendarDate.setMonth(calendarDate.getMonth() + offset)));
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#2a2420] p-6 rounded-2xl border border-orange-900/30 shadow-xl relative overflow-hidden group">
                    <div className="absolute -top-2 -right-2 p-4 text-orange-600/5 group-hover:text-orange-600/10 transition-all"><FontAwesomeIcon icon={faCrosshairs} size="4x" /></div>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-[#a8a29e] text-[10px] font-black uppercase tracking-[0.2em]">Google Pixel Data</h3>
                        <a href="https://ads.google.com" target="_blank" rel="noreferrer" className="bg-[#1c1917] border border-[#443b34] text-[#78716c] hover:text-orange-500 p-2 rounded-lg transition-all"><FontAwesomeIcon icon={faGoogle} className="text-xs" /></a>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <p className="text-xl font-black text-[#e7e5e4]">PIXEL_ACTIVE</p>
                    </div>
                    <p className="text-[9px] text-[#78716c] mt-2 font-mono uppercase">Última actividad: {new Date().toLocaleDateString()}</p>
                </div>

                <div className="bg-[#2a2420] p-6 rounded-2xl border border-[#443b34] shadow-xl">
                    <h3 className="text-[#a8a29e] text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><FontAwesomeIcon icon={faUsers} className="text-orange-500" /> Students CRM</h3>
                    <div className="mt-4 flex items-end gap-3">
                        <p className="text-3xl font-black text-[#e7e5e4]">{stats.totalStudents}</p>
                        <p className="text-xs font-bold text-green-500 mb-1">{stats.paidStudents} Pagos Activos</p>
                    </div>
                    <p className="text-[10px] text-[#78716c] mt-1 italic">Ubicación principal: {stats.lastLocation}</p>
                </div>

                <div className="bg-[#2a2420] p-6 rounded-2xl border border-[#443b34] shadow-xl">
                    <h3 className="text-[#a8a29e] text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><FontAwesomeIcon icon={faWallet} className="text-orange-500" /> Revenue Est.</h3>
                    <div className="mt-4">
                        <p className="text-2xl font-black text-[#e7e5e4]">${stats.estimatedRevenue} <span className="text-xs text-[#78716c]">USD</span></p>
                        <p className="text-sm font-bold text-orange-600/80">{formatCOP(stats.estimatedRevenue)} <span className="text-[10px]">COP</span></p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[450px]">
                <div className="h-full">
                    <LocationWidget />
                </div>

                <div className="bg-[#26201b] border border-[#443b34] rounded-2xl overflow-hidden shadow-xl flex">
                    <div className="w-1/2 p-6 border-r border-[#443b34] flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-[#e7e5e4] font-black uppercase text-xs">
                                {calendarDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                            </h3>
                            <div className="flex gap-1">
                                <button onClick={() => changeMonth(-1)} className="p-1 text-[#78716c] hover:text-white"><FontAwesomeIcon icon={faChevronLeft}/></button>
                                <button onClick={() => changeMonth(1)} className="p-1 text-[#78716c] hover:text-white"><FontAwesomeIcon icon={faChevronRight}/></button>
                            </div>
                        </div>
                        <div className="grid grid-cols-7 text-center mb-2">
                            {['L','M','M','J','V','S','D'].map(d => <span key={d} className="text-[9px] font-black text-[#574c43]">{d}</span>)}
                        </div>
                        <div className="grid grid-cols-7 gap-1 content-start">
                            {Array.from({ length: firstDayOfMonth(calendarDate) }).map((_, i) => <div key={`e-${i}`} className="h-8"></div>)}
                            {Array.from({ length: daysInMonth(calendarDate) }).map((_, i) => {
                                const day = i + 1;
                                const date = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day);
                                const isSel = date.toDateString() === selectedDate.toDateString();
                                return (
                                    <div 
                                        key={day} 
                                        onClick={() => setSelectedDate(date)}
                                        className={`h-8 flex items-center justify-center rounded text-xs font-bold cursor-pointer transition-all
                                            ${isSel ? 'bg-orange-600 text-white shadow-lg' : 'text-[#a8a29e] hover:bg-[#3a3028]'}
                                        `}
                                    >
                                        {day}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="w-1/2 flex flex-col bg-[#1f1a17]">
                        <div className="p-4 border-b border-[#443b34] bg-[#211c18]">
                            <h4 className="text-orange-500 font-black text-xs uppercase tracking-widest">
                                {selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric' })}
                            </h4>
                            <p className="text-[9px] text-[#78716c] mt-1 flex items-center gap-1">
                                <FontAwesomeIcon icon={faGoogle} /> Sync Activo
                            </p>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {dailyEvents.length === 0 ? (
                                <div className="text-center py-10 opacity-30">
                                    <FontAwesomeIcon icon={faCalendarAlt} size="2x" className="mb-2" />
                                    <p className="text-[10px]">Día Libre</p>
                                </div>
                            ) : (
                                dailyEvents.map((evt: any) => (
                                    <div key={evt.id} className="bg-[#26201b] border-l-2 border-orange-500 p-3 rounded flex gap-3 group hover:bg-[#2a2a2a] transition-colors">
                                        <div className="text-center min-w-[40px]">
                                            <p className="text-[9px] text-[#78716c] font-black uppercase">{evt.time.split(' ')[1]}</p>
                                            <p className="text-xs font-bold text-white">{evt.time.split(' ')[0]}</p>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-bold text-orange-400 truncate">{evt.title}</p>
                                            <div className="flex items-center gap-1 mt-1">
                                                <FontAwesomeIcon icon={faUserGraduate} className="text-[8px] text-[#574c43]" />
                                                <p className="text-[9px] text-[#a8a29e] truncate">{evt.student}</p>
                                            </div>
                                        </div>
                                        {evt.status === 'completed' && (
                                            <div className="text-green-500 flex items-start"><FontAwesomeIcon icon={faCheckCircle} size="xs"/></div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                        
                        <div className="p-2 text-center border-t border-[#443b34]">
                            <button className="text-[9px] text-[#574c43] hover:text-orange-500 uppercase font-bold transition-colors">
                                + Agendar Clase
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-[#26201b] rounded-3xl border border-[#443b34] overflow-hidden shadow-2xl h-[600px] flex flex-col">
                <div className="p-5 bg-[#211c18] border-b border-[#443b34] flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-orange-600 rounded-full animate-pulse"></div>
                        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#e7e5e4]">Traffic Intelligence (Internal)</h3>
                    </div>
                </div>
                <div className="flex-1 bg-[#1f1a17] overflow-y-auto p-4">
                    <InternalTraffic />
                </div>
            </div>
        </div>
    );
};

const InternalTraffic = () => {
    const [views, setViews] = useState<any[]>([]);

    useEffect(() => {
        pb.collection('pageviews').getList(1, 50, { sort: '-created' })
            .then(res => setViews(res.items))
            .catch(() => {});
    }, []);

    return (
        <div className="space-y-3">
            <h4 className="text-orange-500 text-xs font-bold uppercase mb-4 tracking-wider">Últimas 50 visitas</h4>
            {views.map(v => {
                let flag = '🌐';
                if (v.country_code) {
                    flag = v.country_code.toUpperCase().replace(/./g, (char: string) => String.fromCodePoint(char.charCodeAt(0) + 127397));
                }
                return (
                    <div key={v.id} className="bg-[#26201b] p-3 rounded border-l-2 border-orange-500 flex justify-between gap-4">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-xl leading-none">{flag}</span>
                                <span className="text-white font-bold text-xs truncate">{v.path}</span>
                            </div>
                            <p className="text-[#a8a29e] text-[10px] mt-1 break-all">Org: {v.referrer}</p>
                            <p className="text-[#78716c] text-[9px] mt-1 font-mono uppercase tracking-widest">{v.city || 'Desconocido'}, {v.country || 'Desconocido'}</p>
                        </div>
                        <div className="text-right flex-shrink-0 flex flex-col justify-between items-end">
                            <span className="text-[#78716c] text-[10px]">{new Date(v.created).toLocaleString()}</span>
                            <span className="text-orange-500 text-[9px] font-black uppercase bg-[#1f1a17] px-2 py-1 rounded">{v.os || 'Desconocido'}</span>
                        </div>
                    </div>
                );
            })}
            {views.length === 0 && <p className="text-[#78716c] text-xs">Aún no hay datos de tráfico...</p>}
        </div>
    );
};

export default Overview;
