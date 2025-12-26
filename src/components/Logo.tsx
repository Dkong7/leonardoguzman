const Logo = ({ className = "h-12 w-12" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className={className}>
    <defs>
      <linearGradient id="neonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#9d4edd" />
        <stop offset="100%" stopColor="#3c096c" />
      </linearGradient>
      <filter id="glow">
        <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
        <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    {/* Forma Estilizada "LG" */}
    <path d="M20,20 L20,80 L80,80" fill="none" stroke="url(#neonGrad)" strokeWidth="8" strokeLinecap="round" filter="url(#glow)" />
    <path d="M50,50 L80,50 L80,80" fill="none" stroke="#c77dff" strokeWidth="6" strokeLinecap="round" filter="url(#glow)" />
    <circle cx="50" cy="50" r="45" stroke="#4c1d95" strokeWidth="1" fill="none" opacity="0.5" />
  </svg>
);
export default Logo;