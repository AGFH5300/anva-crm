'use client';

import { FormEvent, useMemo, useState } from 'react';
import { checkSupplierDuplicates, createSupplier } from '@/lib/crmApi';
import type { Supplier } from '@/types/crm';

type SupplierQuickAddProps = {
  initialCompanyName: string;
  onCreated: (supplier: Supplier) => void;
  onCancel: () => void;
};

const SupplierQuickAdd = ({ initialCompanyName, onCreated, onCancel }: SupplierQuickAddProps) => {
  const [companyName, setCompanyName] = useState(initialCompanyName);
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('UAE');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<Array<{ id: string; company_name: string; email: string | null }>>([]);

  const canSave = useMemo(() => companyName.trim().length > 1, [companyName]);

  const onCheckDuplicate = async () => {
    if (!companyName.trim()) return;
    const results = await checkSupplierDuplicates(companyName, email);
    setDuplicates(results as Array<{ id: string; company_name: string; email: string | null }>);
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSave) return;
    try {
      setSaving(true);
      setError(null);
      const supplier = await createSupplier({ companyName, contactPerson, email, phone, city, country });
      onCreated(supplier);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.toLowerCase().includes('signed in to add suppliers')) {
        setError('You must be signed in to add suppliers');
      } else {
        setError(message);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-sm font-medium text-slate-800">Create new supplier</p>
      <input className="w-full rounded border p-2 text-sm" placeholder="Company name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
      <div className="grid gap-2 md:grid-cols-2">
        <input className="rounded border p-2 text-sm" placeholder="Contact person" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
        <input type="email" className="rounded border p-2 text-sm" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="rounded border p-2 text-sm" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <input className="rounded border p-2 text-sm" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
      </div>
      <input className="w-full rounded border p-2 text-sm" placeholder="Country" value={country} onChange={(e) => setCountry(e.target.value)} />

      <div className="flex gap-2">
        <button type="button" onClick={onCheckDuplicate} className="rounded border px-2 py-1 text-xs">Check duplicates</button>
        <button disabled={!canSave || saving} className="rounded bg-primary px-3 py-1 text-xs font-medium text-white" type="submit">{saving ? 'Saving…' : 'Save supplier'}</button>
        <button type="button" onClick={onCancel} className="rounded border px-2 py-1 text-xs">Cancel</button>
      </div>

      {duplicates.length > 0 ? <p className="text-xs text-amber-700">Possible duplicates: {duplicates.map((d) => `${d.company_name}${d.email ? ` (${d.email})` : ''}`).join(', ')}</p> : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </form>
  );
};

export default SupplierQuickAdd;
