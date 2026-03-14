'use client';

import Sidebar from '@/components/navigation/Sidebar';
import Topbar from '@/components/navigation/Topbar';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { useAuthSession } from '@/components/auth/AuthSessionProvider';

const LOGIN_ROUTE = '/login';
const PUBLIC_ROUTES = [LOGIN_ROUTE];

const isProtectedPath = (pathname: string) => {
  return !PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
};

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuthSession();

  const onLoginPage = pathname === LOGIN_ROUTE;
  const requiresAuth = useMemo(() => isProtectedPath(pathname), [pathname]);
  const sessionExists = Boolean(user);

  useEffect(() => {
    // TEMP AUTH DEBUG LOGS - remove after auth routing verification.
    // eslint-disable-next-line no-console
    console.log('[AUTH DEBUG][APP_LAYOUT][PATH_CHECK]', {
      pathname,
      sessionExists,
      requiresAuth,
      loginRoute: LOGIN_ROUTE,
      loginRouteMounted: true,
      loading
    });

    if (loading) return;

    if (!user && requiresAuth) {
      const nextPath = pathname && pathname !== '/' ? pathname : '/dashboard';
      // TEMP AUTH DEBUG LOGS - remove after auth routing verification.
      // eslint-disable-next-line no-console
      console.log('[AUTH DEBUG][APP_LAYOUT][REDIRECT]', {
        pathname,
        requiresAuth,
        hasSession: sessionExists,
        redirectTo: `${LOGIN_ROUTE}?next=${encodeURIComponent(nextPath)}`
      });
      router.replace(`${LOGIN_ROUTE}?next=${encodeURIComponent(nextPath)}`);
      return;
    }

    if (user && onLoginPage) {
      router.replace('/dashboard');
    }
  }, [loading, onLoginPage, pathname, requiresAuth, router, sessionExists, user]);

  if (loading && requiresAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-slate-600">
        Loading...
      </div>
    );
  }

  if (!onLoginPage && !user && requiresAuth) {
    return null;
  }

  if (onLoginPage) {
    return <main className="min-h-screen bg-slate-100 p-6">{children}</main>;
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
};

export default AppLayout;
