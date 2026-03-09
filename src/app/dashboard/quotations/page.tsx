import { Suspense } from 'react';
import QuotationsListPage from '@/views/dashboard/QuotationsListPage';

export default function QuotationsRoute() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}>
      <QuotationsListPage />
    </Suspense>
  );
}
