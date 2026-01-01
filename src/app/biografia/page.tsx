'use client';
import { useEffect, useState } from 'react';
import { pb } from '@/lib/pocketbase';
import ReactPlayer from 'react-player/youtube';

export default function Biografia() {
  const [bio, setBio] = useState<any>(null);
  const [videos, setVideos] = useState<any[]>([]);

  useEffect(() => {
    // Busca la biografía inyectada
    pb.collection('biography').getFullList().then(res => {
        if(res.length > 0) setBio(res[0]);
    });
    // Busca los videos inyectados
    pb.collection('videos').getFullList({ sort: '-created' }).then(res => setVideos(res));
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-gray-300 p-8 md:p-16 ml-64 font-sans">
      <h1 className="text-7xl font-bold text-white mb-2 tracking-tighter">BIOGRAFÍA</h1>
      <p className="text-[#9d4edd] text-2xl mb-12 tracking-widest">LEONARDO GUZMÁN MÉNDEZ</p>

      {/* TEXTO RECUPERADO DE LA DB (SIN HARDCODE) */}
      <div className="prose prose-invert prose-lg max-w-4xl text-justify mb-16 whitespace-pre-line leading-relaxed text-gray-400">
        {bio ? bio.content : 'Cargando biografía desde PocketBase...'}
      </div>

      {/* VIDEOS GRID */}
      <h2 className="text-4xl font-bold text-white mb-8 border-l-4 border-[#9d4edd] pl-6">VIDEOS & COMPETENCIAS</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl">
        {videos.map((vid) => (
          <div key={vid.id} className="bg-[#0a0a0a] border border-gray-800 rounded-xl overflow-hidden hover:border-[#9d4edd] transition-colors">
            <div className="aspect-video relative">
               <ReactPlayer url={vid.url} width="100%" height="100%" controls light />
            </div>
            <div className="p-4">
              <h3 className="font-bold text-white">{vid.title}</h3>
              <span className="text-xs uppercase text-[#9d4edd] tracking-widest">{vid.category}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
