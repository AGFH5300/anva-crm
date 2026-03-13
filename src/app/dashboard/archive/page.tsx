import { Suspense } from 'react';
import DocumentArchivePage from '@/views/dashboard/DocumentArchivePage';

export default function DocumentArchiveRoute() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Loading archive…</p>}>
      <DocumentArchivePage />
    </Suspense>
  );
}
