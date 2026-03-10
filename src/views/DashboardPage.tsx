'use client';

import { useEffect, useState } from 'react';
import StatCard from '@/components/summary/StatCard';
import RecentDocuments from '@/components/summary/RecentDocuments';
import { getDashboardStageCounts, type DashboardStageCounts } from '@/lib/crmApi';

const DashboardPage = () => {
  const [counts, setCounts] = useState<DashboardStageCounts>({ enquiries: 0, quotations: 0, saleOrders: 0, invoices: 0 });
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      setCounts(await getDashboardStageCounts());
    } catch (err) {
      setError((err as Error).message);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Business Overview</h1>
        <button onClick={() => void load()} className="rounded-md border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50">
          Refresh counts
        </button>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Enquiries" value={String(counts.enquiries)} subtitle="Active enquiries" href="/dashboard/enquiries" />
        <StatCard title="Quotations" value={String(counts.quotations)} subtitle="Open quotations" href="/dashboard/quotations" />
        <StatCard title="Sale Orders" value={String(counts.saleOrders)} subtitle="Active sales orders" href="/dashboard/sales-orders" />
        <StatCard title="Invoices" value={String(counts.invoices)} subtitle="Active invoices" href="/dashboard/invoices" />
      </div>
      <RecentDocuments />
    </div>
  );
};

export default DashboardPage;
