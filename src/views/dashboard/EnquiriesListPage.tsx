'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listActiveSalesUsers, listEnquiries } from '@/lib/crmApi';
import type { Enquiry } from '@/types/crm';

const EnquiriesListPage = () => {
  const [rows, setRows] = useState<Enquiry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [salesPicById, setSalesPicById] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([listEnquiries(), listActiveSalesUsers()])
      .then(([enquiries, users]) => {
        setRows(enquiries);
        setSalesPicById(
          users.reduce<Record<string, string>>((acc, user) => {
            acc[user.id] = user.full_name;
            return acc;
          }, {})
        );
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Enquiries</h1>
        <Link href="/dashboard/enquiries/new" className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-white">
          New enquiry
        </Link>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="rounded-xl border border-slate-200 bg-white">
        {rows.map((item) => (
          <Link key={item.id} href={`/dashboard/enquiries/${item.id}`} className="block border-b border-slate-100 p-4 last:border-b-0">
            <p className="font-medium text-slate-900">{item.vessel_name || item.client_name || `Enquiry ${item.id.slice(0, 8)}`}</p>
            <p className="text-xs text-slate-500">PIC: {item.pic_name || '-'} • Client: {item.client_name || item.client_id} • Job Type: {item.job_type_name || '-'} • Sales PIC: {(item.sales_pic_user_id && salesPicById[item.sales_pic_user_id]) || '-'} • {item.status}</p>
            {(item.machinery_for || item.machinery_make || item.machinery_type || item.machinery_serial_no) ? (
              <p className="text-xs text-slate-500">
                {item.machinery_for ? `FOR: ${item.machinery_for}` : ''}
                {item.machinery_make ? ` • MAKE: ${item.machinery_make}` : ''}
                {item.machinery_type ? ` • TYPE: ${item.machinery_type}` : ''}
                {item.machinery_serial_no ? ` • S. No.: ${item.machinery_serial_no}` : ''}
              </p>
            ) : null}
          </Link>
        ))}
        {!rows.length ? <p className="p-4 text-sm text-slate-500">No enquiries yet.</p> : null}
      </div>
    </div>
  );
};

export default EnquiriesListPage;
