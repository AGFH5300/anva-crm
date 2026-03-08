'use client';

import { useCRMStore } from '@/store/useCRMStore';
import { formatCurrencyAED, calculateCorporateTax } from '@/config/uaeTax';
import { formatIsoDate } from '@/utils/date';

const FinancePage = () => {
  const { invoices } = useCRMStore();

  const totals = invoices.reduce(
    (acc, invoice) => {
      acc.revenue += invoice.document.taxSummary.total;
      if (invoice.status !== 'paid') {
        acc.outstanding += invoice.balanceDue;
      }
      return acc;
    },
    { revenue: 0, outstanding: 0 }
  );

  const estimatedCorporateTax = calculateCorporateTax({ netProfit: totals.revenue * 0.35 });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Finance & Tax</h1>
        <p className="text-sm text-slate-500">
          Monitor invoicing, receivables, and corporate tax exposure under UAE regulations.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total billed revenue</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{formatCurrencyAED(totals.revenue)}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Outstanding balance</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{formatCurrencyAED(totals.outstanding)}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Estimated corporate tax</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{formatCurrencyAED(estimatedCorporateTax)}</p>
          <p className="mt-1 text-xs text-slate-500">
            Based on 9% tax rate above AED 375,000 profit threshold (assumes 35% margin).
          </p>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Invoice #</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Issue date</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Balance due</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm text-slate-700">
            {invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td className="px-4 py-3 font-medium text-slate-900">{invoice.document.meta.documentNumber}</td>
                <td className="px-4 py-3">{invoice.document.recipient.name}</td>
                <td className="px-4 py-3">{formatIsoDate(invoice.document.meta.issueDate)}</td>
                <td className="px-4 py-3">{formatCurrencyAED(invoice.document.taxSummary.total)}</td>
                <td className="px-4 py-3">{formatCurrencyAED(invoice.balanceDue)}</td>
                <td className="px-4 py-3 capitalize">{invoice.status}</td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500">
                  No invoices yet. Issue invoices from sales orders to monitor compliance.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FinancePage;
