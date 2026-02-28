import { useEffect, useState, useMemo, useRef } from 'react';

const SpaceBackground = () => {
  const [isActive, setIsActive] = useState(false);
  const gargantuaRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const handleEstado = (e: any) => setIsActive(e.detail);
    window.addEventListener('estadoMusica', handleEstado);
    return () => window.removeEventListener('estadoMusica', handleEstado);
  }, []);

  useEffect(() => {
    const handleReact = (e: any) => {
      if (!gargantuaRef.current) return;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      rafRef.current = requestAnimationFrame(() => {
        const bass = e.detail; 
        const scale = 1 + (bass * 0.0006); 
        const glow = 10 + (bass * 0.15);   
        const opacity = 0.7 + (bass * 0.0012); 
        
        if (gargantuaRef.current) {
            gargantuaRef.current.style.setProperty('--react-scale', scale.toString());
            gargantuaRef.current.style.setProperty('--react-glow', `${glow}px`);
            gargantuaRef.current.style.setProperty('--react-opacity', opacity.toString());
        }
      });
    };
    window.addEventListener('audioReact', handleReact);
    return () => {
        window.removeEventListener('audioReact', handleReact);
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const generateStarBoxShadow = (count: number) => {
    let shadow = "";
    for (let i = 0; i < count; i++) {
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      shadow += `${x}vw ${y}vh #FFF, `;
    }
    return shadow.slice(0, -2); 
  };

  const starsSmall = useMemo(() => generateStarBoxShadow(200), []);
  const starsMedium = useMemo(() => generateStarBoxShadow(80), []);
  const starsLarge = useMemo(() => generateStarBoxShadow(30), []);

  const shootingStars = useMemo(() => {
    return Array.from({ length: 6 }).map((_, i) => ({ 
      id: `shooter-${i}`,
      top: Math.random() * 60 - 20, 
      right: Math.random() * 40 - 10, 
      animationDelay: `${Math.random() * 15}s`,
      animationDuration: `${Math.random() * 10 + 15}s`, 
      scale: Math.random() * 0.5 + 0.5,
    }));
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full z-[-1] overflow-hidden pointer-events-none transition-colors duration-700 space-master-bg">
      
      <style>{`
        :root {
          /* TEMA MORADO PROFUNDO */
          --bg-main: #05000a; /* <--- MUCHO MÁS OSCURO PARA VER ESTRELLAS */
          --star-base: #ffffff;
          --star-glow-1: rgba(255,255,255,0.8);
          --shooter-head: #ffffff;
          --shooter-tail-1: rgba(255,255,255,1);
          --shooter-tail-2: rgba(217,70,239,0.8);
          --nebula-op: 0.5; /* <--- REDUCIDO PARA NO TAPAR */
          --nebula-inv: 0;
          
          /* GARGANTUA VARS */
          --g-core: #000000;
          --g-halo: rgba(255, 180, 100, var(--react-opacity, 0.8));
          --g-disk-1: rgba(255, 200, 120, 0.9);
          --g-disk-2: rgba(220, 80, 30, 0.6);
          --g-lensing: rgba(255, 190, 100, 0.8);
          --g-blend: screen;
        }

        html.tema-oscuro {
          /* TEMA GROK */
          --bg-main: #e5e7eb; 
          --star-base: #111827; 
          --star-glow-1: rgba(0,0,0,0.6);
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

        .space-master-bg { background-color: var(--bg-main); will-change: background-color; }

        .space-nebula {
          position: absolute; inset: -50%;
          background: radial-gradient(ellipse at 30% 40%, rgba(138, 43, 226, 0.15) 0%, transparent 60%), radial-gradient(ellipse at 70% 60%, rgba(217, 70, 239, 0.1) 0%, transparent 50%), radial-gradient(circle at 50% 50%, rgba(76, 29, 149, 0.1) 0%, transparent 70%);
          filter: invert(var(--nebula-inv)) grayscale(calc(var(--nebula-inv) * 100%)) blur(30px);
          opacity: var(--nebula-op);
          transition: filter 0.7s, opacity 0.7s;
          will-change: transform; 
          animation: nebula-drift 60s infinite alternate ease-in-out; 
        }
        @keyframes nebula-drift { 0% { transform: translate(0, 0) rotate(0deg); } 100% { transform: translate(-2%, -2%) rotate(2deg); } }

        .star-layer {
            position: absolute; top: 0; left: 0; right: 0; bottom: 0;
            background: transparent;
            border-radius: 50%;
            animation: twinkle 4s infinite ease-in-out;
        }
        .stars-s { width: 1px; height: 1px; color: var(--star-base); animation-duration: 3s; }
        .stars-m { width: 2px; height: 2px; color: var(--star-base); animation-duration: 5s; animation-delay: 1s; }
        .stars-l { width: 3px; height: 3px; color: var(--star-base); animation-duration: 7s; animation-delay: 2s; }

        @keyframes twinkle { 
          0%, 100% { opacity: 0.4; } 
          50% { opacity: 1; } 
        }

        .shooting-star-container { 
            position: absolute; 
            transform: rotate(-45deg) translateX(0); 
            opacity: 0; 
            animation: shoot-across linear infinite; 
            will-change: transform, opacity;
        }
        .shooting-star-tail { position: absolute; top: 0; right: 0; width: 250px; height: 1px; background: linear-gradient(to left, var(--shooter-tail-1) 0%, var(--shooter-tail-2) 20%, transparent 100%); }
        .shooting-star-head { position: absolute; top: 50%; right: 0; transform: translateY(-50%); width: 3px; height: 3px; background: var(--shooter-head); border-radius: 50%; box-shadow: 0 0 10px var(--star-glow-1); z-index: 2; }
        
        @keyframes shoot-across { 
            0% { transform: rotate(-45deg) translate3d(0, 0, 0) scale(var(--scale, 1)); opacity: 0; } 
            1% { opacity: 1; } 
            15% { transform: rotate(-45deg) translate3d(-100vmax, 0, 0) scale(var(--scale, 1)); opacity: 0; } 
            100% { transform: rotate(-45deg) translate3d(-100vmax, 0, 0) scale(var(--scale, 1)); opacity: 0; } 
        }

        .gargantua-wrapper {
          position: absolute; top: 50%; left: 75%; 
          transform: translate(-50%, -50%) rotate(45deg) scale(calc(var(--react-scale, 1) * var(--base-scale, 0)));
          transition: transform 0.1s ease-out, opacity 2s ease-in-out;
          opacity: 0; z-index: 5; mix-blend-mode: var(--g-blend);
          will-change: transform, filter; 
        }
        @media (max-width: 1024px) { .gargantua-wrapper { top: 70%; left: 50%; } }
        .gargantua-wrapper.active { --base-scale: 1.2; opacity: 1; }
        
        .gargantua-core { position: absolute; top: 50%; left: 50%; width: 280px; height: 280px; margin: -140px 0 0 -140px; background: var(--g-core); border-radius: 50%; box-shadow: inset 0 0 20px rgba(0,0,0,1), 0 0 calc(10px + var(--react-glow, 0px)) 2px var(--g-halo); z-index: 10; }
        .gargantua-disk-back { position: absolute; top: 50%; left: 50%; width: 900px; height: 220px; margin: -110px 0 0 -450px; background: radial-gradient(ellipse at center, transparent 32%, var(--g-disk-1) 35%, var(--g-disk-2) 55%, transparent 70%); border-radius: 50%; transform: rotate(-10deg); filter: blur(calc(4px + var(--react-glow, 0px) * 0.1)); opacity: var(--react-opacity, 0.8); z-index: 5; animation: disk-spin 20s linear infinite; }
        .gargantua-disk-front { position: absolute; top: 50%; left: 50%; width: 900px; height: 220px; margin: -110px 0 0 -450px; background: radial-gradient(ellipse at center, transparent 32%, var(--g-disk-1) 36%, var(--g-disk-2) 55%, transparent 70%); border-radius: 50%; transform: rotate(-10deg); filter: blur(calc(3px + var(--react-glow, 0px) * 0.1)); opacity: var(--react-opacity, 0.8); z-index: 15; clip-path: polygon(0 50%, 100% 50%, 100% 100%, 0 100%); animation: disk-spin 20s linear infinite; }
        .gargantua-lensing-top { position: absolute; top: 50%; left: 50%; width: 360px; height: 360px; margin: -230px 0 0 -180px; border-radius: 50%; border-top: 50px solid var(--g-lensing); border-left: 20px solid transparent; border-right: 20px solid transparent; border-bottom: 0px solid transparent; transform: rotate(-10deg); filter: blur(calc(12px + var(--react-glow, 0px) * 0.2)); opacity: var(--react-opacity, 0.8); z-index: 2; }
        .gargantua-lensing-bottom { position: absolute; top: 50%; left: 50%; width: 340px; height: 340px; margin: -110px 0 0 -170px; border-radius: 50%; border-bottom: 30px solid var(--g-lensing); border-left: 10px solid transparent; border-right: 10px solid transparent; border-top: 0px solid transparent; transform: rotate(-10deg); filter: blur(calc(15px + var(--react-glow, 0px) * 0.2)); opacity: calc(var(--react-opacity, 0.8) - 0.2); z-index: 2; }
        @keyframes disk-spin { 0% { transform: rotate(-10deg) scale(1); } 50% { transform: rotate(-10deg) scale(1.02); } 100% { transform: rotate(-10deg) scale(1); } }
      `}</style>

      <div className="space-nebula"></div>
      
      <div ref={gargantuaRef} className={`gargantua-wrapper ${isActive ? 'active' : ''}`}>
        <div className="gargantua-disk-back"></div>
        <div className="gargantua-lensing-top"></div>
        <div className="gargantua-lensing-bottom"></div>
        <div className="gargantua-core"></div>
        <div className="gargantua-disk-front"></div>
      </div>

      <div className="star-layer stars-s" style={{ boxShadow: starsSmall }}></div>
      <div className="star-layer stars-m" style={{ boxShadow: starsMedium }}></div>
      <div className="star-layer stars-l" style={{ boxShadow: starsLarge }}></div>
      
      {shootingStars.map(shooter => (
        <div key={shooter.id} className="shooting-star-container" style={{ top: `${shooter.top}%`, right: `${shooter.right}%`, animationDelay: shooter.animationDelay, animationDuration: shooter.animationDuration, '--scale': shooter.scale } as React.CSSProperties}>
           <div className="shooting-star-tail"></div><div className="shooting-star-head"></div>
        </div>
      ))}
    </div>
  );
};

export default SpaceBackground;