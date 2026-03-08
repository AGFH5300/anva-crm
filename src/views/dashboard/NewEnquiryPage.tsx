'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { addEnquiryLine, createEnquiry, listClients } from '@/lib/crmApi';
import { SUPPORTED_CURRENCIES } from '@/types/crm';

const NewEnquiryPage = () => {
  const router = useRouter();
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listClients().then(setClients).catch((err: Error) => setError(err.message));
  }, []);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);

    try {
      const enquiry = await createEnquiry({
        clientId: String(form.get('clientId')),
        subject: String(form.get('subject')),
        description: String(form.get('description') ?? ''),
        priority: String(form.get('priority') ?? 'medium') as 'low' | 'medium' | 'high'
      });

      await addEnquiryLine(enquiry.id, {
        description: String(form.get('lineDescription')),
        quantity: Number(form.get('quantity')),
        unitPrice: Number(form.get('unitPrice')),
        currency: String(form.get('currency')) as (typeof SUPPORTED_CURRENCIES)[number],
        vatRate: Number(form.get('vatRate')),
        isZeroRated: false,
        isExempt: false
      });

      router.push(`/dashboard/enquiries/${enquiry.id}`);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">New enquiry</h1>
      <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <select name="clientId" className="w-full rounded border p-2" required>
          <option value="">Select client</option>
          {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
        </select>
        <input name="subject" placeholder="Subject" className="w-full rounded border p-2" required />
        <textarea name="description" placeholder="Description" className="w-full rounded border p-2" rows={3} />
        <select name="priority" className="w-full rounded border p-2" defaultValue="medium">
          <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
        </select>
        <hr />
        <input name="lineDescription" placeholder="First line description" className="w-full rounded border p-2" required />
        <div className="grid gap-2 md:grid-cols-4">
          <input name="quantity" type="number" min="0.001" step="0.001" defaultValue="1" className="rounded border p-2" required />
          <input name="unitPrice" type="number" min="0" step="0.01" defaultValue="0" className="rounded border p-2" required />
          <select name="currency" className="rounded border p-2" defaultValue="AED">
            {SUPPORTED_CURRENCIES.map((ccy) => <option key={ccy}>{ccy}</option>)}
          </select>
          <input name="vatRate" type="number" min="0" max="100" step="0.01" defaultValue="5" className="rounded border p-2" required />
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-white" type="submit">Create enquiry</button>
      </form>
    </div>
  );
};

export default NewEnquiryPage;
