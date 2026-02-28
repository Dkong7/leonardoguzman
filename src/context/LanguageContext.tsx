import { createContext, useContext, useState, type ReactNode } from 'react';

type Lang = 'ES' | 'EN';

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void; // AÑADIDO: Permite cambiar el idioma directamente
  toggleLanguage: () => void;
  t: (key: string) => any; 
}

const translations = {
  ES: { 
    // --- NAVBAR ---
    home: 'INICIO', 
    music: 'MÚSICA', 
    tour: 'CONCIERTOS', 
    store: 'TIENDA', 
    bio: 'BIO', 
    school: 'DOJO', 
    booking: 'BOOKING',

    // --- FOOTER & GLOBALES ---
    copyright: '© 2026 Leonardo Guzman. Todos los derechos reservados.',
    developed_by: 'DESARROLLADO POR',
    loading: 'Cargando...',
    error_loading: 'Error cargando contenido.',

    // --- HOME (HERO & SECTIONS) ---
    musician: 'MÚSICO',
    latest_drops: 'ÚLTIMOS LANZAMIENTOS',
    section_allies: 'ALIADOS & SPONSORS',
    explore_store: 'EXPLORAR TIENDA COMPLETA',
    official_store: 'TIENDA OFICIAL',

    // --- MÚSICA (PAGE) --- 
    discography: 'DISCOGRAFÍA',
    listen_experience: 'ESCUCHA . EXPERIMENTA . SIENTE',
    now_playing: 'REPRODUCIENDO AHORA',
    selected_video: 'VIDEO SELECCIONADO',
    releases: 'LANZAMIENTOS',
    official_videos: 'VIDEOS OFICIALES',
    academic_gear: 'ACADEMIA Y EQUIPO',
    single_album: 'SENCILLO / ÁLBUM',

    // --- TOUR / CONCIERTOS --- 
    tour_dates_highlight: 'FECHAS', 
    tour_subtitle: 'PRÓXIMOS CONCIERTOS Y MASTERCLASSES ALREDEDOR DEL MUNDO',

    // --- TIENDA (STORE PAGE) ---
    store_title: 'MATERIAL DE ESTUDIO',
    store_subtitle: 'MÚSICA, LIBROS Y MERCH OFICIAL', 
    section_audio: 'AUDIO & TOOLS',
    section_merch: 'MERCH OFICIAL',
    view_catalog: 'VER CATÁLOGO COMPLETO',
    add_to_cart: 'AGREGAR AL CARRITO',
    view_details: 'VER DETALLES',
    price_approx: 'aprox.',

    // --- CARRITO ---
    your_cart: 'TU CARRITO',
    empty_cart: 'TU CARRITO ESTÁ VACÍO',
    go_store: 'IR A TIENDA OFICIAL',
    go_edu: 'VER MATERIAL EDUCATIVO',
    summary: 'RESUMEN',
    subtotal: 'SUBTOTAL',
    total_pay: 'TOTAL A PAGAR',
    pay_mercadopago: 'PAGAR CON MERCADOPAGO',
    pay_paypal: 'PAGAR CON PAYPAL',
    secure_payment: 'PAGOS 100% ENCRIPTADOS',
    items: 'items',
    processing: 'PROCESANDO...',

    // --- BOOKING ---
    booking_title: 'BOOKING',
    management_press: 'MANAGEMENT & PRENSA',
    representation: 'REPRESENTACIÓN',
    representation_desc: 'Para contrataciones, festivales, clínicas y colaboraciones de marca, por favor contacte a nuestro equipo de management. Nos reservamos el derecho de admisión de propuestas.',
    booking_agent: 'BOOKING AGENT',
    base: 'BASE',
    base_location: 'Bogotá, Colombia (Disponible Mundialmente)',
    download_epk: 'DESCARGAR EPK',
    press_kit: 'PRESS KIT 2026',
    tech_rider: 'RIDER TÉCNICO',
    stage_plot: 'STAGE & INPUT LIST',
    contact_form: 'FORMULARIO DE CONTACTO',
    name_entity: 'NOMBRE / ENTIDAD',
    email_official: 'EMAIL OFICIAL',
    subject: 'ASUNTO',
    message_proposal: 'MENSAJE / PROPUESTA',
    send_proposal: 'ENVIAR PROPUESTA',
    opt_booking: 'Booking / Concierto',
    opt_press: 'Prensa / Entrevista',
    opt_collab: 'Colaboración / Marca',
    opt_clinic: 'Clínica / Masterclass',
    opt_other: 'Otro',

    // --- EDUCACIÓN (DOJO / CLASES) ---
    dojo_title: 'EL CAMINO DEL SONIDO',
    dojo_subtitle: '"Gracias por el interés. Aquí encontrarás claridad, disciplina y el método para llevar tu música al siguiente nivel."',
    pro_training: 'FORMACIÓN PROFESIONAL',
    view_material: 'VER MATERIAL',
    view_plans: 'VER PLANES',
    
    // Logística
    digital_dojo: 'EL DOJO DIGITAL',
    dojo_desc: 'Las clases son 100% en vivo para garantizar la corrección técnica inmediata. Utilizamos plataformas de alta estabilidad.',
    record_progress: 'GRABA TU PROGRESO',
    record_desc: 'Usa OBS o QuickTime. Tener tu propio registro es vital para repasar.',
    effective_time: 'TIEMPO EFECTIVO',
    time_desc: '45 - 55 Minutos. Tiempo óptimo para máxima concentración sin fatiga.',

    // Planes
    study_plans: 'PLANES DE ESTUDIO',
    investment_desc: 'Inversión mensual. Precios para Colombia y el Mundo.',
    
    plan_initiation: 'INICIACIÓN',
    first_month: 'PRIMER MES',
    plan_continuity: 'CONTINUIDAD',
    old_students: 'ANTIGUOS ALUMNOS',
    plan_bimonthly: 'BIMESTRAL',
    smart_saving: 'AHORRO INTELIGENTE',
    
    feat_4classes: '4 Clases Privadas',
    feat_3books: '3 Libros PDF Incluidos',
    feat_recordings: 'Grabaciones Talleres',
    feat_preferential: 'Tarifa Preferencial',
    feat_email_support: 'Soporte vía Email',
    feat_bonus: 'Bonus cada 6 meses',
    feat_8classes: '2 Meses (8 Clases)',
    feat_fixed_schedule: 'Horario Fijo Asegurado',
    feat_discount: 'Descuento Aplicado',

    // Protocolo
    protocol_title: 'PROTOCOLO',
    check_tech: 'CHECK TÉCNICO',
    check_desc: 'Prueba tu cámara y micrófono antes. Respetar el tiempo de la clase empieza por la puntualidad técnica.',
    comm_title: 'COMUNICACIÓN',
    comm_desc: 'Todas las dudas académicas se resuelven SOLO POR EMAIL. No uso redes sociales para soporte de clases.',
    homework_title: 'TAREAS',
    homework_desc: 'Envía tus videos un día antes. Subirlos durante la llamada consume tiempo valioso.',
    
    policy_title: 'POLÍTICA DE REPOSICIONES',
    policy_quote: '"Mi horario es complejo. Cambiar clases es difícil. Valora tu espacio."',
    policy_1: 'Avisar mínimo 24 horas antes.',
    policy_2: 'Proponer horarios alternativos para la misma semana.',
    policy_3: 'Si no puedes asistir, envía video con la tarea.',
    policy_plan_b: 'Plan B: Grabaré una video-clase personalizada en tu horario.',

    footer_dojo_title: 'LA META ES LA EXCELENCIA.',
    footer_dojo_desc: '"Ni mis clases ni ningún otro método surte efecto sin constancia. Deja el afán fuera. Estoy aquí para ahorrarte tiempo, pero necesito tu confianza en el proceso."',
    see_you: '¡NOS VEMOS EN CLASE!',
  },
  
  EN: { 
    // --- NAVBAR ---
    home: 'HOME', 
    music: 'MUSIC', 
    tour: 'TOUR', 
    store: 'STORE', 
    bio: 'BIO', 
    school: 'DOJO', 
    booking: 'BOOKING',

    // --- FOOTER & GLOBALES ---
    copyright: '© 2026 Leonardo Guzman. All Rights Reserved.',
    developed_by: 'DEVELOPED BY',
    loading: 'Loading...',
    error_loading: 'Error loading content.',

    // --- HOME ---
    musician: 'MUSICIAN',
    latest_drops: 'LATEST DROPS',
    section_allies: 'PARTNERS & SPONSORS',
    explore_store: 'EXPLORE FULL STORE',
    official_store: 'OFFICIAL STORE',

    // --- MUSIC (PAGE) ---
    discography: 'DISCOGRAPHY',
    listen_experience: 'LISTEN . EXPERIENCE . FEEL',
    now_playing: 'NOW PLAYING',
    selected_video: 'SELECTED VIDEO',
    releases: 'RELEASES',
    official_videos: 'OFFICIAL VIDEOS',
    academic_gear: 'ACADEMIC & GEAR',
    single_album: 'SINGLE / ALBUM',

    // --- TOUR ---
    tour_dates_highlight: 'DATES',
    tour_subtitle: 'UPCOMING SHOWS & MASTERCLASSES AROUND THE WORLD',

    // --- STORE ---
    store_title: 'STUDY MATERIAL',
    store_subtitle: 'MUSIC, BOOKS & OFFICIAL MERCH',
    section_audio: 'AUDIO & TOOLS',
    section_merch: 'OFFICIAL MERCH',
    view_catalog: 'VIEW FULL CATALOG',
    add_to_cart: 'ADD TO CART',
    view_details: 'VIEW DETAILS',
    price_approx: 'approx.',

    // --- CART ---
    your_cart: 'YOUR CART',
    empty_cart: 'YOUR CART IS EMPTY',
    go_store: 'GO TO OFFICIAL STORE',
    go_edu: 'VIEW EDUCATIONAL MATERIAL',
    summary: 'SUMMARY',
    subtotal: 'SUBTOTAL',
    total_pay: 'TOTAL TO PAY',
    pay_mercadopago: 'PAY WITH MERCADOPAGO',
    pay_paypal: 'PAY WITH PAYPAL',
    secure_payment: '100% ENCRYPTED PAYMENTS',
    items: 'items',
    processing: 'PROCESSING...',

    // --- BOOKING ---
    booking_title: 'BOOKING',
    management_press: 'MANAGEMENT & PRESS',
    representation: 'REPRESENTATION',
    representation_desc: 'For bookings, festivals, clinics, and brand collaborations, please contact our management team. We reserve the right to decline proposals.',
    booking_agent: 'BOOKING AGENT',
    base: 'BASE',
    base_location: 'Bogotá, Colombia (Available Worldwide)',
    download_epk: 'DOWNLOAD EPK',
    press_kit: 'PRESS KIT 2026',
    tech_rider: 'TECH RIDER',
    stage_plot: 'STAGE & INPUT LIST',
    contact_form: 'CONTACT FORM',
    name_entity: 'NAME / ENTITY',
    email_official: 'OFFICIAL EMAIL',
    subject: 'SUBJECT',
    message_proposal: 'MESSAGE / PROPOSAL',
    send_proposal: 'SEND PROPOSAL',
    opt_booking: 'Booking / Concert',
    opt_press: 'Press / Interview',
    opt_collab: 'Collaboration / Brand',
    opt_clinic: 'Clinic / Masterclass',
    opt_other: 'Other',

    // --- EDUCATION (DOJO) ---
    dojo_title: 'THE PATH OF SOUND',
    dojo_subtitle: '"Thanks for your interest. Here you will find clarity, discipline, and the method to take your music to the next level."',
    pro_training: 'PROFESSIONAL TRAINING',
    view_material: 'VIEW MATERIAL',
    view_plans: 'VIEW PLANS',
    
    // Logistics
    digital_dojo: 'THE DIGITAL DOJO',
    dojo_desc: 'Classes are 100% live to ensure immediate technical correction. We use high-stability platforms.',
    record_progress: 'RECORD YOUR PROGRESS',
    record_desc: 'Use OBS or QuickTime. Having your own record is vital for review.',
    effective_time: 'EFFECTIVE TIME',
    time_desc: '45 - 55 Minutes. Optimal time for maximum concentration without fatigue.',

    // Plans
    study_plans: 'STUDY PLANS',
    investment_desc: 'Monthly investment. Prices for Colombia and the World.',
    
    plan_initiation: 'INITIATION',
    first_month: 'FIRST MONTH',
    plan_continuity: 'CONTINUITY',
    old_students: 'FORMER STUDENTS',
    plan_bimonthly: 'BI-MONTHLY',
    smart_saving: 'SMART SAVING',
    
    feat_4classes: '4 Private Classes',
    feat_3books: '3 PDF Books Included',
    feat_recordings: 'Workshop Recordings',
    feat_preferential: 'Preferential Rate',
    feat_email_support: 'Email Support',
    feat_bonus: 'Bonus every 6 months',
    feat_8classes: '2 Months (8 Classes)',
    feat_fixed_schedule: 'Guaranteed Fixed Schedule',
    feat_discount: 'Discount Applied',

    // Protocol
    protocol_title: 'PROTOCOL',
    check_tech: 'TECH CHECK',
    check_desc: 'Test your camera and mic beforehand. Respecting class time starts with technical punctuality.',
    comm_title: 'COMMUNICATION',
    comm_desc: 'All academic questions are resolved ONLY VIA EMAIL. I do not use social media for class support.',
    homework_title: 'HOMEWORK',
    homework_desc: 'Send your videos one day before. Uploading them during the call consumes valuable time.',
    
    policy_title: 'MAKE-UP POLICY',
    policy_quote: '"My schedule is complex. Rescheduling classes is difficult. Value your space."',
    policy_1: 'Notify at least 24 hours in advance.',
    policy_2: 'Propose alternative times for the same week.',
    policy_3: 'If you cannot attend, send video with homework.',
    policy_plan_b: 'Plan B: I will record a personalized video class in your time slot.',

    footer_dojo_title: 'THE GOAL IS EXCELLENCE.',
    footer_dojo_desc: '"Neither my classes nor any other method works without consistency. Leave the rush outside. I am here to save you time, but I need your trust in the process."',
    see_you: 'SEE YOU IN CLASS!',
  }
};

const LanguageContext = createContext<LanguageContextType>({ 
    lang: 'ES', 
    setLang: () => {}, 
    toggleLanguage: () => {}, 
    t: () => '' 
});

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLang] = useState<Lang>('ES');
  const toggleLanguage = () => setLang(prev => (prev === 'ES' ? 'EN' : 'ES'));
  const t = (key: string) => (translations[lang] as any)[key] || key; 
  
  return (
      <LanguageContext.Provider value={{ lang, setLang, toggleLanguage, t }}>
          {children}
      </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);