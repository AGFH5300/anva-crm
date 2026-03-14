'use client';

import { useEffect, useState } from 'react';
import { createClient, listVendorDirectory } from '@/lib/crmApi';

type DirectoryRow = {
  id: string | null;
  name: string | null;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  type: string | null;
  status: string | null;
};

const VendorsPage = () => {
  const [rows, setRows] = useState<DirectoryRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  const load = () => listVendorDirectory().then((data) => setRows(data as DirectoryRow[])).catch((err: Error) => setError(err.message));

  useEffect(() => {
    load();
  }, []);

  const onAdd = async () => {
    if (!newName.trim()) return;
    try {
      await createClient({ name: newName, type: 'vendor' });
      setNewName('');
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.toLowerCase().includes('signed in')) {
        setError('You must be signed in to add suppliers.');
      } else {
        setError('Unable to add vendor right now. Please try again.');
      }
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Vendors</h1>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="flex gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <input value={newName} onChange={(event) => setNewName(event.target.value)} className="flex-1 rounded border p-2 text-sm" placeholder="New supplier/vendor name" />
        <button type="button" className="rounded-md border border-slate-300 px-3 py-2 text-sm" onClick={onAdd}>Add vendor</button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full table-auto text-left text-xs text-slate-600">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Vendor Name</th>
              <th className="px-3 py-2">Contact Person</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Phone</th>
              <th className="px-3 py-2">Country</th>
              <th className="px-3 py-2">Status / Type</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((vendor, index) => (
              <tr key={vendor.id || `${vendor.name || 'vendor'}-${index}`} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-2 font-medium text-slate-900">{vendor.name || '-'}</td>
                <td className="px-3 py-2">{vendor.contact_person || '-'}</td>
                <td className="px-3 py-2">{vendor.email || '-'}</td>
                <td className="px-3 py-2">{vendor.phone || '-'}</td>
                <td className="px-3 py-2">{vendor.country || '-'}</td>
                <td className="px-3 py-2">{vendor.status || vendor.type || '-'}</td>
              </tr>
            ))}
            {!rows.length ? <tr><td className="px-3 py-4 text-sm text-slate-500" colSpan={6}>No vendors found.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VendorsPage;
