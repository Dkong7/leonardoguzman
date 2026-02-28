const SpotifyPlayer = () => {
  // ID del álbum
  const spotifyId = "5T6s8MhA5Y0bYg2bQ2cK2b"; 
  
  return (
    <section className="py-12 bg-nardo-black relative z-10 border-t border-white/5">
      <div className="max-w-4xl mx-auto px-4">
        <h3 className="text-xl font-display text-center mb-8 uppercase tracking-wider text-white/80">
          Último Lanzamiento
        </h3>
        
        <div className="w-full bg-[#282828] rounded-xl overflow-hidden shadow-[0_0_30px_rgba(157,78,221,0.15)] ring-1 ring-white/10 hover:ring-nardo-purple/50 transition-all duration-500">
            <iframe 
                style={{ borderRadius: '12px' }} 
                src={`https://open.spotify.com/embed/album/${spotifyId}?utm_source=generator&theme=0`}
                width="100%" 
                height="152" 
                frameBorder="0" 
                allowFullScreen 
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                loading="lazy"
                title="Spotify Player"
            ></iframe>
        </div>
      </div>
    </section>
  );
};

export default SpotifyPlayer;