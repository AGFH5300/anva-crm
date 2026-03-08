'use client';

import { useCRMStore } from '@/store/useCRMStore';
import StatCard from '@/components/summary/StatCard';
import RecentDocuments from '@/components/summary/RecentDocuments';

const DashboardPage = () => {
  const { clients, enquiries, quotations, invoices } = useCRMStore();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Business Overview</h1>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Active Clients"
          value={clients.filter((client) => client.status === 'active').length.toString()}
          subtitle="Relationships in good standing"
        />
        <StatCard
          title="Open Enquiries"
          value={enquiries.filter((enquiry) => enquiry.status !== 'won' && enquiry.status !== 'lost').length.toString()}
          subtitle="Opportunities under review"
        />
        <StatCard
          title="Pending Quotations"
          value={quotations.filter((quotation) => quotation.status !== 'accepted').length.toString()}
          subtitle="Awaiting client action"
        />
        <StatCard
          title="Outstanding Invoices"
          value={invoices.filter((invoice) => invoice.status !== 'paid').length.toString()}
          subtitle="Requires finance follow-up"
        />
      </div>
      <RecentDocuments />
    </div>
  );
};

export default DashboardPage;
