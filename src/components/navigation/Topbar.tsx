'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/hooks/useSupabase';
import { supabase } from '@/lib/supabaseClient';

const Topbar = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const { user } = useSupabase();
  const router = useRouter();
  const displayName = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'Guest User';

  const onLogout = async () => {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
    setLoggingOut(false);
  };

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
      <input
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
        placeholder="Search clients, documents, or transactions"
        className="w-96 rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      <div className="flex items-center space-x-3">
        <div className="text-right">
          <p className="text-sm font-semibold text-slate-700">{displayName}</p>
          <p className="text-xs text-slate-500">{user?.email ?? 'Not signed in'}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary">
          {user?.email?.charAt(0).toUpperCase() ?? 'G'}
        </div>
        <button
          type="button"
          onClick={onLogout}
          disabled={!user || loggingOut}
          className="rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loggingOut ? 'Signing out…' : 'Logout'}
        </button>
      </div>
    </header>
  );
};

export default Topbar;
