import { createContext, useContext, useState, type ReactNode } from 'react';

type Lang = 'ES' | 'EN';

interface LanguageContextType {
  lang: Lang;
  toggleLang: () => void;
  t: (key: string) => any; 
}

const translations = {
  ES: { 
    home: 'INICIO', 
    music: 'MÚSICA', 
    tour: 'CONCIERTOS', 
    store: 'TIENDA', 
    bio: 'BIO', 
    school: 'ACADEMIA', 
    
    // TEXTOS GLOBALES Y FOOTER
    copyright: '© 2026 Leonardo Guzman. Todos los derechos reservados.',
    developed_by: 'DESARROLLADO POR',
    
    // SECCIONES HOME (NUEVO)
    section_allies: 'ALIADOS & SPONSORS',
    latest_drops: 'ÚLTIMOS LANZAMIENTOS',
    explore_store: 'EXPLORAR TIENDA COMPLETA',

    // TIENDA
    store_title: 'STORE & MERCH',
    store_subtitle: 'MÚSICA, LIBROS Y MERCH OFICIAL', 
    section_academy: 'ACADEMIA Y RECURSOS',
    section_merch: 'MERCH OFICIAL',
    
    buy_now: 'COMPRAR AHORA',
    view_details: 'VER DETALLES',
    view_gallery: 'VER GALERÍA',
    processing: 'PROCESANDO...',
    sold_out: 'AGOTADO',
    currency_label: 'COP', 

    // CATEGORÍAS NEÓN
    cat_essentials: 'Esenciales',
    cat_physical: 'Físicos',
    cat_creative: 'Creativos',
    cat_more: 'Más',

    // ITEMS
    item_visualization: 'VISUALIZACIÓN',
    desc_visualization: 'Entender la naturaleza visual del diapasón.',
    item_vocabulary: 'VOCABULARIO',
    desc_vocabulary: 'Escalas, arpegios y acordes organizados.',
    item_theory: 'CONCEPTOS TEÓRICOS',
    desc_theory: 'Armonía Tonal & Modal aplicada.',
    item_technique: 'TÉCNICA GENERAL',
    desc_technique: 'Ergonomía, memoria muscular y relajación.',
    item_indep_tech: 'TÉCNICAS INDEPENDIENTES',
    desc_indep_tech: 'Picking, Legato, Tapping, Hybrid.',
    item_styles: 'ESTILOS',
    desc_styles: 'Jazz, Rock, Metal, Funk, Fusion.',
    item_improv: 'IMPROVISACIÓN',
    desc_improv: 'Libertad expresiva en tiempo real.',
    item_comp: 'COMPOSICIÓN',
    desc_comp: 'Creación de obras y formas musicales.',
    item_prod: 'PRODUCCIÓN',
    desc_prod: 'Grabación, tono y gear.',
    item_study: 'MÉTODOS DE ESTUDIO',
    desc_study: 'Organización y disciplina efectiva.',
    item_box: '"OUT OF THE BOX"',
    desc_box: 'Pensamiento lateral creativo.',
    item_extras: 'EXTRAS',
    desc_extras: 'Music Business, Redes y Mindset.',

    // CLASES
    custom_classes: 'CLASES PERSONALIZADAS',
    click_open: 'VER PROGRAMAS',
    click_close: 'CERRAR PROGRAMAS',
    faq_title: 'PREGUNTAS FRECUENTES',
    plans_title: 'PLANES DE ESTUDIO',
    contact_me: 'Para agendar, escríbeme directamente.',
    contact_btn: 'CONTACTAR',
    popular: 'POPULAR',

    q1: '¿Cuál es mi filosofía al enseñar?',
    a1: 'La música es un viaje personal. Diseño un plan ÚNICO que se acomoda a tus necesidades, tiempo y metas.',
    q2: '¿Cómo funciona mi pedagogía?',
    a2: 'Sistemas de estudio diseñados por tema. Ideas que estimulan la creatividad y sonoridades propias.',
    q3: '¿Qué incluyen las clases?',
    a3: 'Sesión de 45 min, Email resumen, PDF, Método de estudio, Backing Tracks y Acceso a grupo semanal.',

    plan_monthly: 'Plan Mensual',
    price_monthly: '$200.000 COP',
    plan_intensive: 'Mes Intensivo',
    price_intensive: '$385.000 COP',
    plan_bimonthly: 'Plan Bi-Mensual',
    price_bimonthly: '$385.000 COP',
    plan_single: 'Clase Suelta',
    price_single: '$65.000 COP',
    
    features_monthly: ['1 Clase Semanal', 'Acceso a Grupo', 'Material PDF'],
    features_intensive: ['2 Clases Semanales', 'Seguimiento Diario', 'Todo Incluido'],
    features_bimonthly: ['Ahorro a largo plazo', 'Plan de 8 semanas', 'Soporte Continuo'],
    features_single: ['Diagnóstico', 'Tema Específico', 'Sin compromiso'],
  },
  EN: { 
    home: 'HOME', 
    music: 'MUSIC', 
    tour: 'TOUR', 
    store: 'STORE', 
    bio: 'BIO', 
    school: 'SCHOOL', 
    
    // UPDATED TEXTS
    copyright: '© 2026 Leonardo Guzman. All Rights Reserved.',
    developed_by: 'DEVELOPED BY',
    
    section_allies: 'PARTNERS & SPONSORS',
    latest_drops: 'LATEST DROPS',
    explore_store: 'EXPLORE FULL STORE',

    store_title: 'STORE & MERCH',
    store_subtitle: 'MUSIC, BOOKS & OFFICIAL MERCH',
    section_academy: 'ACADEMY & RESOURCES', 
    section_merch: 'OFFICIAL MERCH', 

    buy_now: 'BUY NOW',
    view_details: 'VIEW DETAILS',
    view_gallery: 'VIEW GALLERY',
    processing: 'PROCESSING...',
    sold_out: 'SOLD OUT',
    currency_label: 'USD',

    cat_essentials: 'Essentials',
    cat_physical: 'Physical',
    cat_creative: 'Creative',
    cat_more: 'More',

    item_visualization: 'VISUALIZATION',
    desc_visualization: 'Understanding the visual nature of the fretboard.',
    item_vocabulary: 'VOCABULARY',
    desc_vocabulary: 'Scales, arpeggios, and chords organized.',
    item_theory: 'THEORETICAL CONCEPTS',
    desc_theory: 'Applied Tonal & Modal Harmony.',
    item_technique: 'GENERAL TECHNIQUE',
    desc_technique: 'Ergonomics, muscle memory, and relaxation.',
    item_indep_tech: 'INDEPENDENT TECHNIQUES',
    desc_indep_tech: 'Picking, Legato, Tapping, Hybrid.',
    item_styles: 'STYLES',
    desc_styles: 'Jazz, Rock, Metal, Funk, Fusion.',
    item_improv: 'IMPROVISATION',
    desc_improv: 'Expressive freedom in real-time.',
    item_comp: 'COMPOSITION',
    desc_comp: 'Creation of musical works and forms.',
    item_prod: 'PRODUCTION',
    desc_prod: 'Recording, tone, and gear.',
    item_study: 'STUDY METHODS',
    desc_study: 'Effective organization and discipline.',
    item_box: '"OUT OF THE BOX"',
    desc_box: 'Creative lateral thinking.',
    item_extras: 'EXTRAS',
    desc_extras: 'Music Business, Social Media, and Mindset.',

    custom_classes: 'PERSONALIZED CLASSES',
    click_open: 'VIEW PROGRAMS',
    click_close: 'CLOSE PROGRAMS',
    faq_title: 'FREQUENTLY ASKED QUESTIONS',
    plans_title: 'STUDY PLANS',
    contact_me: 'To schedule, email me directly.',
    contact_btn: 'CONTACT',
    popular: 'POPULAR',

    q1: 'What is my teaching philosophy?',
    a1: 'Music is a personal journey. I design a UNIQUE plan that fits your needs, time, and goals.',
    q2: 'How does my pedagogy work?',
    a2: 'Study systems designed by topic. Ideas that stimulate creativity and your own sound.',
    q3: 'What do classes include?',
    a3: '45 min session, Summary email, PDF, Study method, Backing Tracks, and Weekly group access.',

    plan_monthly: 'Monthly Plan',
    price_monthly: '$50 USD',
    plan_intensive: 'Intensive Month',
    price_intensive: '$100 USD',
    plan_bimonthly: 'Bi-Monthly Plan',
    price_bimonthly: '$100 USD',
    plan_single: 'Single Class',
    price_single: '$30 USD',
    
    features_monthly: ['1 Weekly Class', 'Group Access', 'PDF Material'],
    features_intensive: ['2 Weekly Classes', 'Daily Follow-up', 'All Included'],
    features_bimonthly: ['Long-term savings', '8-week Plan', 'Continuous Support'],
    features_single: ['Diagnosis', 'Specific Topic', 'No commitment'],
  }
};

const LanguageContext = createContext<LanguageContextType>({ lang: 'ES', toggleLang: () => {}, t: () => '' });

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLang] = useState<Lang>('ES');
  const toggleLang = () => setLang(prev => (prev === 'ES' ? 'EN' : 'ES'));
  const t = (key: string) => (translations[lang] as any)[key] || key;
  return <LanguageContext.Provider value={{ lang, toggleLang, t }}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => useContext(LanguageContext);