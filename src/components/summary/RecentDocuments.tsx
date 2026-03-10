'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listInvoices, listQuotations } from '@/lib/crmApi';
import { formatIsoDate } from '@/utils/date';
import type { Invoice, Quotation } from '@/types/crm';

const RecentDocuments = () => {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listQuotations(), listInvoices()])
      .then(([quotationRows, invoiceRows]) => {
        setQuotations(quotationRows.slice(0, 5));
        setInvoices(invoiceRows.slice(0, 5));
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Recent Quotations</h2>
        <p className="mb-4 text-sm text-slate-500">Latest active quotations from Supabase.</p>
        <div className="space-y-3">
          {quotations.map((quotation) => (
            <div
              key={quotation.id}
              className="rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-700"
            >
              <div className="flex items-center justify-between">
                <Link href={`/dashboard/quotations/${quotation.id}`} className="font-medium text-primary hover:underline">
                  {quotation.document_number}
                </Link>
                <p>{formatIsoDate(quotation.created_at)}</p>
              </div>
              <p className="text-xs text-slate-500">{quotation.client_name || quotation.client_id}</p>
              <p className="text-xs text-slate-500">Total: {quotation.currency} {quotation.total.toFixed(2)}</p>
            </div>
          ))}
          {quotations.length === 0 && <p className="text-sm text-slate-500">No quotations yet.</p>}
        </div>
      </div>
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Recent Invoices</h2>
        <p className="mb-4 text-sm text-slate-500">Latest active invoices from Supabase.</p>
        <div className="space-y-3">
          {invoices.map((invoice) => (
            <div key={invoice.id} className="rounded-lg border border-slate-200 px-4 py-3 text-sm">
              <div className="flex items-center justify-between font-medium text-slate-700">
                <Link href="/dashboard/invoices" className="text-primary hover:underline">
                  {invoice.document_number}
                </Link>
                <span>{invoice.currency} {invoice.total.toFixed(2)}</span>
              </div>
              <p className="text-xs text-slate-500">Issued {formatIsoDate(invoice.issue_date)}</p>
              <p className="text-xs text-slate-500">Status: {invoice.status}</p>
              <p className="text-xs text-slate-500">Balance: {invoice.currency} {invoice.balance_due.toFixed(2)}</p>
            </div>
          ))}
          {invoices.length === 0 && <p className="text-sm text-slate-500">No invoices yet.</p>}
        </div>
      </div>
      {error ? <p className="text-sm text-red-600 lg:col-span-2">{error}</p> : null}
    </div>
  );
};

export default RecentDocuments;
