import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listEnquiries } from '@/lib/crmApi';
import type { Enquiry } from '@/types/crm';

const EnquiriesListPage = () => {
  const [rows, setRows] = useState<Enquiry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listEnquiries().then(setRows).catch((err: Error) => setError(err.message));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Enquiries</h1>
        <Link to="/dashboard/enquiries/new" className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-white">
          New enquiry
        </Link>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="rounded-xl border border-slate-200 bg-white">
        {rows.map((item) => (
          <Link key={item.id} to={`/dashboard/enquiries/${item.id}`} className="block border-b border-slate-100 p-4 last:border-b-0">
            <p className="font-medium text-slate-900">{item.subject}</p>
            <p className="text-xs text-slate-500">{item.status} • {item.priority}</p>
          </Link>
        ))}
        {!rows.length ? <p className="p-4 text-sm text-slate-500">No enquiries yet.</p> : null}
      </div>
    </div>
  );
};

export default EnquiriesListPage;
