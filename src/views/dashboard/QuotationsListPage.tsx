'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { listQuotations } from '@/lib/crmApi';
import type { Quotation } from '@/types/crm';
import { formatIsoDate } from '@/utils/date';

const QuotationsListPage = () => {
  const [rows, setRows] = useState<Quotation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();

  const createdMessage = useMemo(() => {
    if (searchParams.get('created') !== '1') return null;
    const quotationId = searchParams.get('quotationId');
    if (quotationId) return `Quotation draft was created successfully (${quotationId}).`;
    return 'Quotation draft was created successfully.';
  }, [searchParams]);

  useEffect(() => {
    listQuotations().then(setRows).catch((err: Error) => setError(err.message));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Quotations</h1>
      {createdMessage ? <p className="text-sm text-emerald-700">{createdMessage}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full table-auto text-left text-xs text-slate-600">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Quotation No</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Client Reference Number</th>
              <th className="px-3 py-2">Client</th>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-2 font-semibold text-slate-900"><Link href={`/dashboard/quotations/${item.id}`} className="text-primary hover:underline">{item.document_number}</Link></td>
                <td className="px-3 py-2">{formatIsoDate(item.created_at)}</td>
                <td className="px-3 py-2">{item.client_reference_number || item.customer_reference || '-'}</td>
                <td className="px-3 py-2">{item.client_name || item.client_id}</td>
                <td className="px-3 py-2">{item.currency} {item.total.toFixed(2)}</td>
                <td className="px-3 py-2 uppercase">{item.status}</td>
              </tr>
            ))}
            {!rows.length ? <tr><td className="px-3 py-4 text-sm text-slate-500" colSpan={6}>No quotations yet.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default QuotationsListPage;
