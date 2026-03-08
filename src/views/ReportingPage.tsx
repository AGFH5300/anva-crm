'use client';

import { useCRMStore } from '@/store/useCRMStore';
import { formatCurrencyAED } from '@/config/uaeTax';

const ReportingPage = () => {
  const { enquiries, quotations, invoices } = useCRMStore();

  const conversionRate = enquiries.length
    ? ((quotations.filter((quotation) => quotation.status === 'accepted').length / enquiries.length) * 100).toFixed(1)
    : '0.0';

  const revenueByStatus = invoices.reduce<Record<string, number>>((acc, invoice) => {
    acc[invoice.status] = (acc[invoice.status] ?? 0) + invoice.document.taxSummary.total;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Reporting & Analytics</h1>
        <p className="text-sm text-slate-500">
          Track commercial performance across enquiries, quotations, invoicing, and compliance obligations.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Enquiry to win rate</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{conversionRate}%</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Quotations issued</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{quotations.length}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Invoices raised</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{invoices.length}</p>
        </div>
      </div>
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Revenue by invoice status</h2>
        <div className="mt-3 space-y-2 text-sm text-slate-600">
          {Object.entries(revenueByStatus).map(([status, amount]) => (
            <div key={status} className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
              <span className="capitalize">{status}</span>
              <span>{formatCurrencyAED(amount)}</span>
            </div>
          ))}
          {Object.keys(revenueByStatus).length === 0 && <p>No invoices recorded yet.</p>}
        </div>
      </div>
      <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4 text-sm text-primary">
        <p className="font-semibold">Next steps</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Connect Supabase tables for live metrics and granular reporting.</li>
          <li>Extend analytics with scheduled VAT and corporate tax filings exports.</li>
          <li>Automate KPI alerts for overdue invoices and expiring quotations.</li>
        </ul>
      </div>
    </div>
  );
};

export default ReportingPage;
