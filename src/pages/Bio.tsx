import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGuitar, faTrophy, faCompactDisc, faUsers, faChalkboardTeacher, faBolt, faGlobeAmericas } from '@fortawesome/free-solid-svg-icons';

interface TimelineEvent {
  year: string;
  title: string;
  desc: string;
  icon: any;
  color: string;
  video?: string; // YouTube ID
  image?: string;
}

const Bio = () => {
  const events: TimelineEvent[] = [
    {
      year: "THE BEGINNING",
      title: "Orígenes y Formación",
      desc: "Su primer contacto con la guitarra fue a los 4 años. Se graduó en Música y Jazz en la Universidad El Bosque (Bogotá), siendo alumno del Maestro Gabriel Rondón durante 5 años.",
      icon: faGuitar,
      color: "text-nardo-500"
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
      video: "4nUPNmEr6KI" // Guitar Messenger Winner
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
      video: "MRv8oX8uKMg" // Album Trailer
    },
    {
        year: "NAMM SHOW",
        title: "International Stage",
        desc: "Invitado a tres versiones del NAMM Show en Anaheim, CA. Representando marcas como GruvGear, Cort y Hufschmid. Jam sessions con íconos como Tom Quayle.",
        icon: faGlobeAmericas,
        color: "text-purple-500",
        video: "WAn_2UPyDHw" // Jam con Tom Quayle
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
      color: "text-nardo-400",
      video: "gbDdYkEuo-Y" // Por el alto del buey
    }
  ];

  return (
    <div className='min-h-screen bg-black text-gray-200 font-sans pb-20 overflow-x-hidden'>
      
      {/* HEADER */}
      <div className="relative py-32 text-center bg-nardo-950 border-b border-nardo-900">
         <div className="absolute inset-0 bg-[url('/backgroundHero.gif')] opacity-10 bg-cover bg-center grayscale mix-blend-overlay"></div>
         <div className="relative z-10">
            <h1 className='text-5xl md:text-7xl font-serif font-bold mb-4 tracking-tighter text-white'>
                LEONARDO <span className='text-transparent bg-clip-text bg-gradient-to-r from-nardo-400 to-nardo-600'>GUZMAN</span>
            </h1>
            <p className='text-sm md:text-xl text-gray-400 tracking-[0.5em] uppercase font-light'>The Journey & Milestones</p>
         </div>
      </div>

      {/* TIMELINE */}
      <div className='max-w-5xl mx-auto px-4 mt-20 relative'>
        {/* Línea central vertical */}
        <div className='absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-nardo-500 via-nardo-900 to-transparent md:-translate-x-1/2 h-full z-0'></div>

        <div className='space-y-24'>
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
                        <div className='absolute left-8 md:left-1/2 -translate-x-[5px] md:-translate-x-1/2 w-3 h-3 rounded-full bg-black border-2 border-nardo-500 z-10 mt-1.5 shadow-[0_0_10px_#a855f7]'></div>

                        {/* Espacio vacío para alternar lados */}
                        <div className='hidden md:block w-1/2'></div>

                        {/* Contenido */}
                        <div className={`w-full md:w-1/2 pl-20 md:pl-0 ${isEven ? 'md:pr-16 md:text-right' : 'md:pl-16 md:text-left'} relative z-10`}>
                            
                            <div className={`flex items-center gap-4 mb-3 ${isEven ? 'md:flex-row-reverse' : ''}`}>
                                <span className={`text-3xl ${event.color}`}>
                                    <FontAwesomeIcon icon={event.icon} />
                                </span>
                                <span className='text-sm font-bold tracking-widest text-gray-500 uppercase border border-gray-800 px-3 py-1 rounded-full bg-black/50 backdrop-blur-sm'>
                                    {event.year}
                                </span>
                            </div>

                            <h3 className='text-2xl font-bold text-white mb-4 uppercase tracking-wide'>{event.title}</h3>
                            <p className='text-gray-400 leading-relaxed text-sm mb-6'>
                                {event.desc}
                            </p>

                            {/* Video Embed si existe */}
                            {event.video && (
                                <div className='mt-6 rounded-xl overflow-hidden border border-gray-800 shadow-2xl group transition-all duration-300 hover:border-nardo-500/50 hover:shadow-nardo-900/20'>
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
                    </motion.div>
                );
            })}
        </div>
      </div>

      {/* FOOTER QUOTE */}
      <div className='max-w-2xl mx-auto text-center mt-32 px-6'>
        <FontAwesomeIcon icon={faBolt} className='text-4xl text-yellow-500 mb-6 animate-pulse' />
        <h3 className='text-2xl font-serif italic text-white mb-6'>"Una fusión perfecta entre la precisión técnica y el alma del folclor."</h3>
        <div className='h-1 w-20 bg-nardo-500 mx-auto rounded-full'></div>
      </div>

    </div>
  );
};

export default Bio;