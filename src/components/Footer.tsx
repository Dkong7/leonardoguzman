import { Link } from 'react-router-dom';

const Footer = () => (
  <footer className="bg-black py-12 border-t border-nardo-900 relative mt-auto">
    <div className="max-w-7xl mx-auto px-4 text-center">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-gray-600 text-[10px] tracking-[0.3em] uppercase">
          © 2026 Leonardo Guzman. All Rights Reserved.
        </div>
        
        <a href="https://www.thisiswillowtree.com" target="_blank" rel="noopener noreferrer" className="text-gray-700 hover:text-nardo-500 text-[10px] font-bold tracking-widest transition-colors flex items-center gap-2">
           DEVELOPED BY <span className="font-serif italic text-white">WILLOW TREE MEDIA</span>
        </a>
      </div>
    </div>
    
    {/* Triángulo Rojo Discreto (Abajo Derecha) */}
    <Link to="/nardonardonardo" className="absolute bottom-4 right-4 w-0 h-0 border-l-[10px] border-l-transparent border-b-[10px] border-b-[#330000] hover:border-b-[red] transition-all cursor-pointer z-50 opacity-50 hover:opacity-100" title="?"></Link>
  </footer>
);
export default Footer;