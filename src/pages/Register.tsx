import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phoneNumber: '',
    telegramUsername: ''
  });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            phone_number: formData.phoneNumber,
            telegram_username: formData.telegramUsername.replace('@', ''),
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        navigate('/onboarding'); 
      }
      
    } catch (err: any) {
      setError(err.message || 'An error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-md w-full space-y-6 bg-white p-8 sm:p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 relative overflow-hidden">
        
        {/* Top Accent Line */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-black"></div>

        <div className="flex flex-col items-center">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center p-1 mb-4 shadow-[0_0_20px_rgba(0,0,0,0.1)]">
            <img src="/bili-logo.png" alt="Bili Netsi" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-center text-3xl font-black text-black tracking-tight">
            Join the Challenge
          </h2>
          <p className="mt-1 text-center text-sm font-bold text-red-700 tracking-widest">
            አካውንት ይፍጠሩ
          </p>
        </div>
        
        <form className="mt-6 space-y-5" onSubmit={handleRegister}>
          {error && (
            <div className="bg-red-50 border-l-4 border-red-600 text-red-700 p-4 rounded-r" role="alert">
              <p className="text-sm font-bold">{error}</p>
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-black text-black mb-1">Full Name <span className="text-gray-400 font-bold text-xs ml-1">(ሙሉ ስም)</span></label>
              <input type="text" required
                className="appearance-none relative block w-full px-4 py-3 bg-gray-50 border border-gray-200 placeholder-gray-400 text-black rounded-xl focus:outline-none focus:ring-2 focus:ring-red-700 focus:bg-white font-bold transition-all"
                placeholder="John Doe"
                onChange={e => setFormData({...formData, fullName: e.target.value})}
              />
            </div>
            
            <div>
              <label className="block text-sm font-black text-black mb-1">Email Address <span className="text-gray-400 font-bold text-xs ml-1">(ኢሜል)</span></label>
              <input type="email" required
                className="appearance-none relative block w-full px-4 py-3 bg-gray-50 border border-gray-200 placeholder-gray-400 text-black rounded-xl focus:outline-none focus:ring-2 focus:ring-red-700 focus:bg-white font-bold transition-all"
                placeholder="you@example.com"
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>
            
            <div>
              <label className="block text-sm font-black text-black mb-1">Phone Number <span className="text-gray-400 font-bold text-xs ml-1">(ስልክ ቁጥር)</span></label>
              <input type="tel" required
                className="appearance-none relative block w-full px-4 py-3 bg-gray-50 border border-gray-200 placeholder-gray-400 text-black rounded-xl focus:outline-none focus:ring-2 focus:ring-red-700 focus:bg-white font-bold transition-all"
                placeholder="0911..."
                onChange={e => setFormData({...formData, phoneNumber: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-black text-black mb-1">Telegram Username <span className="text-gray-400 font-bold text-xs ml-1">(ቴሌግራም)</span></label>
              <input type="text" required
                className="appearance-none relative block w-full px-4 py-3 bg-gray-50 border border-gray-200 placeholder-gray-400 text-black rounded-xl focus:outline-none focus:ring-2 focus:ring-red-700 focus:bg-white font-bold transition-all"
                placeholder="@username"
                onChange={e => setFormData({...formData, telegramUsername: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-black text-black mb-1">Password <span className="text-gray-400 font-bold text-xs ml-1">(የይለፍ ቃል)</span></label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  className="appearance-none relative block w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-200 placeholder-gray-400 text-black rounded-xl focus:outline-none focus:ring-2 focus:ring-red-700 focus:bg-white font-bold transition-all"
                  placeholder="Min. 6 characters"
                  onChange={e => setFormData({...formData, password: e.target.value})}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-700 transition-colors focus:outline-none"
                >
                  {showPassword ? (
                    /* Eye Off Icon */
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    /* Eye Icon */
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex flex-col justify-center items-center py-4 px-4 border border-transparent rounded-xl text-white bg-red-700 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-700 transition-all active:scale-[0.98] disabled:opacity-70 shadow-[0_0_20px_rgb(185,28,28,0.3)] mt-2"
          >
            <span className="text-base font-black tracking-wide">{loading ? 'Creating Account...' : 'Register'}</span>
            {!loading && <span className="text-[10px] font-bold text-red-200 mt-0.5">ተመዝገብ</span>}
          </button>
        </form>

        <p className="mt-6 text-center text-sm font-medium text-gray-600 border-t border-gray-100 pt-6">
          Already have an account?{' '}
          <Link to="/login" className="font-black text-black hover:text-red-700 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}