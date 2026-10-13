import { useAuth } from '../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function Navbar() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <nav className="bg-black border-b-4 border-red-700 sticky top-0 z-50 shadow-xl">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Logo Section */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center p-1 shadow-[0_0_15px_rgba(185,28,28,0.5)] overflow-hidden">
             <img src="/bili-logo.png" alt="Bili Netsi" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-xl tracking-tighter text-white uppercase leading-none">
              BILI <span className="text-red-600">NETSI</span>
            </span>
            <span className="text-[10px] text-gray-400 font-bold tracking-widest mt-0.5">
              FITNESS CHALLENGE
            </span>
          </div>
        </div>

        {/* Auth Buttons */}
        <div>
          {user ? (
            <button 
              onClick={handleLogout}
              className="flex flex-col items-center justify-center px-4 py-1.5 bg-red-700 hover:bg-red-600 text-white rounded-lg transition-colors shadow-lg active:scale-95"
            >
              <span className="text-sm font-black tracking-wide">Logout</span>
              <span className="text-[10px] font-medium opacity-80">ዘግተህ ውጣ</span>
            </button>
          ) : (
            <button 
              onClick={() => navigate('/login')}
              className="flex flex-col items-center justify-center px-5 py-1.5 bg-white text-black hover:bg-gray-200 rounded-lg transition-colors shadow-lg active:scale-95"
            >
              <span className="text-sm font-black tracking-wide">Sign In</span>
              <span className="text-[10px] font-bold text-red-700">ግባ</span>
            </button>
          )}
        </div>

      </div>
    </nav>
  );
}