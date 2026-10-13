import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';

export default function AdminRoute() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [debugData, setDebugData] = useState<string>('');

  useEffect(() => {
    async function checkAdmin() {
      if (!user) {
        setIsAdmin(false);
        setDebugData('No user logged in.');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
        
      if (error) {
        setDebugData(`Error reading profile: ${error.message}`);
        setIsAdmin(false);
      } else {
        setDebugData(`Role found in database: "${data?.role}"`);
        setIsAdmin(data?.role === 'admin');
      }
    }

    if (!authLoading) {
      checkAdmin();
    }
  }, [user, authLoading]);

  if (authLoading || isAdmin === null) {
    return (
      <div className="min-h-screen bg-black flex justify-center items-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-red-700"></div>
      </div>
    );
  }

  // If they are an admin, let them in!
  if (isAdmin) {
    return <Outlet />;
  }

  // IF IT FAILS, SHOW THIS DEBUG SCREEN INSTEAD OF BOUNCING THEM:
  return (
    <div className="min-h-screen bg-black p-10 font-sans text-white">
      <div className="max-w-2xl mx-auto border-2 border-red-700 p-8 rounded-2xl bg-gray-900">
        <h1 className="text-3xl font-black text-red-500 mb-4">Access Denied (Debug Mode)</h1>
        
        <div className="space-y-4 font-mono text-sm bg-black p-4 rounded-xl border border-gray-700">
          <p><span className="text-gray-500">Current App Email:</span> <span className="text-white font-bold">{user?.email || 'None'}</span></p>
          <p><span className="text-gray-500">Database Response:</span> <span className="text-yellow-400 font-bold">{debugData}</span></p>
        </div>

        <div className="mt-8">
          <p className="text-gray-400 mb-4 text-sm">
            <strong>How to fix:</strong> If the email above is wrong, click Logout. If the Database Response says "user" or "null", you updated the wrong row in Supabase.
          </p>
          <button 
            onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login'; }}
            className="bg-red-700 hover:bg-red-600 text-white font-black px-6 py-3 rounded-xl transition-all"
          >
            Force Logout & Try Again
          </button>
          <button 
            onClick={() => window.location.href = '/dashboard'}
            className="ml-4 bg-white hover:bg-gray-200 text-black font-black px-6 py-3 rounded-xl transition-all"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}