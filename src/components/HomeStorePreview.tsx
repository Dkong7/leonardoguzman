import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import pb from '../lib/pocketbase';
import { useLanguage } from '../context/LanguageContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faGraduationCap, faShirt } from '@fortawesome/free-solid-svg-icons';

const HomeStorePreview = () => {
  const { t, lang } = useLanguage();
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    const fetchPreview = async () => {
      try {
        // 1. Buscamos ESTRICTAMENTE 1 item Académico
        const academic = await pb.collection('tienda').getList(1, 1, {
            filter: 'tipo = "academico"',
            sort: '-created'
        });

        // 2. Buscamos ESTRICTAMENTE 1 item Merch
        const merch = await pb.collection('tienda').getList(1, 1, {
            filter: 'tipo = "merch"',
            sort: '-created'
        });

        // 3. Combinamos los resultados (Si alguno está vacío, no se rompe)
        const rawItems = [...academic.items, ...merch.items];
        
        const mapped = rawItems.map((i: any) => ({
            ...i,
            imagen_url: i.imagen ? pb.files.getUrl(i, i.imagen) : '/placeholder.jpg',
            nombre_display: lang === 'EN' && i.nombre_en ? i.nombre_en : i.nombre,
        }));

        setItems(mapped);
      } catch (e) {
        console.error("Error preview tienda:", e);
      }
    };
    fetchPreview();
  }, [lang]);

  if (items.length === 0) return null;

  return (
    <section className="py-16 bg-black border-t border-nardo-900/30">
        <div className="max-w-5xl mx-auto px-4">
            {/* Header Sección */}
            <div className="flex justify-between items-end mb-10">
                <h3 className="text-3xl font-serif font-bold text-white tracking-tighter">{t('latest_drops')}</h3>
                <Link to="/tienda" className="hidden md:flex items-center gap-2 text-xs font-bold text-nardo-400 hover:text-white transition-colors uppercase tracking-widest">
                    {t('explore_store')} <FontAwesomeIcon icon={faArrowRight} />
                </Link>
            </div>

            {/* Grid 1 vs 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {items.map((item) => (
                    <Link to="/tienda" key={item.id} className={`group relative block h-80 overflow-hidden rounded-2xl border transition-all duration-500 ${item.tipo === 'academico' ? 'border-cyan-900 hover:border-cyan-500' : 'border-purple-900 hover:border-purple-500'}`}>
                        
                        {/* Imagen Fondo */}
                        <div className="absolute inset-0">
                            <img src={item.imagen_url} alt={item.nombre} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-50 group-hover:opacity-30" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
                        </div>

                        {/* Etiqueta Flotante */}
                        <div className="absolute top-4 right-4">
                             <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-2 ${item.tipo === 'academico' ? 'bg-cyan-500 text-black' : 'bg-purple-500 text-white'}`}>
                                <FontAwesomeIcon icon={item.tipo === 'academico' ? faGraduationCap : faShirt} />
                                {item.tipo === 'academico' ? 'Academy' : 'Merch'}
                            </span>
                        </div>

                        {/* Contenido Abajo */}
                        <div className="absolute bottom-0 left-0 p-8 w-full">
                            <h4 className={`text-2xl font-black text-white uppercase leading-none mb-2 transition-colors ${item.tipo === 'academico' ? 'group-hover:text-cyan-400' : 'group-hover:text-purple-400'}`}>
                                {item.nombre_display}
                            </h4>
                            <p className="text-gray-400 text-xs font-bold tracking-widest uppercase">
                                {t('view_details')} <FontAwesomeIcon icon={faArrowRight} className="ml-1"/>
                            </p>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Botón Móvil */}
            <div className="mt-10 text-center md:hidden">
                <Link to="/tienda" className="inline-flex items-center gap-2 text-xs font-bold text-nardo-400 hover:text-white transition-colors uppercase tracking-widest border border-nardo-900 px-8 py-3 rounded-full">
                    {t('explore_store')} <FontAwesomeIcon icon={faArrowRight} />
                </Link>
            </div>
        </div>
    </section>
  );
};

export default HomeStorePreview;