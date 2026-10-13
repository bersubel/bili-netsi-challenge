import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

const HEALTH_CONDITIONS = [
  { id: 'Diabetes', en: 'Diabetes', am: 'ስኳር በሽታ' },
  { id: 'Hypertension', en: 'Blood Pressure', am: 'የደም ግፊት' },
  { id: 'Gastritis', en: 'Gastritis / Ulcer', am: 'ጨጓራ' },
  { id: 'Asthma', en: 'Asthma', am: 'አስም' },
  { id: 'Joint Pain', en: 'Joint/Back Pain', am: 'የመገጣጠሚያ/ወገብ ህመም' },
  { id: 'Pregnancy', en: 'Pregnant/Nursing', am: 'እርግዝና / ጡት ማጥባት' },
  { id: 'Other', en: 'Other', am: 'ሌላ (ከታች ይፃፉ)' }
];

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    age: '',
    height: '',
    weight: '',
    targetWeight: '',
    goal: 'Weight Loss',
    previouslyRegistered: false,
    selectedConditions: [] as string[],
    otherConditionText: ''
  });

  const toggleCondition = (conditionId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedConditions: prev.selectedConditions.includes(conditionId)
        ? prev.selectedConditions.filter(id => id !== conditionId)
        : [...prev.selectedConditions, conditionId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!receiptFile) {
      setError("Please upload your payment screenshot. (የክፍያ ማረጋገጫ ያስገቡ)");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Upload receipt
      const fileExt = receiptFile.name.split('.').pop();
      const filePath = `${user.id}-${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('receipts').upload(filePath, receiptFile);
      if (uploadError) throw uploadError;

      // 2. Update profile with receipt
      const { error: profileError } = await supabase.from('profiles').update({ payment_screenshot_url: filePath }).eq('id', user.id);
      if (profileError) throw profileError;

      // 3. Process Health Conditions (Merge "Other" text if selected)
      let finalConditions = [...formData.selectedConditions];
      if (finalConditions.includes('Other') && formData.otherConditionText) {
        finalConditions = finalConditions.filter(c => c !== 'Other');
        finalConditions.push(`Other: ${formData.otherConditionText}`);
      }

      // 4. Insert Assessment
      const { error: assessmentError } = await supabase.from('assessments').insert([{
        user_id: user.id,
        age: parseInt(formData.age),
        height_cm: parseFloat(formData.height),
        weight_kg: parseFloat(formData.weight),
        target_weight_kg: parseFloat(formData.targetWeight),
        primary_goal: formData.goal,
        previously_registered: formData.previouslyRegistered,
        health_conditions: finalConditions
      }]);

      if (assessmentError) throw assessmentError;
      navigate('/dashboard');

    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] py-8 px-4 sm:px-6 flex flex-col items-center font-sans">
      <div className="max-w-2xl w-full bg-white border border-gray-100 p-6 sm:p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-black text-black mb-2 tracking-tight">Final Step</h2>
          <h3 className="text-sm font-bold text-red-600 mb-2 tracking-widest">የመጨረሻ ደረጃ</h3>
          <p className="text-gray-500 text-sm">Complete payment and assessment to build your plan.</p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-600 p-4 mb-8 rounded-r">
            <p className="text-sm font-bold text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-12">
          
          {/* SECTION 1: Payment */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
              <div className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center font-black">1</div>
              <div>
                <h3 className="text-xl font-black text-black leading-none">Payment</h3>
                <p className="text-xs font-bold text-gray-400 mt-1">ክፍያ</p>
              </div>
            </div>
            
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200">
              <p className="text-sm text-gray-700 mb-1">Bank <span className="text-xs text-gray-400">(ባንክ)</span>: <span className="font-black text-black">CBE</span></p>
              <p className="text-sm text-gray-700 mb-2">Name <span className="text-xs text-gray-400">(ስም)</span>: <span className="font-black text-black">Netsanet G.</span></p>
              <div className="bg-white p-3 border border-gray-200 rounded-xl font-mono text-lg font-black tracking-widest text-center text-red-700 shadow-sm">
                1000123456789
              </div>
            </div>

            <div>
              <label className="block text-sm font-black text-black mb-1">Upload Receipt *</label>
              <label className="block text-xs font-bold text-gray-400 mb-3">የክፍያ ማረጋገጫ ፎቶ ያስገቡ</label>
              <input
                type="file"
                accept="image/*"
                required
                onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-black file:bg-black file:text-white hover:file:bg-gray-800 cursor-pointer border border-gray-200 rounded-xl bg-gray-50"
              />
            </div>
          </section>

          {/* SECTION 2: Assessment */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
              <div className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center font-black">2</div>
              <div>
                <h3 className="text-xl font-black text-black leading-none">Body Metrics</h3>
                <p className="text-xs font-bold text-gray-400 mt-1">የሰውነት መረጃ</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 sm:gap-6">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-black text-black">Age *</label>
                <label className="block text-xs font-bold text-gray-400 mb-2">ዕድሜ</label>
                <input type="number" required placeholder="e.g. 25"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-black rounded-xl focus:ring-2 focus:ring-red-600 focus:bg-white font-bold"
                  onChange={e => setFormData({...formData, age: e.target.value})}
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-black text-black">Height (cm) *</label>
                <label className="block text-xs font-bold text-gray-400 mb-2">ቁመት</label>
                <input type="number" required placeholder="170"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-black rounded-xl focus:ring-2 focus:ring-red-600 focus:bg-white font-bold"
                  onChange={e => setFormData({...formData, height: e.target.value})}
                />
              </div>
              
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-black text-black">Weight (kg) *</label>
                <label className="block text-xs font-bold text-gray-400 mb-2">የአሁን ክብደት</label>
                <input type="number" required placeholder="85"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-black rounded-xl focus:ring-2 focus:ring-red-600 focus:bg-white font-bold"
                  onChange={e => setFormData({...formData, weight: e.target.value})}
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-black text-black">Target (kg) *</label>
                <label className="block text-xs font-bold text-gray-400 mb-2">የሚፈልጉት ክብደት</label>
                <input type="number" required placeholder="70"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-black rounded-xl focus:ring-2 focus:ring-red-600 focus:bg-white font-bold"
                  onChange={e => setFormData({...formData, targetWeight: e.target.value})}
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-black text-black">Goal *</label>
                <label className="block text-xs font-bold text-gray-400 mb-2">ዋና አላማ</label>
                <select required value={formData.goal}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 text-black rounded-xl focus:ring-2 focus:ring-red-600 focus:bg-white font-bold"
                  onChange={e => setFormData({...formData, goal: e.target.value})}
                >
                  <option value="Weight Loss">Weight Loss (ክብደት መቀነስ)</option>
                  <option value="Muscle Gain">Muscle Gain (ጡንቻ መጨመር)</option>
                  <option value="Maintenance">Maintenance (ክብደት መጠበቅ)</option>
                </select>
              </div>
            </div>
          </section>

          {/* SECTION 3: Health & History */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
              <div className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center font-black">3</div>
              <div>
                <h3 className="text-xl font-black text-black leading-none">Health & History</h3>
                <p className="text-xs font-bold text-gray-400 mt-1">የጤና ሁኔታ</p>
              </div>
            </div>

            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200">
              <p className="text-sm font-black text-black mb-1">Have you participated in this challenge before?</p>
              <p className="text-xs font-bold text-gray-500 mb-4">ከዚህ በፊት በዚህ ቻሌንጅ ተሳትፈው ያውቃሉ?</p>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="prevReg" checked={formData.previouslyRegistered} onChange={() => setFormData({...formData, previouslyRegistered: true})} className="w-5 h-5 text-red-600 focus:ring-red-600 border-gray-300" />
                  <span className="font-bold text-sm">Yes (አዎ)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="prevReg" checked={!formData.previouslyRegistered} onChange={() => setFormData({...formData, previouslyRegistered: false})} className="w-5 h-5 text-red-600 focus:ring-red-600 border-gray-300" />
                  <span className="font-bold text-sm">No (አይ)</span>
                </label>
              </div>
            </div>

            <div>
              <p className="text-sm font-black text-black mb-1">Select any health conditions you have:</p>
              <p className="text-xs font-bold text-gray-500 mb-4">ካለብዎት የጤና እክል ይምረጡ (ከሌለዎት ይዝለሉት)፡</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {HEALTH_CONDITIONS.map(condition => {
                  const isSelected = formData.selectedConditions.includes(condition.id);
                  return (
                    <div 
                      key={condition.id}
                      onClick={() => toggleCondition(condition.id)}
                      className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex items-center justify-between ${isSelected ? 'border-red-600 bg-red-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                    >
                      <div>
                        <div className={`font-black text-sm ${isSelected ? 'text-red-900' : 'text-gray-900'}`}>{condition.en}</div>
                        <div className={`text-xs font-bold mt-0.5 ${isSelected ? 'text-red-700' : 'text-gray-500'}`}>{condition.am}</div>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-red-600 bg-red-600' : 'border-gray-300'}`}>
                        {isSelected && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Dynamic Text Box if 'Other' is selected */}
              {formData.selectedConditions.includes('Other') && (
                <div className="mt-4">
                  <label className="block text-sm font-black text-black mb-1">Please specify your condition *</label>
                  <label className="block text-xs font-bold text-gray-400 mb-2">እባክዎ የጤና እክልዎን ይፃፉ</label>
                  <textarea 
                    required
                    rows={2}
                    placeholder="Type here..."
                    className="w-full px-4 py-3 bg-white border-2 border-red-200 text-black rounded-xl focus:ring-0 focus:border-red-600 font-bold shadow-sm"
                    onChange={e => setFormData({...formData, otherConditionText: e.target.value})}
                  ></textarea>
                </div>
              )}
            </div>
          </section>

          <button type="submit" disabled={loading}
            className="w-full py-5 px-4 rounded-2xl text-white bg-red-700 hover:bg-red-600 active:scale-[0.98] transition-all disabled:opacity-70 shadow-[0_0_20px_rgb(185,28,28,0.3)] flex flex-col items-center justify-center gap-1"
          >
            <span className="text-lg font-black tracking-wide">{loading ? 'Processing...' : 'Submit & Join Challenge'}</span>
            {!loading && <span className="text-xs font-medium opacity-80">መረጃውን ላክ</span>}
          </button>
        </form>

      </div>
    </div>
  );
}