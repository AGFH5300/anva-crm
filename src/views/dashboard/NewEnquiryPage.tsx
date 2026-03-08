'use client';

import { FormEvent, KeyboardEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { addEnquiryLine, createEnquiry, seedDefaultClientsIfMissing } from '@/lib/crmApi';
import { SUPPORTED_CURRENCIES } from '@/types/crm';

type EnquiryLineForm = {
  id: string;
  description: string;
  partNumber: string;
  quantity: string;
};

const createLine = (index: number, preset = ''): EnquiryLineForm => ({
  id: `line-${index}`,
  description: preset,
  partNumber: '',
  quantity: '1'
});

const defaultRows = ['FOR', 'MAKE', 'TYPE'];

const NewEnquiryPage = () => {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lines, setLines] = useState<EnquiryLineForm[]>(defaultRows.map((row, index) => createLine(index + 1, row)));

  const clientOptions = useMemo(
    () => [
      {
        label: 'Premier Marine Engineering Services, DMC, Dubai. PO Box 113417',
        key: 'Premier Marine Engineering Services, DMC, Dubai. PO Box 113417'
      },
      {
        label: 'Silverburn',
        key: 'Silverburn'
      }
    ],
    []
  );

  const addItemLine = () => {
    setLines((prev) => [...prev, createLine(prev.length + 1)]);
  };

  const updateLine = (id: string, field: keyof EnquiryLineForm, value: string) => {
    setLines((prev) => prev.map((line) => (line.id === id ? { ...line, [field]: value } : line)));
  };

  const onQuantityTab = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key === 'Tab' && !event.shiftKey && index === lines.length - 1) {
      addItemLine();
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const form = new FormData(event.currentTarget);
    const selectedClientName = String(form.get('clientName') ?? '').trim();

    try {
      const clients = await seedDefaultClientsIfMissing(clientOptions.map((client) => client.label));
      const selectedClient = clients.find((client) => client.name === selectedClientName);

      if (!selectedClient) {
        throw new Error('Please select a client.');
      }

      const enquiry = await createEnquiry({
        clientId: selectedClient.id,
        subject: `Enquiry for ${selectedClient.name}`,
        priority: 'medium'
      });

      const lineItems = lines
        .map((line) => ({
          description: `${line.description.trim()}${line.partNumber.trim() ? ` | Part No: ${line.partNumber.trim()}` : ''}`,
          quantity: Number(line.quantity),
          unitPrice: 0,
          currency: 'AED' as (typeof SUPPORTED_CURRENCIES)[number],
          vatRate: 5,
          isZeroRated: false,
          isExempt: false
        }))
        .filter((line) => line.description.trim().length > 0 && Number.isFinite(line.quantity) && line.quantity > 0);

      if (!lineItems.length) {
        throw new Error('Please add at least one item with description and quantity.');
      }

      await Promise.all(lineItems.map((line) => addEnquiryLine(enquiry.id, line)));

      router.push(`/dashboard/enquiries/${enquiry.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">New enquiry</h1>
      <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <select name="clientName" className="w-full rounded border p-2" required>
          <option value="">Select client</option>
          {clientOptions.map((client) => (
            <option key={client.key} value={client.label}>
              {client.label}
            </option>
          ))}
        </select>

        <hr />

        <div className="space-y-2">
          {lines.map((line, index) => (
            <div key={line.id} className="grid gap-2 md:grid-cols-[2fr,1.5fr,1fr]">
              <input
                value={line.description}
                onChange={(event) => updateLine(line.id, 'description', event.target.value)}
                className="rounded border p-2"
                placeholder="Description"
                required
              />
              <input
                value={line.partNumber}
                onChange={(event) => updateLine(line.id, 'partNumber', event.target.value)}
                className="rounded border p-2"
                placeholder="Part number"
              />
              <input
                value={line.quantity}
                onChange={(event) => updateLine(line.id, 'quantity', event.target.value)}
                onKeyDown={(event) => onQuantityTab(event, index)}
                name={`quantity-${line.id}`}
                type="number"
                min="0.001"
                step="0.001"
                className="rounded border p-2"
                placeholder="Quantity required"
                required
              />
            </div>
          ))}
        </div>

        <button type="button" className="w-fit rounded-md border border-slate-300 px-3 py-1 text-sm" onClick={addItemLine}>
          + Add item
        </button>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-white disabled:opacity-60" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Creating…' : 'Create enquiry'}
        </button>
      </form>
    </div>
  );
};

export default NewEnquiryPage;
