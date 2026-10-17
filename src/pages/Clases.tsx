import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faVideo, faHeart, faCheckCircle, faBookOpen, faUser, 
    faEnvelope, faDownload, faGraduationCap, faStore, faArrowLeft, faGlobe
} from '@fortawesome/free-solid-svg-icons';
import { faWhatsapp, faInstagram, faFacebook } from '@fortawesome/free-brands-svg-icons';
import { useLanguage } from '../context/LanguageContext';

const Clases = () => {
    const { t, lang, setLang } = useLanguage();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const toggleLang = () => setLang(lang === 'ES' ? 'EN' : 'ES');

    return (
        <div className="min-h-screen bg-black text-gray-300 font-sans selection:bg-purple-200 relative overflow-x-hidden">
            
            {/* --- FONDO ANIMADO SUTIL --- */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-zinc-800/40 rounded-full blur-[100px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[30vw] h-[30vw] bg-zinc-900/40 rounded-full blur-[100px] animate-pulse delay-700"></div>
            </div>

            {/* =========================================================================
                NAVBAR DEL DOJO
            ========================================================================= */}
            <nav className="absolute top-0 left-0 w-full px-6 py-8 flex justify-between items-center z-50 max-w-7xl mx-auto right-0">
                <div className="flex items-center gap-4">
                    {!(window.location.port === '8094' || window.location.hostname.includes('escuelaitinerantedelamusica')) && (
                        <Link to="/" className="group relative flex items-center justify-center w-10 h-10 bg-zinc-900/80 backdrop-blur-md rounded-xl shadow-sm border border-purple-100 hover:scale-110 transition-all">
                            <FontAwesomeIcon icon={faArrowLeft} className="text-zinc-400 text-sm" />
                        </Link>
                    )}
                    <img src="/eim-logo.png" alt="EIM - Escuela Itinerante de la Música" className="h-16 md:h-20 drop-shadow-sm" />
                </div>
                
                <div className="flex items-center gap-4 md:gap-6">
                    <button 
                        onClick={toggleLang} 
                        className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-zinc-400 transition-colors uppercase tracking-widest px-3 py-2 rounded-full border border-gray-100 bg-zinc-900/80 backdrop-blur-md shadow-sm"
                    >
                        <FontAwesomeIcon icon={faGlobe} />
                        {lang}
                    </button>

                    <Link to="/clases/material" className="hidden md:flex items-center gap-2 text-[10px] font-black text-zinc-300 hover:text-zinc-400 uppercase tracking-[0.2em] transition-colors">
                        <FontAwesomeIcon icon={faStore} className="text-lg" />
                        <span>{t('view_material')}</span>
                    </Link>
                    <Link to="/guitarTracker" className="flex items-center gap-2 text-[10px] font-black text-cyan-300 hover:text-white uppercase tracking-[0.18em] px-3.5 py-2 rounded-full border border-cyan-500/40 bg-cyan-950/40 transition-all">
                        <FontAwesomeIcon icon={faVideo} className="text-cyan-400" />
                        <span>GuitarTracker AR</span>
                    </Link>

                    <Link to="/login" className="group flex items-center gap-3 px-6 py-2.5 bg-[#1a0b2e] border border-purple-900/50 rounded-full shadow-xl shadow-purple-900/20 hover:bg-[#2d1b4e] transition-all">
                        <div className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </div>
                        <span className="text-[10px] font-black text-purple-100 uppercase tracking-[0.15em] hidden sm:inline">{t('school')} Virtual</span>
                        <FontAwesomeIcon icon={faUser} className="text-purple-400 group-hover:text-white transition-colors" />
                    </Link>
                </div>
            </nav>

            {/* --- HERO DOJO --- */}
            <header className="relative pt-48 md:pt-60 pb-20 md:pb-32 px-6 z-10">
                <div className="max-w-4xl mx-auto text-center">
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        transition={{ duration: 0.8 }}
                        className="mb-10"
                    >
                        <img src="/eim-logo.png" alt="EIM" className="h-28 md:h-48 mx-auto drop-shadow-[0_10px_20px_rgba(168,85,247,0.2)]" />
                    </motion.div>

                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-900 text-white text-[10px] font-black tracking-[0.3em] uppercase mb-8 border border-purple-100 shadow-sm">
                        <FontAwesomeIcon icon={faGraduationCap} /> {t('pro_training')}
                    </div>
                    
                    <h1 className="text-4xl md:text-7xl font-serif text-white mb-8 tracking-tight leading-[1.1]">
                        {lang === 'EN' ? (
                            <>THE <span className="text-purple-500 relative">PATH<svg className="absolute w-full h-3 -bottom-1 left-0 text-purple-900/50 -z-10" viewBox="0 0 100 10" preserveAspectRatio="none"><path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" /></svg></span> OF SOUND.</>
                        ) : (
                            <>EL CAMINO DEL <span className="text-purple-500 relative">SONIDO<svg className="absolute w-full h-3 -bottom-1 left-0 text-purple-900/50 -z-10" viewBox="0 0 100 10" preserveAspectRatio="none"><path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" /></svg></span>.</>
                        )}
                    </h1>
                    
                    <p className="text-lg md:text-2xl text-zinc-300 font-light mb-12 leading-relaxed max-w-2xl mx-auto">
                        {t('dojo_subtitle')}
                    </p>
                    
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <Link to="/clases/material" className="px-8 py-4 bg-transparent text-white border border-white/50 hover:bg-white hover:text-black hover:border-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3">
                            <FontAwesomeIcon icon={faBookOpen} /> {t('view_material')}
                        </Link>
                        <button onClick={() => document.getElementById('planes')?.scrollIntoView({ behavior: 'smooth' })} className="px-8 py-4 bg-purple-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-purple-600/30 hover:bg-purple-500 transition-all">
                            {t('view_plans')}
                        </button>
                        <Link to="/guitarTracker" className="px-8 py-4 bg-cyan-500 text-black hover:bg-cyan-400 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-cyan-500/30 transition-all flex items-center justify-center gap-3">
                            <FontAwesomeIcon icon={faVideo} /> GuitarTracker AR + VST
                        </Link>
                    </div>
                </div>
            </header>

            {/* --- INVERSIÓN (PLANES LIMPIOS) --- */}
            <section id="planes" className="py-24 bg-gradient-to-b from-[#f3f0f9] to-white relative z-10">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-serif text-purple-900 mb-4">{t('study_plans')}</h2>
                        <p className="text-zinc-300 text-lg">{t('investment_desc')}</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                        
                        {/* PLAN 1 */}
                        <div className="bg-zinc-900 p-8 rounded-[2rem] border border-gray-100 shadow-xl hover:shadow-2xl transition-all relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-full h-2 bg-gray-200 group-hover:bg-purple-400 transition-colors"></div>
                            <h3 className="text-2xl font-serif text-white mb-2">{t('plan_initiation')}</h3>
                            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-8 bg-purple-50 inline-block px-3 py-1 rounded-full">{t('first_month')}</p>
                            
                            <div className="mb-8 border-b border-zinc-800 pb-8">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-bold text-white tracking-tight">$320.000</span>
                                    <span className="text-xs text-gray-400 font-bold">COP</span>
                                </div>
                                <div className="flex items-baseline gap-1 mt-1 text-zinc-300">
                                    <span className="text-xl font-medium">$80</span>
                                    <span className="text-xs font-bold">USD</span>
                                </div>
                            </div>

                            <ul className="space-y-4 text-sm text-gray-400">
                                <li className="flex gap-3 items-center"><FontAwesomeIcon icon={faCheckCircle} className="text-purple-300" /> {t('feat_4classes')}</li>
                                <li className="flex gap-3 items-center"><FontAwesomeIcon icon={faBookOpen} className="text-zinc-400" /> <strong>{t('feat_3books')}</strong></li>
                                <li className="flex gap-3 items-center"><FontAwesomeIcon icon={faVideo} className="text-purple-300" /> {t('feat_recordings')}</li>
                            </ul>
                        </div>

                        {/* PLAN 2 (DESTACADO) */}
                        <div className="bg-[#2d1b4e] text-white p-10 rounded-[2.5rem] shadow-2xl shadow-purple-900/40 transform md:scale-110 relative z-10 border border-purple-500/30">
                            <div className="absolute top-6 right-6">
                                <FontAwesomeIcon icon={faHeart} className="text-pink-400 text-2xl animate-pulse" />
                            </div>
                            <h3 className="text-3xl font-serif mb-2">{t('plan_continuity')}</h3>
                            <p className="text-[10px] text-purple-200 font-bold uppercase tracking-widest mb-8 bg-zinc-900/10 inline-block px-3 py-1 rounded-full backdrop-blur-sm">{t('old_students')}</p>
                            
                            <div className="mb-8 border-b border-white/10 pb-8 relative z-10">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl font-bold text-white tracking-tight">$250.000</span>
                                    <span className="text-xs text-purple-300 font-bold">COP</span>
                                </div>
                                <div className="flex items-baseline gap-2 mt-2 text-purple-200">
                                    <span className="text-2xl font-medium">$60</span>
                                    <span className="text-xs font-bold">USD</span>
                                </div>
                            </div>

                            <ul className="space-y-4 text-sm text-purple-100 relative z-10">
                                <li className="flex gap-3 items-center"><FontAwesomeIcon icon={faCheckCircle} className="text-green-400" /> {t('feat_preferential')}</li>
                                <li className="flex gap-3 items-center"><FontAwesomeIcon icon={faEnvelope} className="text-green-400" /> {t('feat_email_support')}</li>
                                <li className="flex gap-3 items-center"><FontAwesomeIcon icon={faDownload} className="text-green-400" /> {t('feat_bonus')}</li>
                            </ul>
                        </div>

                        {/* PLAN 3 */}
                        <div className="bg-zinc-900 p-8 rounded-[2rem] border border-gray-100 shadow-xl hover:shadow-2xl transition-all relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-full h-2 bg-gray-200 group-hover:bg-purple-400 transition-colors"></div>
                            <h3 className="text-2xl font-serif text-white mb-2">{t('plan_bimonthly')}</h3>
                            <p className="text-[10px] text-purple-500 font-bold uppercase tracking-widest mb-8 bg-purple-50 inline-block px-3 py-1 rounded-full">{t('smart_saving')}</p>
                            
                            <div className="mb-8 border-b border-zinc-800 pb-8">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-bold text-white tracking-tight">$460.000</span>
                                    <span className="text-xs text-gray-400 font-bold">COP</span>
                                </div>
                                <div className="flex items-baseline gap-1 mt-1 text-zinc-300">
                                    <span className="text-xl font-medium">$110</span>
                                    <span className="text-xs font-bold">USD</span>
                                </div>
                            </div>

                            <ul className="space-y-4 text-sm text-gray-400">
                                <li className="flex gap-3 items-center"><FontAwesomeIcon icon={faCheckCircle} className="text-purple-300" /> {t('feat_8classes')}</li>
                                <li className="flex gap-3 items-center"><FontAwesomeIcon icon={faCheckCircle} className="text-purple-300" /> {t('feat_fixed_schedule')}</li>
                                <li className="flex gap-3 items-center"><FontAwesomeIcon icon={faCheckCircle} className="text-zinc-400" /> {t('feat_discount')}</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- FOOTER FINAL --- */}
            <footer className="bg-[#1a0b2e] text-white py-32 text-center px-6 relative overflow-hidden mt-10">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10"></div>
                <div className="max-w-3xl mx-auto relative z-10">
                    <h2 className="text-4xl md:text-5xl font-serif mb-8 text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-white">{t('footer_dojo_title')}</h2>
                    <p className="text-purple-200/60 mb-12 leading-relaxed font-light text-xl italic">
                        {t('footer_dojo_desc')}
                    </p>
                    
                    <div className="inline-block border-t border-purple-800/50 pt-10">
                        <p className="font-bold tracking-[0.3em] uppercase text-xs mb-4 text-purple-400">{t('see_you')}</p>
                        <img src="/logo-nardo.svg" alt="Leonardo Guzman" className="h-12 mx-auto brightness-0 invert opacity-80" />
                    </div>

                    <div className="mt-16 flex justify-center gap-8 text-purple-400/50">
                        <FontAwesomeIcon icon={faInstagram} className="text-2xl hover:text-white transition-colors cursor-pointer hover:scale-110" />
                        <FontAwesomeIcon icon={faFacebook} className="text-2xl hover:text-white transition-colors cursor-pointer hover:scale-110" />
                        <FontAwesomeIcon icon={faWhatsapp} className="text-2xl hover:text-white transition-colors cursor-pointer hover:scale-110" />
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Clases;
