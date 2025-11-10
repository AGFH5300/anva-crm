import { useMemo } from 'react';
import { useCRMStore } from '@/store/useCRMStore';
import QuotationComposer from '@/components/workflows/QuotationComposer';
import { formatIsoDate } from '@/utils/date';

const EnquiriesPage = () => {
  const { enquiries, clients, quotations } = useCRMStore();
  const enrichedEnquiries = useMemo(
    () =>
      enquiries.map((enquiry) => ({
        ...enquiry,
        client: clients.find((client) => client.id === enquiry.clientId)
      })),
    [enquiries, clients]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Enquiries & Quotations</h1>
        <p className="text-sm text-slate-500">
          Convert enquiries into compliant quotations with UAE VAT built in and auditable revision logs.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Open enquiries</h2>
          <div className="space-y-3">
            {enrichedEnquiries.map((enquiry) => (
              <div key={enquiry.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <p className="font-semibold text-slate-900">{enquiry.subject}</p>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    {enquiry.status.replace('-', ' ')}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">Client: {enquiry.client?.name ?? 'Unknown'}</p>
                <p className="mt-1 text-xs text-slate-500">Owner: {enquiry.owner}</p>
                <p className="mt-1 text-xs text-slate-500">Created: {formatIsoDate(enquiry.createdAt)}</p>
              </div>
            ))}
          </div>
        </div>
        <QuotationComposer enquiries={enrichedEnquiries} existingQuotations={quotations} />
      </div>
    </div>
  );
};

export default EnquiriesPage;
