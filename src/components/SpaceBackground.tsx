import { useEffect, useState, useMemo, useRef } from 'react';

const SpaceBackground = () => {
  const [isActive, setIsActive] = useState(false);
  const gargantuaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEstado = (e: any) => setIsActive(e.detail);
    window.addEventListener('estadoMusica', handleEstado);
    return () => window.removeEventListener('estadoMusica', handleEstado);
  }, []);

  useEffect(() => {
    const handleReact = (e: any) => {
      if (gargantuaRef.current) {
        const bass = e.detail; 
        const scale = 1 + (bass / 255) * 0.15;
        const glow = 10 + (bass / 255) * 40;
        const opacity = 0.7 + (bass / 255) * 0.3;
        
        gargantuaRef.current.style.setProperty('--react-scale', scale.toString());
        gargantuaRef.current.style.setProperty('--react-glow', `${glow}px`);
        gargantuaRef.current.style.setProperty('--react-opacity', opacity.toString());
      }
    };
    window.addEventListener('audioReact', handleReact);
    return () => window.removeEventListener('audioReact', handleReact);
  }, []);

  const generateStaticStars = (count: number, size: number) => {
    return Array.from({ length: count }).map((_, i) => ({
      id: `star-${size}-${i}`,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      animationDelay: `${Math.random() * 5}s`,
      animationDuration: `${Math.random() * 3 + 2}s`,
    }));
  };

  const smallStars = useMemo(() => generateStaticStars(200, 1), []);
  const mediumStars = useMemo(() => generateStaticStars(80, 2), []);
  const largeStars = useMemo(() => generateStaticStars(30, 3), []);

  const shootingStars = useMemo(() => {
    return Array.from({ length: 8 }).map((_, i) => ({
      id: `shooter-${i}`,
      top: `${Math.random() * -30}%`, 
      right: `${Math.random() * -30}%`,
      animationDelay: `${Math.random() * 20}s`,
      animationDuration: `${Math.random() * 25 + 20}s`, 
      scale: Math.random() * 0.5 + 0.5,
    }));
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full z-[-1] overflow-hidden pointer-events-none transition-colors duration-700 space-master-bg">
      
      <style>{`
        /* =======================================================
           SISTEMA MAESTRO DE VARIABLES CSS (THEME SWITCHER)
           ======================================================= */
        :root {
          /* TEMA MORADO / ESPACIO PROFUNDO (POR DEFECTO) */
          --bg-main: #0a001a;
          
          --star-base: #ffffff;
          --star-glow-1: rgba(255,255,255,0.8);
          --star-glow-2: #d946ef;
          
          --shooter-head: #ffffff;
          --shooter-tail-1: rgba(255,255,255,1);
          --shooter-tail-2: rgba(217,70,239,0.8);
          
          --nebula-op: 0.6;
          --nebula-inv: 0;
          
          --g-core: #000000;
          --g-halo: rgba(255, 180, 100, var(--react-opacity, 0.8));
          --g-disk-1: rgba(255, 200, 120, 0.9);
          --g-disk-2: rgba(220, 80, 30, 0.6);
          --g-lensing: rgba(255, 190, 100, 0.8);
          --g-blend: screen;
        }

        html.tema-oscuro {
          /* TEMA ESTILO GROK (GRIS CLARO CON ELEMENTOS OSCUROS) */
          --bg-main: #e5e7eb; 
          
          --star-base: #111827; 
          --star-glow-1: rgba(0,0,0,0.6);
          --star-glow-2: rgba(0,0,0,0.2);
          
          --shooter-head: #000000;
          --shooter-tail-1: rgba(0,0,0,0.8);
          --shooter-tail-2: rgba(0,0,0,0.1);
          
          --nebula-op: 0.15;
          --nebula-inv: 1; 
          
          --g-core: #000000;
          --g-halo: rgba(0, 0, 0, var(--react-opacity, 0.5));
          --g-disk-1: rgba(0, 0, 0, 0.8);
          --g-disk-2: rgba(30, 30, 30, 0.4);
          --g-lensing: rgba(0, 0, 0, 0.7);
          --g-blend: multiply; 
        }

        .space-master-bg {
          background-color: var(--bg-main);
        }

        /* =======================================================
           ANIMACIONES DEL ESPACIO (REACTIVAS A VARIABLES)
           ======================================================= */
        .space-nebula {
          position: absolute; inset: -50%;
          background: radial-gradient(ellipse at 30% 40%, rgba(138, 43, 226, 0.15) 0%, transparent 60%), radial-gradient(ellipse at 70% 60%, rgba(217, 70, 239, 0.1) 0%, transparent 50%), radial-gradient(circle at 50% 50%, rgba(76, 29, 149, 0.1) 0%, transparent 70%);
          filter: invert(var(--nebula-inv)) grayscale(calc(var(--nebula-inv) * 100%)) blur(30px);
          animation: nebula-drift 40s infinite alternate ease-in-out;
          opacity: var(--nebula-op);
          transition: filter 0.7s, opacity 0.7s;
        }
        @keyframes nebula-drift { 0% { transform: translate(0, 0) rotate(0deg); } 100% { transform: translate(-5%, -5%) rotate(2deg); } }

        .star-static { 
          position: absolute; 
          background-color: var(--star-base); 
          border-radius: 50%; 
          animation: twinkle infinite ease-in-out; 
          transition: background-color 0.7s;
        }
        @keyframes twinkle { 
          0%, 100% { opacity: 0.3; transform: scale(0.8); box-shadow: none; } 
          50% { opacity: 1; transform: scale(1.2); box-shadow: 0 0 4px var(--star-glow-1), 0 0 8px var(--star-glow-2); } 
        }

        .shooting-star-container { position: absolute; transform: rotate(-45deg); opacity: 0; animation: shoot-across linear infinite; }
        .shooting-star-tail { position: absolute; top: 0; right: 0; width: 300px; height: 1px; background: linear-gradient(to left, var(--shooter-tail-1) 0%, var(--shooter-tail-2) 20%, transparent 100%); }
        .shooting-star-head { position: absolute; top: 50%; right: 0; transform: translateY(-50%); width: 4px; height: 4px; background: var(--shooter-head); border-radius: 50%; box-shadow: 0 0 10px var(--star-glow-1), 0 0 20px var(--star-glow-2); z-index: 2; }
        @keyframes shoot-across { 0% { transform: translate(0, 0) rotate(-45deg) scale(var(--scale, 1)); opacity: 0; } 1% { opacity: 1; } 8% { transform: translate(-150vmax, 150vmax) rotate(-45deg) scale(var(--scale, 1)); opacity: 0; } 100% { transform: translate(-150vmax, 150vmax) rotate(-45deg) scale(var(--scale, 1)); opacity: 0; } }

        /* =======================================================
           GARGANTUA - ESQUINA INFERIOR DERECHA Y ROTADO 45 GRADOS
           ======================================================= */
        .gargantua-wrapper {
          position: absolute; 
          top: 65%; left: 88%; 
          transform: translate(-50%, -50%) rotate(45deg) scale(calc(var(--react-scale, 1) * var(--base-scale, 0)));
          transition: transform 0.1s ease-out, opacity 2s ease-in-out;
          opacity: 0;
          z-index: 5;
          mix-blend-mode: var(--g-blend);
        }
        @media (max-width: 768px) { .gargantua-wrapper { top: 60%; left: 80%; } }
        .gargantua-wrapper.active { --base-scale: 1; opacity: 1; }
        
        .gargantua-core { position: absolute; top: 50%; left: 50%; width: 280px; height: 280px; margin: -140px 0 0 -140px; background: var(--g-core); border-radius: 50%; box-shadow: inset 0 0 20px rgba(0,0,0,1), 0 0 calc(10px + var(--react-glow, 0px)) 2px var(--g-halo); z-index: 10; }
        .gargantua-disk-back { position: absolute; top: 50%; left: 50%; width: 900px; height: 220px; margin: -110px 0 0 -450px; background: radial-gradient(ellipse at center, transparent 32%, var(--g-disk-1) 35%, var(--g-disk-2) 55%, transparent 70%); border-radius: 50%; transform: rotate(-10deg); filter: blur(calc(4px + var(--react-glow, 0px) * 0.1)); opacity: var(--react-opacity, 0.8); z-index: 5; animation: disk-spin 15s linear infinite; }
        .gargantua-disk-front { position: absolute; top: 50%; left: 50%; width: 900px; height: 220px; margin: -110px 0 0 -450px; background: radial-gradient(ellipse at center, transparent 32%, var(--g-disk-1) 36%, var(--g-disk-2) 55%, transparent 70%); border-radius: 50%; transform: rotate(-10deg); filter: blur(calc(3px + var(--react-glow, 0px) * 0.1)); opacity: var(--react-opacity, 0.8); z-index: 15; clip-path: polygon(0 50%, 100% 50%, 100% 100%, 0 100%); animation: disk-spin 15s linear infinite; }
        .gargantua-lensing-top { position: absolute; top: 50%; left: 50%; width: 360px; height: 360px; margin: -230px 0 0 -180px; border-radius: 50%; border-top: 50px solid var(--g-lensing); border-left: 20px solid transparent; border-right: 20px solid transparent; border-bottom: 0px solid transparent; transform: rotate(-10deg); filter: blur(calc(12px + var(--react-glow, 0px) * 0.2)); opacity: var(--react-opacity, 0.8); z-index: 2; }
        .gargantua-lensing-bottom { position: absolute; top: 50%; left: 50%; width: 340px; height: 340px; margin: -110px 0 0 -170px; border-radius: 50%; border-bottom: 30px solid var(--g-lensing); border-left: 10px solid transparent; border-right: 10px solid transparent; border-top: 0px solid transparent; transform: rotate(-10deg); filter: blur(calc(15px + var(--react-glow, 0px) * 0.2)); opacity: calc(var(--react-opacity, 0.8) - 0.2); z-index: 2; }
        @keyframes disk-spin { 0% { transform: rotate(-10deg) scale(1); } 50% { transform: rotate(-10deg) scale(1.02); } 100% { transform: rotate(-10deg) scale(1); } }

        /* =======================================================
           REGLAS DE TEMA OSCURO PARA EL REPRODUCTOR EN EL DOM
           ======================================================= */
        html.tema-oscuro .bloque-marco img { filter: grayscale(100%) brightness(0.4) contrast(1.2) !important; opacity: 0.85 !important; }
        html.tema-oscuro .player-bg-inner { background: rgba(230, 230, 230, 0.4) !important; border: 1px solid rgba(0,0,0,0.1) !important; box-shadow: inset 2px 2px 10px rgba(255,255,255,0.5), 0 15px 40px rgba(0,0,0,0.1) !important; backdrop-filter: blur(20px) !important; }
        html.tema-oscuro .texto-titulo { color: #111 !important; text-shadow: none !important;}
        html.tema-oscuro .texto-artista { color: #444 !important; }
        html.tema-oscuro .texto-tiempo { color: #666 !important; }
        html.tema-oscuro .iconos-dsp a { color: #666 !important; }
        html.tema-oscuro .iconos-dsp a:hover { color: #000 !important; }
        html.tema-oscuro .botones-control button { color: #444 !important; }
        html.tema-oscuro .botones-control button:hover { color: #000 !important; }
        html.tema-oscuro .botones-control .bg-white { background-color: #111 !important; color: #fff !important; box-shadow: 4px 4px 15px rgba(0,0,0,0.2), -2px -2px 10px rgba(255,255,255,0.8) !important; }
        html.tema-oscuro .bloque-playlist { background: rgba(255,255,255,0.7) !important; border-color: rgba(0,0,0,0.1) !important; }
        html.tema-oscuro .playlist-item-title { color: #111 !important; }
        html.tema-oscuro .playlist-item-artist { color: #555 !important; }
        html.tema-oscuro .playlist-item-active { background: rgba(0,0,0,0.05) !important; border-color: rgba(0,0,0,0.1) !important; }
      `}</style>

      <div className="space-nebula"></div>
      
      <div ref={gargantuaRef} className={`gargantua-wrapper ${isActive ? 'active' : ''}`}>
        <div className="gargantua-disk-back"></div>
        <div className="gargantua-lensing-top"></div>
        <div className="gargantua-lensing-bottom"></div>
        <div className="gargantua-core"></div>
        <div className="gargantua-disk-front"></div>
      </div>

      {smallStars.map(star => (<div key={star.id} className="star-static w-[1px] h-[1px]" style={{ left: star.left, top: star.top, animationDelay: star.animationDelay, animationDuration: star.animationDuration }} />))}
      {mediumStars.map(star => (<div key={star.id} className="star-static w-[2px] h-[2px]" style={{ left: star.left, top: star.top, animationDelay: star.animationDelay, animationDuration: star.animationDuration }} />))}
      {largeStars.map(star => (<div key={star.id} className="star-static w-[3px] h-[3px]" style={{ left: star.left, top: star.top, animationDelay: star.animationDelay, animationDuration: star.animationDuration }} />))}
      
      {shootingStars.map(shooter => (
        <div key={shooter.id} className="shooting-star-container" style={{ top: shooter.top, right: shooter.right, animationDelay: shooter.animationDelay, animationDuration: shooter.animationDuration, '--scale': shooter.scale } as React.CSSProperties}>
           <div className="shooting-star-tail"></div><div className="shooting-star-head"></div>
        </div>
      ))}
    </div>
  );
};

export default SpaceBackground;