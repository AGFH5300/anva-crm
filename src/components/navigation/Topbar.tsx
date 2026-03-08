'use client';

import { useState } from 'react';
import { useSupabase } from '@/hooks/useSupabase';

const Topbar = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useSupabase();

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
          <p className="text-sm font-semibold text-slate-700">{user?.user_metadata?.full_name ?? 'Guest User'}</p>
          <p className="text-xs text-slate-500">{user?.email ?? 'Not signed in'}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary">
          {user?.email?.charAt(0).toUpperCase() ?? 'G'}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
