'use client';

import { User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type AuthSessionContextValue = {
  user: User | null;
  loading: boolean;
};

const AuthSessionContext = createContext<AuthSessionContextValue | undefined>(undefined);

export const AuthSessionProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) return;

      const sessionUser = data.session?.user ?? null;
      setUser(sessionUser);
      setLoading(false);

      // TEMP AUTH DEBUG LOGS - remove after auth routing verification.
      // eslint-disable-next-line no-console
      console.log('[AUTH DEBUG][SESSION_PROVIDER][INIT]', {
        hasSession: Boolean(data.session),
        userId: sessionUser?.id ?? null,
        error: error?.message ?? null
      });
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      setUser(session?.user ?? null);
      setLoading(false);

      // TEMP AUTH DEBUG LOGS - remove after auth routing verification.
      // eslint-disable-next-line no-console
      console.log('[AUTH DEBUG][SESSION_PROVIDER][EVENT]', {
        event,
        hasSession: Boolean(session),
        userId: session?.user?.id ?? null
      });
    });

    return () => {
      isMounted = false;
      listener?.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({ user, loading }), [loading, user]);

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
};

export const useAuthSession = () => {
  const context = useContext(AuthSessionContext);

  if (!context) {
    throw new Error('useAuthSession must be used inside AuthSessionProvider.');
  }

  return context;
};
