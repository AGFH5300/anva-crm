'use client';

import { useEffect, useState } from 'react';
import { createClient, listClientDirectory } from '@/lib/crmApi';

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

const ClientsPage = () => {
  const [rows, setRows] = useState<DirectoryRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  const load = () => listClientDirectory().then((data) => setRows(data as DirectoryRow[])).catch((err: Error) => setError(err.message));

  useEffect(() => {
    load();
  }, []);

  const onAdd = async () => {
    if (!newName.trim()) return;
    try {
      await createClient({ name: newName, type: 'client' });
      setNewName('');
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Clients</h1>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="flex gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <input value={newName} onChange={(event) => setNewName(event.target.value)} className="flex-1 rounded border p-2 text-sm" placeholder="New client name" />
        <button type="button" className="rounded-md border border-slate-300 px-3 py-2 text-sm" onClick={onAdd}>Add client</button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full table-auto text-left text-xs text-slate-600">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Client Name</th>
              <th className="px-3 py-2">Contact Person</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Phone</th>
              <th className="px-3 py-2">Country</th>
              <th className="px-3 py-2">Status / Type</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((client, index) => (
              <tr key={client.id || `${client.name || 'client'}-${index}`} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-2 font-medium text-slate-900">{client.name || '-'}</td>
                <td className="px-3 py-2">{client.contact_person || '-'}</td>
                <td className="px-3 py-2">{client.email || '-'}</td>
                <td className="px-3 py-2">{client.phone || '-'}</td>
                <td className="px-3 py-2">{client.country || '-'}</td>
                <td className="px-3 py-2">{client.status || client.type || '-'}</td>
              </tr>
            ))}
            {!rows.length ? <tr><td className="px-3 py-4 text-sm text-slate-500" colSpan={6}>No clients found.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ClientsPage;
