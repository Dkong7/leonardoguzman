import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEye, faComment, faBrain,
  faHands, faDumbbell, faLayerGroup,
  faClone, faGripVertical, faGem,
  faGraduationCap, faBoxOpen, faStar,
  faChevronDown, faChevronUp, faCheckCircle
} from '@fortawesome/free-solid-svg-icons';
import { useLanguage } from '../context/LanguageContext';

const ProgramasNeon = () => {
  const { t } = useLanguage();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => setOpenFaq(openFaq === index ? null : index);

  const colorThemes = {
    red: {
      text: 'text-red-500',
      hoverText: 'group-hover:text-red-400',
      border: 'border-red-500/20',
      shadow: 'rgba(239, 68, 68, 0.5)',
      bgNumber: 'text-red-500/20 group-hover:text-red-500/30'
    },
    green: {
      text: 'text-green-500',
      hoverText: 'group-hover:text-green-400',
      border: 'border-green-500/20',
      shadow: 'rgba(34, 197, 94, 0.5)',
      bgNumber: 'text-green-500/20 group-hover:text-green-500/30'
    },
    yellow: {
      text: 'text-yellow-500',
      hoverText: 'group-hover:text-yellow-400',
      border: 'border-yellow-500/20',
      shadow: 'rgba(234, 179, 8, 0.5)',
      bgNumber: 'text-yellow-500/20 group-hover:text-yellow-500/30'
    },
    pink: {
      text: 'text-pink-500',
      hoverText: 'group-hover:text-pink-400',
      border: 'border-pink-500/20',
      shadow: 'rgba(236, 72, 153, 0.5)',
      bgNumber: 'text-pink-500/20 group-hover:text-pink-500/30'
    }
  };

  const categories = [
    {
      name: t('cat_essentials'),
      theme: colorThemes.red,
      items: [
        { id: '1', title: t('item_visualization'), icon: faEye, desc: t('desc_visualization') },
        { id: '2', title: t('item_vocabulary'), icon: faComment, desc: t('desc_vocabulary') },
        { id: '3', title: t('item_theory'), icon: faBrain, desc: t('desc_theory') }
      ]
    },
    {
      name: t('cat_physical'),
      theme: colorThemes.green,
      items: [
        { id: '4', title: t('item_technique'), icon: faHands, desc: t('desc_technique') },
        { id: '5', title: t('item_indep_tech'), icon: faDumbbell, desc: t('desc_indep_tech') },
        { id: '6', title: t('item_styles'), icon: faLayerGroup, desc: t('desc_styles') }
      ]
    },
    {
      name: t('cat_creative'),
      theme: colorThemes.yellow,
      items: [
        { id: '7', title: t('item_improv'), icon: faClone, desc: t('desc_improv') },
        { id: '8', title: t('item_comp'), icon: faGripVertical, desc: t('desc_comp') },
        { id: '9', title: t('item_prod'), icon: faGem, desc: t('desc_prod') }
      ]
    },
    {
      name: t('cat_more'),
      theme: colorThemes.pink,
      items: [
        { id: '10', title: t('item_study'), icon: faGraduationCap, desc: t('desc_study') },
        { id: '11', title: t('item_box'), icon: faBoxOpen, desc: t('desc_box') },
        { id: '12', title: t('item_extras'), icon: faStar, desc: t('desc_extras') }
      ]
    }
  ];

  const faqs = [
    { q: t('q1'), a: t('a1') },
    { q: t('q2'), a: t('a2') },
    { q: t('q3'), a: t('a3') }
  ];

  // Precios dinámicos usando t()
  const plans = [
    { title: t('plan_monthly'), price: t('price_monthly'), features: (t('features_monthly') as unknown) as string[] },
    { title: t('plan_intensive'), price: t('price_intensive'), features: (t('features_intensive') as unknown) as string[], highlight: true },
    { title: t('plan_bimonthly'), price: t('price_bimonthly'), features: (t('features_bimonthly') as unknown) as string[] },
    { title: t('plan_single'), price: t('price_single'), features: (t('features_single') as unknown) as string[] },
  ];

  return (
    <div className="bg-black text-gray-200 font-sans relative overflow-hidden pb-20 pt-10 border-t border-nardo-900/50">

      {/* GRID DE CATEGORIAS */}
      <div className="max-w-7xl mx-auto px-4 relative z-10 mb-20">
        <div className="space-y-20">
          {categories.map((cat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              {/* Título Centrado y Agrandado */}
              <div className="text-center mb-8">
                <h3 className={`text-5xl font-serif italic ${cat.theme.text} border-b-2 ${cat.theme.border} pb-2 inline-block px-10 tracking-tighter`}>
                    {cat.name}
                </h3>
              </div>

              {/* Grid Compacto (gap-2 para juntar más los boxes) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 justify-center items-center">
                {cat.items.map((item) => (
                  <motion.div
                    key={item.id}
                    whileHover={{
                      y: -5,
                      boxShadow: `0 0 30px ${cat.theme.shadow}, 0 0 10px ${cat.theme.shadow} inset`
                    }}
                    className={`group relative bg-[#0f0a18] border ${cat.theme.border} rounded-xl p-4 overflow-hidden transition-all duration-300 mx-auto w-full max-w-[250px]`}
                  >
                    {/* Número de fondo: Esquina Superior Izquierda y más claro */}
                    <span className={`absolute top-2 left-3 text-6xl font-black ${cat.theme.bgNumber} transition-colors select-none leading-none`}>
                      {item.id}
                    </span>

                    {/* Ícono centrado (reducido margen superior) */}
                    <div className={`mt-6 mb-3 text-5xl ${cat.theme.text} group-hover:text-white transition-colors flex justify-center items-center h-16 relative z-10`}>
                      <motion.div
                        whileHover={{ scale: 1.15, rotate: [0, -5, 5, 0] }}
                        transition={{ duration: 0.4 }}
                      >
                        <FontAwesomeIcon icon={item.icon} />
                      </motion.div>
                    </div>

                    <h4 className={`text-lg font-black text-white uppercase mb-2 tracking-wide text-center ${cat.theme.hoverText} transition-colors relative z-10`}>
                      {item.title}
                    </h4>
                    
                    <p className="text-gray-400 text-xs relative z-10 leading-snug text-center font-medium bg-[#0f0a18]/80 backdrop-blur-sm rounded px-1">
                        {item.desc}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* FAQ SECTION */}
      <div className="max-w-4xl mx-auto px-4 mb-20">
        <h3 className="text-center text-3xl font-serif text-white mb-8">FAQ <span className="text-nardo-500">- {t('faq_title')}</span></h3>
        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div key={idx} className="border border-nardo-500/20 bg-[#0f0a18] rounded-lg overflow-hidden">
              <button
                onClick={() => toggleFaq(idx)}
                className="w-full flex justify-between items-center p-4 text-left hover:bg-white/5 transition-colors"
              >
                <span className="font-bold text-base text-purple-200">{faq.q}</span>
                <FontAwesomeIcon icon={openFaq === idx ? faChevronUp : faChevronDown} className="text-nardo-500" />
              </button>
              <AnimatePresence>
                {openFaq === idx && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 pt-0 text-gray-400 text-sm leading-relaxed border-t border-nardo-500/10">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>

      {/* PLANES */}
      <div className="max-w-7xl mx-auto px-4 text-center">
        <h3 className="text-3xl font-bold text-white mb-2">{t('plans_title')}</h3>
        <p className="text-gray-400 mb-8">{t('contact_me')}</p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {plans.map((plan, i) => (
            <div key={i} className={`relative p-4 rounded-xl border ${plan.highlight ? 'border-nardo-500 bg-nardo-900/20 scale-105 shadow-[0_0_30px_rgba(168,85,247,0.3)]' : 'border-gray-800 bg-[#0f0a18]'} flex flex-col transition-all duration-300 hover:border-nardo-400`}>
              {plan.highlight && <span className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-nardo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">{t('popular')}</span>}
              <h4 className="text-lg font-bold text-white mb-1">{plan.title}</h4>
              <div className="mb-3">
                <div className="text-xl font-black text-nardo-400">{plan.price}</div>
              </div>
              <ul className="text-xs text-gray-300 space-y-2 mb-4 flex-grow">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-2 justify-center">
                    <FontAwesomeIcon icon={faCheckCircle} className="text-nardo-500 text-[10px]" /> {f}
                  </li>
                ))}
              </ul>
              <a
                href="mailto:leguzman.clases@gmail.com"
                className={`w-full py-2 rounded font-bold text-xs uppercase transition-all shadow-md hover:shadow-lg ${plan.highlight ? 'bg-nardo-600 hover:bg-nardo-500 text-white hover:shadow-nardo-500/50' : 'border border-gray-600 hover:border-nardo-400 text-gray-300 hover:text-white hover:bg-nardo-900/30'}`}
              >
                {t('contact_btn')}
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProgramasNeon;