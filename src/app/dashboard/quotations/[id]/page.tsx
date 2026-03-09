import { Suspense } from 'react';
import QuotationDetailPage from '@/views/dashboard/QuotationDetailPage';

export default function QuotationDetailRoute({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}>
      <QuotationDetailPage id={params.id} />
    </Suspense>
  );
}
