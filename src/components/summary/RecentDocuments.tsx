'use client';

import { useCRMStore, summarizeInvoice } from '@/store/useCRMStore';
import { formatCurrencyAED } from '@/config/uaeTax';
import { formatIsoDate } from '@/utils/date';

const RecentDocuments = () => {
  const { quotations, invoices } = useCRMStore();

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Recent Quotations</h2>
        <p className="mb-4 text-sm text-slate-500">
          All quotations are automatically calculated with UAE VAT compliance.
        </p>
        <div className="space-y-3">
          {quotations.slice(-5).map((quotation) => (
            <div
              key={quotation.id}
              className="rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-700"
            >
              <div className="flex items-center justify-between">
                <p className="font-medium">{quotation.document.meta.documentNumber}</p>
                <p>{formatIsoDate(quotation.document.meta.issueDate)}</p>
              </div>
              <p className="text-xs text-slate-500">{quotation.document.recipient.name}</p>
              <p className="text-xs text-slate-500">
                Total: {formatCurrencyAED(quotation.document.taxSummary.total)}
              </p>
            </div>
          ))}
          {quotations.length === 0 && <p className="text-sm text-slate-500">No quotations yet.</p>}
        </div>
      </div>
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Recent Invoices</h2>
        <p className="mb-4 text-sm text-slate-500">
          Invoices reflect the 5% VAT requirement and corporate tax insights.
        </p>
        <div className="space-y-3">
          {invoices.slice(-5).map((invoice) => {
            const summary = summarizeInvoice(invoice);
            return (
              <div key={invoice.id} className="rounded-lg border border-slate-200 px-4 py-3 text-sm">
                <div className="flex items-center justify-between font-medium text-slate-700">
                  <span>{summary.number}</span>
                  <span>{summary.total}</span>
                </div>
                <p className="text-xs text-slate-500">Issued {formatIsoDate(summary.issueDate)}</p>
                <p className="text-xs text-slate-500">Status: {summary.status}</p>
                <p className="text-xs text-slate-500">Balance: {summary.balanceDue}</p>
              </div>
            );
          })}
          {invoices.length === 0 && <p className="text-sm text-slate-500">No invoices yet.</p>}
        </div>
      </div>
    </div>
  );
};

export default RecentDocuments;
