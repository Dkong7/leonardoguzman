import { useContext, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGuitar, faTrophy, faCompactDisc, faUsers, faChalkboardTeacher, faBolt, faGlobeAmericas, faBookOpen } from '@fortawesome/free-solid-svg-icons';
import SpaceBackground from '../components/SpaceBackground';
import { ThemeContext } from '../context/ThemeContext';

interface TimelineEvent {
    year: string;
    title: string;
    desc: string;
    icon: any;
    color: string;
    video?: string; // YouTube ID
}

const Bio = () => {
    const { theme } = useContext(ThemeContext);
    const isDark = theme === 'purple';

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const events: TimelineEvent[] = [
        {
            year: "THE BEGINNING",
            title: "Orígenes y Formación",
            desc: "Su primer contacto con la guitarra fue a los 4 años. Se graduó en Música y Jazz en la Universidad El Bosque (Bogotá), siendo alumno del Maestro Gabriel Rondón durante 5 años.",
            icon: faGuitar,
            color: "text-purple-500"
        },
        {
            year: "2010",
            title: "Guitarrosis Community",
            desc: "Funda 'Guitarrosis', una de las primeras comunidades online de guitarra en LATAM, llegando a miles de miembros y produciendo cerca de 200 episodios educativos gratuitos.",
            icon: faUsers,
            color: "text-blue-400"
        },
        {
            year: "2011 - 2013",
            title: "Competencias Mundiales",
            desc: "Participó en ~20 competencias globales, logrando 5 Primeros Lugares y múltiples podios. Reconocido por jueces como Jason Becker, Guthrie Govan y Per Nilsson.",
            icon: faTrophy,
            color: "text-yellow-500",
            video: "4nUPNmEr6KI"
        },
        {
            year: "HITO",
            title: "Jakarta Guitar Festival",
            desc: "Ganador del primer lugar en el prestigioso festival de Jakarta.",
            icon: faTrophy,
            color: "text-yellow-500",
            video: "mU0qsWtE10U"
        },
        {
            year: "2014",
            title: "Debut EP: 'NOW!'",
            desc: "Lanzamiento de su primer EP con Sebastiaan Cornelissen (Batería) y Alex Argento (Mezcla). Producido por Jelly Beard (Europa). Una fusión de Rock, Metal, Jazz y Folclor Colombiano.",
            icon: faCompactDisc,
            color: "text-red-500",
            video: "MRv8oX8uKMg"
        },
        {
            year: "NAMM SHOW",
            title: "International Stage",
            desc: "Invitado a tres versiones del NAMM Show en Anaheim, CA. Representando marcas como GruvGear, Cort y Hufschmid. Jam sessions con íconos como Tom Quayle.",
            icon: faGlobeAmericas,
            color: "text-purple-500",
            video: "WAn_2UPyDHw"
        },
        {
            year: "2016 - 2019",
            title: "Giras Educativas",
            desc: "Masterclasses en Musicians Institute (LA), Groove Music Factory (Ecuador) y el 'Stephallen Tour' por el eje cafetero colombiano. Tallerista invitado por IDARTES en Rock al Parque.",
            icon: faChalkboardTeacher,
            color: "text-green-500"
        },
        {
            year: "ACTUALIDAD",
            title: "Cort Signature & Academia",
            desc: "Primer colombiano con una guitarra 'Signature' de Cort Guitars. Dirige su academia online con más de 300 estudiantes y continúa creando contenido para su canal de YouTube (20k+ subs).",
            icon: faBolt,
            color: "text-purple-400",
            video: "gbDdYkEuo-Y"
        },
        {
            year: "2026",
            title: "Métodos y Publicaciones",
            desc: "Ha escrito cerca de 10 métodos & libros sobre el estudio de la guitarra eléctrica, la naturaleza del diapasón, técnica, armonía, improvisación e incluso el manejo del tiempo y la práctica correcta.",
            icon: faBookOpen,
            color: "text-pink-500"
        }
    ];

    // --- ESTILOS DINÁMICOS ---
    const textPrimary = isDark ? 'text-white' : 'text-gray-800';
    const textSecondary = isDark ? 'text-gray-400' : 'text-gray-600';
    
    const cardStyle = isDark
        ? 'bg-[#1a1a24]/60 backdrop-blur-md border border-white/10 shadow-[0_0_30px_rgba(147,51,234,0.1)]' // Dark Glass
        : 'bg-white border border-gray-100 shadow-[10px_10px_20px_#bebebe,-10px_-10px_20px_#ffffff]'; // Light Neumorphism

    const lineGradient = isDark 
        ? 'bg-gradient-to-b from-purple-500 via-purple-900/50 to-transparent'
        : 'bg-gradient-to-b from-purple-600 via-gray-300 to-transparent';

    return (
        <div className={`min-h-screen relative font-sans pb-20 overflow-x-hidden transition-colors duration-500 ${isDark ? 'bg-[#050505]' : 'bg-[#e0e5ec]'}`}>
            
            {/* FONDO DE ESTRELLAS */}
            {isDark && (
                <div className="fixed inset-0 z-0">
                    <SpaceBackground />
                </div>
            )}

            {/* HEADER */}
            <div className="relative pt-36 pb-20 text-center z-10 px-4">
                <h1 className={`text-5xl md:text-7xl font-serif font-black mb-4 tracking-tighter ${textPrimary} drop-shadow-2xl`}>
                    LEONARDO <span className={`text-transparent bg-clip-text bg-gradient-to-r ${isDark ? 'from-purple-400 to-pink-500' : 'from-purple-600 to-purple-800'}`}>GUZMAN</span>
                </h1>
                <div className="flex flex-col items-center gap-4">
                    <div className={`h-1 w-24 rounded-full ${isDark ? 'bg-purple-600 shadow-[0_0_15px_#9333ea]' : 'bg-purple-500'}`}></div>
                    <p className={`text-sm md:text-base font-bold tracking-[0.4em] uppercase ${textSecondary}`}>
                        The Journey & Milestones
                    </p>
                </div>
            </div>

            {/* TIMELINE */}
            <div className='max-w-5xl mx-auto px-4 relative z-10'>
                
                {/* Línea central vertical */}
                <div className={`absolute left-8 md:left-1/2 top-0 bottom-0 w-0.5 md:-translate-x-1/2 h-full z-0 ${lineGradient}`}></div>

                <div className='space-y-24 pb-24'>
                    {events.map((event, i) => {
                        const isEven = i % 2 === 0;
                        return (
                            <motion.div 
                                key={i}
                                initial={{ opacity: 0, y: 50 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-100px" }}
                                transition={{ duration: 0.7, delay: 0.1 }}
                                className={`relative flex flex-col md:flex-row items-center md:items-start ${isEven ? 'md:flex-row-reverse' : ''}`}
                            >
                                {/* Puntos en la línea de tiempo */}
                                <div className={`absolute left-8 md:left-1/2 -translate-x-[5px] md:-translate-x-1/2 w-4 h-4 rounded-full border-4 z-10 mt-1.5 shadow-lg
                                    ${isDark ? 'bg-black border-purple-500 shadow-purple-500/50' : 'bg-white border-purple-600 shadow-purple-200'}
                                `}></div>

                                {/* Espacio vacío para alternar lados */}
                                <div className='hidden md:block w-1/2'></div>

                                {/* Contenido (Tarjeta) */}
                                <div className={`w-full md:w-1/2 pl-20 md:pl-0 ${isEven ? 'md:pr-16' : 'md:pl-16'} relative z-10`}>
                                    
                                    <div className={`p-8 rounded-[2rem] transition-all duration-300 hover:-translate-y-1 ${cardStyle} ${isEven ? 'md:text-right' : 'md:text-left'}`}>
                                        
                                        {/* Header Evento */}
                                        <div className={`flex items-center gap-4 mb-4 ${isEven ? 'md:flex-row-reverse' : ''}`}>
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-inner ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                                                <FontAwesomeIcon icon={event.icon} className={event.color} />
                                            </div>
                                            <span className={`text-xs font-black tracking-widest uppercase px-3 py-1 rounded-full border ${isDark ? 'border-white/10 bg-black/30 text-gray-400' : 'border-gray-200 bg-white text-gray-500'}`}>
                                                {event.year}
                                            </span>
                                        </div>

                                        <h3 className={`text-2xl font-serif font-bold mb-3 uppercase tracking-wide ${textPrimary}`}>{event.title}</h3>
                                        <p className={`text-sm leading-relaxed ${textSecondary}`}>
                                            {event.desc}
                                        </p>

                                        {/* Video Embed */}
                                        {event.video && (
                                            <div className={`mt-6 rounded-xl overflow-hidden shadow-2xl relative group ${isDark ? 'border border-white/10' : 'border border-gray-200'}`}>
                                                <div className='relative w-full aspect-video bg-black'>
                                                    <iframe 
                                                        className='absolute top-0 left-0 w-full h-full'
                                                        src={`https://www.youtube.com/embed/${event.video}`} 
                                                        title={event.title}
                                                        frameBorder="0" 
                                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                                        allowFullScreen
                                                    ></iframe>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* FOOTER QUOTE */}
            <div className='max-w-3xl mx-auto text-center mt-12 px-6 relative z-10'>
                <FontAwesomeIcon icon={faBolt} className='text-4xl text-yellow-500 mb-6 animate-pulse' />
                <h3 className={`text-2xl md:text-3xl font-serif italic mb-8 ${textPrimary}`}>"Una fusión perfecta entre la precisión técnica y el alma del folclor."</h3>
                <div className={`h-1 w-20 mx-auto rounded-full ${isDark ? 'bg-purple-600' : 'bg-purple-500'}`}></div>
            </div>

        </div>
    );
};

export default Bio;