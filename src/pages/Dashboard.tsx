import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

interface UserProfile {
  full_name: string;
  payment_status: boolean;
  meal_plan_pdf_url: string | null;
  payment_screenshot_url: string | null;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // MVP Hardcoded Telegram Link
  const TELEGRAM_CHANNEL_LINK = "https://t.me/+YourPrivateChannelLink";

  useEffect(() => {
    async function fetchProfile() {
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, payment_status, meal_plan_pdf_url, payment_screenshot_url')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
      } else {
        setProfile(data);
      }
      setLoading(false);
    }

    fetchProfile();

    // --- THE REAL-TIME MAGIC ---
    // This listens for the exact moment Coach Netsi clicks "Approve" or "Upload PDF"
    if (!user) return;
    
    const subscription = supabase
      .channel('dashboard-profile-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`, // Only listen for THIS specific user's updates
        },
        (payload) => {
          console.log("Real-time update received from Coach Portal!");
          setProfile(payload.new as UserProfile);
        }
      )
      .subscribe();

    // Cleanup the listener when the user logs out or leaves the page
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex justify-center items-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-red-700"></div>
      </div>
    );
  }

  // THE BOUNCER: If they bypass Onboarding, force them back instantly.
  if (profile && !profile.payment_screenshot_url) {
    return <Navigate to="/onboarding" replace />;
  }

  const displayName = profile?.full_name?.split(' ')[0] || user?.user_metadata?.full_name?.split(' ')[0] || 'Challenger';

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-12 font-sans pt-6 sm:pt-10">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Welcome Section */}
        <div className="mb-8 text-center sm:text-left">
          <h1 className="text-3xl sm:text-4xl font-black text-black tracking-tight">
            Welcome, {displayName}
          </h1>
          <p className="text-red-700 font-bold text-sm tracking-widest mt-1">እንኳን ደህና መጡ</p>
        </div>

        {!profile?.payment_status ? (
          
          // --- PREMIUM PENDING STATE ---
          <div className="bg-white rounded-3xl p-6 sm:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
            <div className="flex flex-col items-center text-center max-w-lg mx-auto">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 relative border border-gray-200">
                <div className="absolute inset-0 border-4 border-red-100 rounded-full animate-pulse"></div>
                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-red-700 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-black mb-1 tracking-tight">Reviewing Profile</h2>
              <h3 className="text-sm font-bold text-red-700 mb-6">መረጃዎ እየታየ ነው</h3>
              
              <div className="bg-gray-50 border-l-4 border-black p-4 text-left rounded-r-lg mb-8 w-full shadow-sm">
                <p className="text-gray-900 font-black text-sm mb-1">Please check back after 24 hours.</p>
                <p className="text-gray-500 font-bold text-xs leading-relaxed">
                  እባክዎ ከ 24 ሰዓት በኋላ ተመልሰው ይግቡ። የክፍያ ማረጋገጫዎ እና የሰውነት መረጃዎ በአሰልጣኝ እየተረጋገጠ ነው።
                </p>
              </div>

              {/* Status Stepper */}
              <div className="w-full text-left space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center shrink-0 shadow-sm">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <div>
                    <div className="font-black text-black text-base sm:text-lg">Account Created</div>
                    <div className="text-xs font-bold text-gray-400">አካውንት ተከፍቷል</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center shrink-0 shadow-sm">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <div>
                    <div className="font-black text-black text-base sm:text-lg">Assessment Submitted</div>
                    <div className="text-xs font-bold text-gray-400">መረጃ ተልኳል</div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-red-50 border-2 border-red-700 flex items-center justify-center shrink-0">
                    <div className="w-3 h-3 bg-red-700 rounded-full animate-ping"></div>
                  </div>
                  <div>
                    <div className="font-black text-black text-base sm:text-lg">Coach Verification</div>
                    <div className="text-xs font-bold text-red-700">በአሰልጣኝ ማረጋገጥ <span className="text-gray-400 font-medium">(Usually takes a few hours)</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        ) : (

          // --- PREMIUM VERIFIED STATE ---
          <div className="space-y-6 sm:space-y-8 tracking-tight animate-fade-in">
            <div className="text-center sm:text-left bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm">
              <h2 className="text-2xl sm:text-3xl font-black text-black">Your Plan is Ready</h2>
              <p className="text-red-700 font-bold text-sm tracking-widest mt-1 mb-3">ፕሮግራምዎ ዝግጁ ነው</p>
              <p className="text-gray-500 text-sm sm:text-base font-medium">Access your custom materials and join the community below.</p>
              <p className="text-gray-400 text-xs font-bold mt-1">የምግብ ፕሮግራምዎን ያውርዱ እና የቴሌግራም ግሩፑን ይቀላቀሉ።</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              
              {/* PDF Card (Dark Theme) */}
              <div className="bg-black rounded-3xl p-6 sm:p-8 relative overflow-hidden group shadow-[0_8px_30px_rgb(0,0,0,0.15)] flex flex-col justify-between min-h-[280px]">
                <div className="relative z-10">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-red-700 rounded-xl flex items-center justify-center mb-4 sm:mb-6 shadow-lg shadow-red-700/30">
                    <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white mb-1">Custom Meal Plan</h3>
                  <p className="text-red-500 font-bold text-xs mb-2 tracking-wide">የምግብ ፕሮግራም</p>
                  <p className="text-gray-400 font-medium text-xs sm:text-sm max-w-[220px]">Tailored specifically to your body metrics.</p>
                </div>
                
                <div className="relative z-10 mt-6 sm:mt-8">
                  {profile.meal_plan_pdf_url ? (
                    <a href={profile.meal_plan_pdf_url} target="_blank" rel="noopener noreferrer" className="block w-full py-4 text-center rounded-xl text-sm sm:text-base font-black text-white bg-red-700 hover:bg-red-600 transition-all shadow-[0_0_20px_rgb(185,28,28,0.4)] active:scale-95">
                      Download PDF <span className="block text-[10px] font-bold opacity-80 mt-0.5">ያውርዱ</span>
                    </a>
                  ) : (
                    <button disabled className="w-full py-4 rounded-xl text-sm sm:text-base font-black text-gray-500 bg-gray-900 cursor-not-allowed border border-gray-800 flex flex-col items-center">
                      <span>Processing PDF...</span>
                      <span className="text-[10px] font-bold mt-0.5">በመዘጋጀት ላይ...</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Telegram Card (Light Theme) */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between min-h-[280px]">
                <div>
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#0088cc]/10 rounded-xl flex items-center justify-center mb-4 sm:mb-6">
                    <svg className="w-6 h-6 sm:w-7 sm:h-7 text-[#0088cc]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.223-.548.223l.188-2.85 5.18-4.686c.223-.195-.054-.304-.346-.109l-6.4 4.022-2.76-.86c-.6-.188-.61-.6.126-.89l10.81-4.167c.5-.188.937.108.77.895z"/></svg>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-black mb-1">VIP Community</h3>
                  <p className="text-[#0088cc] font-bold text-xs mb-2 tracking-wide">የቴሌግራም ቻናል</p>
                  <p className="text-gray-500 font-medium text-xs sm:text-sm">Join the private group to connect with the coach and members.</p>
                </div>
                
                <div className="mt-6 sm:mt-8">
                  <a href={TELEGRAM_CHANNEL_LINK} target="_blank" rel="noopener noreferrer" className="block w-full py-4 text-center rounded-xl text-sm sm:text-base font-black text-white bg-[#0088cc] hover:bg-[#0077b3] transition-all shadow-md shadow-[#0088cc]/20 active:scale-95">
                    Join Telegram <span className="block text-[10px] font-bold opacity-80 mt-0.5">ይቀላቀሉ</span>
                  </a>
                </div>
              </div>

            </div>
          </div>
        )}
      </main>
    </div>
  );
}