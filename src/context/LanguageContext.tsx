import { createContext, useContext, useState, type ReactNode } from 'react';

type Lang = 'ES' | 'EN';
interface LanguageContextType {
  lang: Lang;
  toggleLang: () => void;
  t: (key: string) => string;
}

const translations = {
  ES: { home: 'INICIO', music: 'MÚSICA', tour: 'CONCIERTOS', store: 'TIENDA', bio: 'BIO', school: 'ACADEMIA', buy: 'COMPRAR', private_lessons: 'CLASES PERSONALIZADAS', check_availability: 'VER DISPONIBILIDAD' },
  EN: { home: 'HOME', music: 'MUSIC', tour: 'TOUR', store: 'STORE', bio: 'BIO', school: 'SCHOOL', buy: 'BUY', private_lessons: 'PRIVATE LESSONS', check_availability: 'CHECK AVAILABILITY' }
};

const LanguageContext = createContext<LanguageContextType>({ lang: 'ES', toggleLang: () => {}, t: () => '' });

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLang] = useState<Lang>('ES');
  const toggleLang = () => setLang(prev => (prev === 'ES' ? 'EN' : 'ES'));
  const t = (key: string) => (translations[lang] as any)[key] || key;
  return <LanguageContext.Provider value={{ lang, toggleLang, t }}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => useContext(LanguageContext);