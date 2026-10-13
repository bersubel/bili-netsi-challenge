import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

interface UserData {
  id: string;
  created_at: string;
  full_name: string;
  phone_number: string;
  telegram_username: string;
  payment_status: boolean;
  is_declined: boolean;
  payment_screenshot_url: string | null;
  meal_plan_pdf_url: string | null;
  assessments: {
    age: number;
    height_cm: number;
    weight_kg: number;
    target_weight_kg: number;
    primary_goal: string;
    previously_registered: boolean;
    health_conditions: string[];
  }[];
}

export default function Admin() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // UI States & Filters
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'declined'>('pending');
  const [approvedSubFilter, setApprovedSubFilter] = useState<'all' | 'sent' | 'needs_plan'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [filterDate, setFilterDate] = useState<string>(''); 
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  
  // Custom Modals & Dropdowns
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [receiptModalUrl, setReceiptModalUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .not('payment_screenshot_url', 'is', null); 

    const { data: assessments, error: assessmentError } = await supabase
      .from('assessments')
      .select('*');

    if (!profileError && profiles) {
      const mergedUsers = profiles.map(profile => ({
        ...profile,
        assessments: assessments ? assessments.filter(a => a.user_id === profile.id) : []
      }));
      setUsers(mergedUsers as unknown as UserData[]);
    } else {
      console.error("Error fetching profiles:", profileError);
    }
    setLoading(false);
  };

  const updateUserState = (userId: string, updates: Partial<UserData>) => {
    setUsers(prevUsers => prevUsers.map(u => u.id === userId ? { ...u, ...updates } : u));
  };

  const handleVerify = async (userId: string) => {
    setProcessingId(userId);
    const { error } = await supabase.from('profiles').update({ payment_status: true, is_declined: false }).eq('id', userId);
    if (!error) {
      updateUserState(userId, { payment_status: true, is_declined: false });
      setSelectedUser(null); // Auto-close the popup
    }
    setProcessingId(null);
  };

  const handleDecline = async (userId: string) => {
    if (!window.confirm("Are you sure you want to decline this receipt? (እርግጠኛ ነዎት ይህን ደረሰኝ ውድቅ ማድረግ ይፈልጋሉ?)")) return;
    setProcessingId(userId);
    const { error } = await supabase.from('profiles').update({ is_declined: true, payment_status: false }).eq('id', userId);
    if (!error) {
      updateUserState(userId, { is_declined: true, payment_status: false });
      setSelectedUser(null); // Auto-close the popup
    }
    setProcessingId(null);
  };

  const handleUndoDecline = async (userId: string) => {
    setProcessingId(userId);
    const { error } = await supabase.from('profiles').update({ is_declined: false, payment_status: false }).eq('id', userId);
    if (!error) {
      updateUserState(userId, { is_declined: false, payment_status: false });
      setSelectedUser(null); // Auto-close the popup
    }
    setProcessingId(null);
  };

  const handlePdfUpload = async (userId: string, file: File) => {
    setProcessingId(userId);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `mealplan-${userId}-${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('meal-plans').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('meal-plans').getPublicUrl(filePath);
      const { error: profileError } = await supabase.from('profiles').update({ meal_plan_pdf_url: publicUrl }).eq('id', userId);
      if (profileError) throw profileError;

      updateUserState(userId, { meal_plan_pdf_url: publicUrl });
    } catch (error: any) {
      alert("Failed to upload meal plan.");
    } finally {
      setProcessingId(null);
    }
  };

  // FIXED: No longer uses Supabase storage, just grabs the direct URL link
  const viewReceipt = (url: string) => {
    setReceiptModalUrl(url);
  };

  const formatDisplayDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatDisplayDateWithTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getLocalDateString = (isoString: string) => {
    const d = new Date(isoString);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // --- FILTER & SORT PIPELINE ---
  let filteredUsers = users.filter(u => {
    if (activeTab === 'pending') return !u.payment_status && !u.is_declined;
    if (activeTab === 'approved') return u.payment_status && !u.is_declined;
    if (activeTab === 'declined') return u.is_declined;
    return true;
  });

  if (filterDate) {
    filteredUsers = filteredUsers.filter(u => getLocalDateString(u.created_at) === filterDate);
  }

  if (activeTab === 'approved') {
    if (approvedSubFilter === 'sent') filteredUsers = filteredUsers.filter(u => u.meal_plan_pdf_url !== null);
    if (approvedSubFilter === 'needs_plan') filteredUsers = filteredUsers.filter(u => u.meal_plan_pdf_url === null);
  }

  filteredUsers.sort((a, b) => {
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
  });


  if (loading) return (
    <div className="min-h-screen bg-[#F9FAFB] flex justify-center items-center">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-red-700"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F9FAFB] py-6 sm:py-8 px-4 sm:px-6 lg:px-8 font-sans flex justify-center">
      <div className="w-full max-w-7xl relative">
        
        {/* --- HEADER --- */}
        <div className="mb-6 sm:mb-8 flex flex-col md:flex-row justify-between items-start md:items-end border-b border-gray-200 pb-6 gap-4">
          <div>
            <h1 className="text-3xl font-black text-black tracking-tight">Coach Portal</h1>
            <p className="text-red-700 font-bold text-xs tracking-widest mt-1">የአሰልጣኝ ማረፊያ</p>
          </div>
          <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
            <div className="flex-1 sm:flex-none bg-red-50 border border-red-100 text-red-900 px-2 sm:px-4 py-2 rounded-xl shadow-sm flex flex-col items-center min-w-[70px] sm:min-w-[90px]">
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-red-700">Pending</span>
              <span className="text-[8px] font-bold text-red-500 mb-0.5">በመጠባበቅ ላይ</span>
              <span className="text-lg sm:text-xl font-black leading-none mt-1">{users.filter(u => !u.payment_status && !u.is_declined).length}</span>
            </div>
            <div className="flex-1 sm:flex-none bg-black text-white px-2 sm:px-4 py-2 rounded-xl shadow-sm flex flex-col items-center min-w-[70px] sm:min-w-[90px]">
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-gray-400">Approved</span>
              <span className="text-[8px] font-bold text-gray-500 mb-0.5">የተረጋገጠ</span>
              <span className="text-lg sm:text-xl font-black leading-none mt-1">{users.filter(u => u.payment_status && !u.is_declined).length}</span>
            </div>
            <div className="flex-1 sm:flex-none bg-gray-100 text-gray-800 px-2 sm:px-4 py-2 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center min-w-[70px] sm:min-w-[90px]">
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-gray-500">Declined</span>
              <span className="text-[8px] font-bold text-gray-400 mb-0.5">ውድቅ የተደረገ</span>
              <span className="text-lg sm:text-xl font-black leading-none mt-1">{users.filter(u => u.is_declined).length}</span>
            </div>
          </div>
        </div>

        {/* --- CONTROLS --- */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
          
          {/* Main Tabs */}
          <div className="flex bg-gray-200 p-1 rounded-lg w-full lg:w-auto overflow-x-auto">
            <button onClick={() => {setActiveTab('pending'); setFilterDate('');}} className={`flex-1 min-w-[100px] px-4 sm:px-6 py-2 rounded-md transition-all flex flex-col items-center justify-center ${activeTab === 'pending' ? 'bg-white shadow-sm' : 'hover:bg-gray-300/50'}`}>
              <span className={`text-sm font-black ${activeTab === 'pending' ? 'text-black' : 'text-gray-500'}`}>Pending</span>
              <span className={`text-[9px] font-bold mt-0.5 ${activeTab === 'pending' ? 'text-gray-400' : 'text-gray-400'}`}>በመጠባበቅ ላይ</span>
            </button>
            <button onClick={() => {setActiveTab('approved'); setFilterDate('');}} className={`flex-1 min-w-[100px] px-4 sm:px-6 py-2 rounded-md transition-all flex flex-col items-center justify-center ${activeTab === 'approved' ? 'bg-white shadow-sm' : 'hover:bg-gray-300/50'}`}>
              <span className={`text-sm font-black ${activeTab === 'approved' ? 'text-black' : 'text-gray-500'}`}>Approved</span>
              <span className={`text-[9px] font-bold mt-0.5 ${activeTab === 'approved' ? 'text-gray-400' : 'text-gray-400'}`}>የተረጋገጠ</span>
            </button>
            <button onClick={() => {setActiveTab('declined'); setFilterDate('');}} className={`flex-1 min-w-[100px] px-4 sm:px-6 py-2 rounded-md transition-all flex flex-col items-center justify-center ${activeTab === 'declined' ? 'bg-white shadow-sm' : 'hover:bg-gray-300/50'}`}>
              <span className={`text-sm font-black ${activeTab === 'declined' ? 'text-black' : 'text-gray-500'}`}>Declined</span>
              <span className={`text-[9px] font-bold mt-0.5 ${activeTab === 'declined' ? 'text-gray-400' : 'text-gray-400'}`}>ውድቅ የተደረገ</span>
            </button>
          </div>
          
          {/* Styled Filters (Date & Custom Sort Dropdown) */}
          <div className="flex flex-row w-full lg:w-auto gap-3">
            
            {/* Custom Styled Date Picker */}
            <div className="relative flex-1 lg:flex-none flex items-center bg-white border-2 border-gray-100 hover:border-gray-200 focus-within:border-black rounded-xl px-4 py-2.5 shadow-sm transition-all">
              <svg className="w-4 h-4 text-gray-400 mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <input 
                type="date" 
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="bg-transparent text-sm font-bold text-gray-800 w-full outline-none cursor-pointer"
              />
              {filterDate && (
                <button onClick={() => setFilterDate('')} className="ml-2 bg-gray-100 hover:bg-red-100 hover:text-red-700 text-gray-500 rounded-full w-5 h-5 flex items-center justify-center font-bold text-xs transition-colors shrink-0">✕</button>
              )}
            </div>

            {/* CUSTOM DROPDOWN (Replaces native <select>) */}
            <div className="relative flex-1 lg:flex-none">
              
              {/* Invisible backdrop to close menu when clicking outside */}
              {isSortMenuOpen && (
                <div className="fixed inset-0 z-10" onClick={() => setIsSortMenuOpen(false)}></div>
              )}
              
              <button 
                onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
                className="relative z-20 w-full bg-white border-2 border-gray-100 hover:border-gray-200 text-sm font-bold text-gray-800 py-3 pl-10 pr-10 rounded-xl focus:outline-none focus:border-black shadow-sm cursor-pointer transition-all flex items-center justify-between"
              >
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                  </svg>
                </div>
                <span>{sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}</span>
                <div className="absolute inset-y-0 right-0 flex items-center px-4 text-gray-400 pointer-events-none">
                  <svg className={`w-4 h-4 transition-transform ${isSortMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </div>
              </button>

              {/* The Custom Dropdown Menu */}
              {isSortMenuOpen && (
                <div className="absolute z-30 mt-2 w-full bg-white border border-gray-100 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden">
                  <button 
                    onClick={() => { setSortOrder('newest'); setIsSortMenuOpen(false); }}
                    className={`w-full text-left px-4 py-3 text-sm font-bold transition-colors flex items-center justify-between ${sortOrder === 'newest' ? 'bg-gray-50 text-black' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    <span>Newest First</span>
                    {sortOrder === 'newest' && <div className="w-2 h-2 rounded-full bg-red-600"></div>}
                  </button>
                  <button 
                    onClick={() => { setSortOrder('oldest'); setIsSortMenuOpen(false); }}
                    className={`w-full text-left px-4 py-3 text-sm font-bold transition-colors flex items-center justify-between border-t border-gray-50 ${sortOrder === 'oldest' ? 'bg-gray-50 text-black' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    <span>Oldest First</span>
                    {sortOrder === 'oldest' && <div className="w-2 h-2 rounded-full bg-red-600"></div>}
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* --- APPROVED SUB-FILTERS --- */}
        {activeTab === 'approved' && (
          <div className="flex gap-2 mb-6 border-b border-gray-200 pb-4 overflow-x-auto">
            <button onClick={() => setApprovedSubFilter('all')} className={`text-xs font-black px-4 py-2 sm:py-1.5 rounded-full border transition-all whitespace-nowrap ${approvedSubFilter === 'all' ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}>All Approved <span className="text-[10px] font-bold ml-1 opacity-80">(ሁሉም)</span></button>
            <button onClick={() => setApprovedSubFilter('needs_plan')} className={`text-xs font-black px-4 py-2 sm:py-1.5 rounded-full border transition-all whitespace-nowrap ${approvedSubFilter === 'needs_plan' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}>Needs Meal Plan <span className="text-[10px] font-bold ml-1 opacity-80">(ያልተላከላቸው)</span></button>
            <button onClick={() => setApprovedSubFilter('sent')} className={`text-xs font-black px-4 py-2 sm:py-1.5 rounded-full border transition-all whitespace-nowrap ${approvedSubFilter === 'sent' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}>Plan Sent <span className="text-[10px] font-bold ml-1 opacity-80">(የተላከላቸው)</span></button>
          </div>
        )}

        {/* ========================================= */}
        {/* VIEW 1: DESKTOP DATA TABLE */}
        {/* ========================================= */}
        <div className="hidden md:block bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="py-4 px-6 text-xs font-black text-gray-500 uppercase tracking-wider">Date <span className="text-[9px] font-bold ml-1 text-gray-400 lowercase">(ቀን)</span></th>
                <th className="py-4 px-6 text-xs font-black text-gray-500 uppercase tracking-wider">Challenger <span className="text-[9px] font-bold ml-1 text-gray-400 lowercase">(ተሳታፊ)</span></th>
                <th className="py-4 px-6 text-xs font-black text-gray-500 uppercase tracking-wider">Goal <span className="text-[9px] font-bold ml-1 text-gray-400 lowercase">(አላማ)</span></th>
                <th className="py-4 px-6 text-xs font-black text-gray-500 uppercase tracking-wider">Status <span className="text-[9px] font-bold ml-1 text-gray-400 lowercase">(ሁኔታ)</span></th>
                <th className="py-4 px-6 text-xs font-black text-gray-500 uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400 font-bold">No users match these filters. <br/><span className="text-xs">የሚመሳሰል መረጃ አልተገኘም።</span></td>
                </tr>
              ) : (
                filteredUsers.map((client) => {
                  const assessment = client.assessments?.[0];
                  return (
                    <tr key={client.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="py-4 px-6 text-sm text-gray-500 font-medium whitespace-nowrap">{formatDisplayDate(client.created_at)}</td>
                      <td className="py-4 px-6">
                        <div className="font-black text-black">{client.full_name}</div>
                        <div className="text-xs font-bold text-gray-400 font-mono mt-0.5">{client.phone_number}</div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="bg-gray-100 text-gray-700 text-xs font-bold px-2.5 py-1 rounded-md whitespace-nowrap">{assessment?.primary_goal || 'Missing Data'}</span>
                        {assessment?.health_conditions && assessment.health_conditions.length > 0 && (
                          <span className="ml-2 text-red-600 text-xs font-black whitespace-nowrap" title={assessment.health_conditions.join(', ')}>⚠️ Alerts</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        {client.is_declined ? (
                           <span className="bg-red-100 text-red-800 text-xs font-black px-2.5 py-1 rounded-md whitespace-nowrap">Declined</span>
                        ) : client.payment_status ? (
                          client.meal_plan_pdf_url 
                            ? <span className="bg-green-100 text-green-800 text-xs font-black px-2.5 py-1 rounded-md whitespace-nowrap">Plan Sent</span>
                            : <span className="bg-blue-100 text-blue-800 text-xs font-black px-2.5 py-1 rounded-md whitespace-nowrap">Needs PDF</span>
                        ) : (
                          <span className="bg-yellow-100 text-yellow-800 text-xs font-black px-2.5 py-1 rounded-md whitespace-nowrap">Pending</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button onClick={() => setSelectedUser(client)} className="bg-white border border-gray-200 text-black hover:border-black hover:bg-black hover:text-white text-xs font-black px-4 py-2 rounded-lg transition-all shadow-sm whitespace-nowrap">
                          Review Profile
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ========================================= */}
        {/* VIEW 2: ULTRA-COMPACT MOBILE LIST */}
        {/* ========================================= */}
        <div className="md:hidden flex flex-col gap-3">
          {filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-gray-400 font-bold bg-white rounded-2xl border border-gray-200 shadow-sm">
              No users match these filters. <br/><span className="text-xs">የሚመሳሰል መረጃ አልተገኘም።</span>
            </div>
          ) : (
            filteredUsers.map((client) => (
              <div key={client.id} className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm grid grid-cols-3 items-center gap-2">
                
                <div className="col-span-1 flex flex-col justify-center overflow-hidden">
                  <div className="font-black text-black text-sm truncate w-full" title={client.full_name}>{client.full_name}</div>
                  <div className="text-[10px] font-bold text-gray-400 font-mono mt-0.5 truncate w-full">{client.phone_number}</div>
                </div>
                
                <div className="col-span-1 flex justify-center items-center">
                  {client.is_declined ? (
                    <span className="bg-red-50 text-red-800 text-[9px] uppercase tracking-wider font-black px-2.5 py-1.5 rounded-md text-center">Declined</span>
                  ) : client.payment_status ? (
                    client.meal_plan_pdf_url 
                      ? <span className="bg-green-50 text-green-800 text-[9px] uppercase tracking-wider font-black px-2.5 py-1.5 rounded-md text-center">Plan Sent</span>
                      : <span className="bg-blue-50 text-blue-800 text-[9px] uppercase tracking-wider font-black px-2.5 py-1.5 rounded-md text-center">Needs PDF</span>
                  ) : (
                    <span className="bg-yellow-50 text-yellow-800 text-[9px] uppercase tracking-wider font-black px-2.5 py-1.5 rounded-md text-center">Pending</span>
                  )}
                </div>
                
                <div className="col-span-1 flex flex-col items-end justify-center">
                  <button onClick={() => setSelectedUser(client)} className="w-full max-w-[80px] bg-black text-white hover:bg-gray-800 active:scale-95 text-[10px] font-black py-1.5 rounded-lg transition-all shadow-sm text-center">
                    Review
                  </button>
                  <div className="text-[8px] sm:text-[9px] font-bold text-gray-400 mt-1.5 text-right w-full whitespace-nowrap">
                    {formatDisplayDateWithTime(client.created_at)}
                  </div>
                </div>

              </div>
            ))
          )}
        </div>

      </div>

      {/* --- SELECTED USER REVIEW MODAL --- */}
      {selectedUser && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl flex flex-col md:flex-row overflow-hidden relative max-h-[80vh] overflow-y-auto">
            
            <button onClick={() => setSelectedUser(null)} className="absolute top-4 right-4 w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600 transition-colors z-10">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            {/* Left Side: Health Metrics */}
            <div className="w-full md:w-1/2 p-6 sm:p-10 bg-gray-50 border-b md:border-b-0 md:border-r border-gray-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-1 pr-8">
                  <h2 className="text-2xl font-black text-black">{selectedUser.full_name}</h2>
                  {selectedUser.is_declined && <span className="bg-red-600 text-white text-[10px] uppercase font-black px-2 py-1 rounded">Declined</span>}
                </div>
                <a href={`https://t.me/${selectedUser.telegram_username}`} target="_blank" className="text-sm font-bold text-[#0088cc] hover:underline mb-6 inline-block">@{selectedUser.telegram_username}</a>

                {selectedUser.assessments?.[0] ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-center">
                        <div className="text-xs font-black text-gray-400 uppercase tracking-wider">Age</div>
                        <div className="text-[9px] font-bold text-gray-400 mb-1">ዕድሜ</div>
                        <div className="text-xl font-black text-black">{selectedUser.assessments[0].age} yrs</div>
                      </div>
                      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-center">
                        <div className="text-xs font-black text-gray-400 uppercase tracking-wider">Height</div>
                        <div className="text-[9px] font-bold text-gray-400 mb-1">ቁመት</div>
                        <div className="text-xl font-black text-black">{selectedUser.assessments[0].height_cm} cm</div>
                      </div>
                      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-center">
                        <div className="text-xs font-black text-gray-400 uppercase tracking-wider">Current</div>
                        <div className="text-[9px] font-bold text-gray-400 mb-1">የአሁን ክብደት</div>
                        <div className="text-xl font-black text-black">{selectedUser.assessments[0].weight_kg} kg</div>
                      </div>
                      <div className="bg-red-50 p-4 rounded-2xl border border-red-100 shadow-sm flex flex-col justify-center">
                        <div className="text-xs font-black text-red-700 uppercase tracking-wider">Target</div>
                        <div className="text-[9px] font-bold text-red-500 mb-1">ታርጌት ክብደት</div>
                        <div className="text-xl font-black text-red-700">{selectedUser.assessments[0].target_weight_kg} kg</div>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                       <div className="text-xs font-black text-gray-400 uppercase tracking-wider">Health Alerts</div>
                       <div className="text-[9px] font-bold text-gray-400 mb-2">የጤና ሁኔታዎች</div>
                       {selectedUser.assessments[0].health_conditions && selectedUser.assessments[0].health_conditions.length > 0 ? (
                         <div className="flex flex-wrap gap-2">
                           {selectedUser.assessments[0].health_conditions.map(c => (
                             <span key={c} className="bg-red-600 text-white text-xs font-black px-3 py-1.5 rounded-lg shadow-sm">⚠️ {c}</span>
                           ))}
                         </div>
                       ) : (
                         <div className="text-sm font-bold text-green-600">
                           No health issues reported.
                           <div className="text-xs mt-1">ምንም የጤና ችግር አልተገለጸም።</div>
                         </div>
                       )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white p-6 rounded-2xl border border-gray-200 text-center shadow-sm">
                    <p className="text-gray-500 font-bold">Assessment data missing or blocked by database privacy settings.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Side: Actions & Receipt */}
            <div className="w-full md:w-1/2 p-6 sm:p-10 flex flex-col justify-center gap-6">
              
              <div className="bg-gray-50 rounded-2xl p-6 text-center border border-gray-200">
                <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Payment Verification</p>
                <p className="text-[9px] font-bold text-gray-400 mb-4">የክፍያ ማረጋገጫ</p>
                
                {selectedUser.payment_screenshot_url && (
                  <button onClick={() => viewReceipt(selectedUser.payment_screenshot_url!)} className="w-full bg-white border-2 border-gray-200 text-black font-black py-3 rounded-xl hover:border-black transition-all shadow-sm mb-4">
                    View Receipt Link <span className="text-[10px] text-gray-400 ml-1">(ሊንኩን እይ)</span>
                  </button>
                )}
                
                {selectedUser.is_declined ? (
                  <div className="space-y-3">
                    <div className="bg-red-100 text-red-800 font-black py-3 rounded-xl flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Receipt Declined (ውድቅ ተደርጓል)
                    </div>
                    <button onClick={() => handleUndoDecline(selectedUser.id)} disabled={processingId === selectedUser.id} className="text-sm font-bold text-gray-500 hover:text-black underline transition-colors">
                      Undo Decline & Move to Pending
                    </button>
                  </div>
                ) : !selectedUser.payment_status ? (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button 
                      onClick={() => handleDecline(selectedUser.id)} 
                      disabled={processingId === selectedUser.id}
                      className="flex-1 bg-white border-2 border-red-600 text-red-600 hover:bg-red-50 font-black py-3.5 rounded-xl transition-all shadow-sm disabled:opacity-50 flex flex-col items-center justify-center"
                    >
                      <span>Decline</span>
                      <span className="text-[9px] font-bold mt-0.5">ውድቅ አድርግ</span>
                    </button>
                    <button 
                      onClick={() => handleVerify(selectedUser.id)} 
                      disabled={processingId === selectedUser.id}
                      className="flex-[2] bg-black hover:bg-gray-800 text-white font-black py-3.5 rounded-xl transition-all shadow-lg shadow-black/20 disabled:opacity-50 flex flex-col items-center justify-center"
                    >
                      <span>{processingId === selectedUser.id ? 'Processing...' : 'Approve Payment'}</span>
                      {!processingId && <span className="text-[9px] text-gray-400 font-bold mt-0.5">አረጋግጥ</span>}
                    </button>
                  </div>
                ) : (
                  <div className="bg-green-100 text-green-800 font-black py-3 rounded-xl flex flex-col items-center justify-center">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      Payment Approved
                    </div>
                    <span className="text-[10px] opacity-75 font-bold mt-0.5">ክፍያው ተረጋግጧል</span>
                  </div>
                )}
              </div>

              {selectedUser.payment_status && !selectedUser.is_declined && (
                <div className="bg-red-50 rounded-2xl p-6 text-center border border-red-100 animate-fade-in">
                   <p className="text-xs font-black text-red-800 uppercase tracking-widest">Meal Plan Assignment</p>
                   <p className="text-[9px] font-bold text-red-600 mb-4">የምግብ ፕሮግራም</p>
                   {selectedUser.meal_plan_pdf_url ? (
                      <div className="text-sm font-black text-white bg-red-700 py-3 rounded-xl shadow-sm flex flex-col items-center">
                        <span>PDF Uploaded Successfully</span>
                        <span className="text-[10px] text-red-200 mt-0.5">ፕሮግራሙ ተልኳል</span>
                      </div>
                   ) : (
                      <label className={`w-full flex flex-col items-center justify-center bg-red-700 hover:bg-red-600 text-white font-black py-3.5 rounded-xl cursor-pointer transition-all shadow-lg shadow-red-700/30 ${processingId === selectedUser.id ? 'opacity-50' : 'active:scale-95'}`}>
                        <span>{processingId === selectedUser.id ? 'Uploading...' : 'Upload PDF Plan'}</span>
                        {!processingId && <span className="text-[9px] text-red-200 mt-0.5">ፕሮግራም ጫን</span>}
                        <input type="file" accept="application/pdf" className="hidden" disabled={processingId === selectedUser.id} onChange={(e) => {
                          if (e.target.files && e.target.files[0]) handlePdfUpload(selectedUser.id, e.target.files[0]);
                        }}/>
                      </label>
                   )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* --- IN-PAGE RECEIPT MODAL (NEW) --- */}
      {receiptModalUrl && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl relative flex flex-col max-h-[90vh] md:max-h-screen">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-black text-lg text-black">Payment Receipt</h3>
                <p className="text-[10px] font-bold text-gray-400">የክፍያ ማረጋገጫ ፎቶ</p>
              </div>
              <button onClick={() => setReceiptModalUrl(null)} className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Modal Body (Scrollable Image Container with Fallback Link) */}
            <div className="flex-1 overflow-auto p-4 sm:p-8 flex flex-col justify-center items-center bg-gray-50 rounded-b-3xl gap-4">
              <a href={receiptModalUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-blue-600 underline bg-blue-50 px-4 py-2 rounded-lg border border-blue-100 text-center">
                Link not showing as an image? Click here to open it directly<br/>
                <span className="text-[10px] font-medium opacity-80">(ሊንኩን ለመክፈት እዚህ ይጫኑ)</span>
              </a>
              <img src={receiptModalUrl} alt="Bank Receipt" className="max-w-full h-auto max-h-full object-contain rounded-xl shadow-sm border border-gray-200" />
            </div>

          </div>
        </div>
      )}

    </div>
  );
}