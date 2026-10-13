import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export default function Preloader({ isLoading = false }: { isLoading?: boolean }) {
  const location = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    // Trigger the animation every time the URL path changes
    setIsTransitioning(true);
    const timer = setTimeout(() => {
      setIsTransitioning(false);
    }, 800); // 800ms gives a premium, unhurried fade effect

    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Show the preloader if routing OR if manually told to load (like auth context)
  const show = isTransitioning || isLoading;

  return (
    <div 
      className={`fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center transition-opacity duration-500 ease-in-out ${
        show ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div className="relative flex flex-col items-center">
        {/* Red Glowing Aura */}
        <div className="absolute inset-0 bg-red-700 blur-[60px] opacity-30 rounded-full animate-pulse"></div>
        
        {/* Logo Container */}
        <div className="w-28 h-28 sm:w-36 sm:h-36 bg-white rounded-full p-2 mb-6 relative z-10 shadow-[0_0_40px_rgba(185,28,28,0.6)] animate-pulse">
          <img src="/bili-logo.png" alt="Bili Netsi Loading" className="w-full h-full object-contain" />
        </div>
        
        {/* Brand Text */}
        <div className="text-center relative z-10">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tighter uppercase mb-2">
            BILI <span className="text-red-600">NETSI</span>
          </h2>
          
          {/* Animated Loading Dots */}
          <div className="flex justify-center items-center gap-1.5 mt-4">
            <div className="w-2.5 h-2.5 bg-red-600 rounded-full animate-[bounce_1s_infinite_0ms]"></div>
            <div className="w-2.5 h-2.5 bg-red-600 rounded-full animate-[bounce_1s_infinite_200ms]"></div>
            <div className="w-2.5 h-2.5 bg-red-600 rounded-full animate-[bounce_1s_infinite_400ms]"></div>
          </div>
        </div>
      </div>
    </div>
  );
}