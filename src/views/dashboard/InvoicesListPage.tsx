'use client';

import { useEffect, useState } from 'react';
import { listInvoices } from '@/lib/crmApi';
import type { Invoice } from '@/types/crm';
import { formatIsoDate } from '@/utils/date';

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
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full table-auto text-left text-xs text-slate-600">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Invoice No</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Client</th>
              <th className="px-3 py-2">Client PO Number</th>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-2 font-semibold text-slate-900">{item.document_number}</td>
                <td className="px-3 py-2">{formatIsoDate(item.issue_date)}</td>
                <td className="px-3 py-2">{item.client_name || item.client_id}</td>
                <td className="px-3 py-2">{item.client_po_number || '-'}</td>
                <td className="px-3 py-2">{item.currency} {item.total.toFixed(2)}</td>
                <td className="px-3 py-2 uppercase">{item.status}</td>
              </tr>
            ))}
            {!rows.length ? <tr><td className="px-3 py-4 text-sm text-slate-500" colSpan={6}>No active invoices.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InvoicesListPage;
