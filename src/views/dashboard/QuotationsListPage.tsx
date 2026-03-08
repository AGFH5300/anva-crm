'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listQuotations } from '@/lib/crmApi';
import type { Quotation } from '@/types/crm';

const QuotationsListPage = () => {
  const [rows, setRows] = useState<Quotation[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listQuotations().then(setRows).catch((err: Error) => setError(err.message));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Quotations</h1>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="rounded-xl border border-slate-200 bg-white">
        {rows.map((item) => (
          <Link key={item.id} href={`/dashboard/quotations/${item.id}`} className="block border-b border-slate-100 p-4 last:border-b-0">
            <p className="font-medium text-slate-900">{item.document_number}</p>
            <p className="text-xs text-slate-500">{item.status} • {item.currency} {item.total}</p>
          </Link>
        ))}
        {!rows.length ? <p className="p-4 text-sm text-slate-500">No quotations yet.</p> : null}
      </div>
    </div>
  );
};

export default QuotationsListPage;
