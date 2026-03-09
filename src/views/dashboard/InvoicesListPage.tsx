'use client';

import { useEffect, useState } from 'react';
import { listInvoices } from '@/lib/crmApi';
import type { Invoice } from '@/types/crm';

const InvoicesListPage = () => {
  const [rows, setRows] = useState<Invoice[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listInvoices().then(setRows).catch((err: Error) => setError(err.message));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Invoices</h1>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="rounded-xl border border-slate-200 bg-white">
        {rows.map((item) => (
          <div key={item.id} className="border-b border-slate-100 p-4 last:border-b-0">
            <p className="font-medium text-slate-900">{item.document_number}</p>
            <p className="text-xs text-slate-500">{item.status} • {item.client_name || item.client_id} • {item.currency} {item.total}</p>
          </div>
        ))}
        {!rows.length ? <p className="p-4 text-sm text-slate-500">No active invoices.</p> : null}
      </div>
    </div>
  );
};

export default InvoicesListPage;
