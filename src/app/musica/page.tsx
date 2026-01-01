'use client';
import { useState } from 'react';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import GigsWidget from '@/components/GigsWidget'; 

export default function Musica() {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="min-h-screen bg-[#050505] ml-64 text-white p-12 font-sans selection:bg-[#9d4edd] selection:text-white">
      {/* HERO */}
      <div className="flex flex-col items-center mb-16 pt-10">
         <h1 className="text-8xl font-bold tracking-tighter text-white mb-2">NOW</h1>
         <p className="text-[#9d4edd] text-xl tracking-[0.3em] uppercase">EP DISPONIBLE</p>
         <div className="flex gap-4 mt-8">
            {['Spotify', 'Apple Music', 'Deezer', 'YouTube'].map(p => (
               <button key={p} className="px-6 py-2 border border-gray-800 rounded-full hover:bg-white hover:text-black transition-all text-xs tracking-widest uppercase">{p}</button>
            ))}
         </div>
      </div>
      {/* PLAYER */}
      <div className="max-w-4xl mx-auto bg-[#0a0a0a] border border-gray-800 rounded-2xl p-8 shadow-[0_0_60px_rgba(157,78,221,0.1)] flex gap-8 items-center relative overflow-hidden mb-24">
         <div className="w-40 h-40 bg-gray-900 rounded-lg shadow-2xl flex items-center justify-center shrink-0 border border-gray-800 relative group">
             <div className="absolute inset-0 bg-gradient-to-tr from-[#9d4edd]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
             <span className="text-gray-700 text-xs tracking-widest">COVER ART</span>
         </div>
         <div className="flex-1 z-10">
            <h3 className="text-3xl font-bold text-white mb-1">Retina</h3>
            <p className="text-[#9d4edd] mb-6 tracking-wide">Leonardo Guzmán</p>
            <div className="w-full h-1 bg-gray-800 rounded-full mb-6 cursor-pointer overflow-hidden"><div className="w-1/3 h-full bg-[#9d4edd]"></div></div>
            <div className="flex justify-center gap-8 items-center">
               <button className="text-gray-500 hover:text-white transition-colors"><SkipBack size={24} /></button>
               <button onClick={() => setIsPlaying(!isPlaying)} className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-black hover:scale-110 transition-transform shadow-[0_0_20px_white]">
                 {isPlaying ? <Pause fill="black" size={20} /> : <Play fill="black" size={20} className="ml-1"/>}
               </button>
               <button className="text-gray-500 hover:text-white transition-colors"><SkipForward size={24} /></button>
            </div>
         </div>
      </div>
      <div className="max-w-4xl mx-auto"><GigsWidget /></div>
    </div>
  );
}
