'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listEnquiries } from '@/lib/crmApi';
import { formatIsoDate } from '@/utils/date';
import type { Enquiry } from '@/types/crm';

const EnquiriesListPage = () => {
  const [rows, setRows] = useState<Enquiry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listEnquiries()
      .then(setRows)
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Enquiries</h1>
          <p className="text-xs text-slate-500">Operational pipeline (active-stage enquiries only).</p>
        </div>
        <Link href="/dashboard/enquiries/new" className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-white">
          New enquiry
        </Link>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Link href="/dashboard/archive?type=enquiries" className="inline-flex rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700">Open all enquiries archive</Link>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full table-auto text-left text-xs text-slate-600">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Enquiry Ref</th>
              <th className="px-3 py-2">Enquiry Date</th>
              <th className="px-3 py-2">Vessel Name</th>
              <th className="px-3 py-2">Client Reference Number</th>
              <th className="px-3 py-2">Job Type</th>
              <th className="px-3 py-2">Client</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-2 font-semibold text-slate-900">
                  <Link href={`/dashboard/enquiries/${item.id}`} className="text-primary hover:underline">
                    {item.job_number}
                  </Link>
                </td>
                <td className="px-3 py-2">{formatIsoDate(item.enquiry_date)}</td>
                <td className="px-3 py-2">{item.vessel_name || '-'}</td>
                <td className="px-3 py-2">{item.client_reference_number || '-'}</td>
                <td className="px-3 py-2">{item.job_type_name || '-'}</td>
                <td className="px-3 py-2">{item.client_name || item.client_id}</td>
                <td className="px-3 py-2 uppercase">{item.status}</td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td className="px-3 py-4 text-sm text-slate-500" colSpan={7}>
                  No enquiries yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EnquiriesListPage;
