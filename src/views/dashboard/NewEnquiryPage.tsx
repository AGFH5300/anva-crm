'use client';

import { FormEvent, KeyboardEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { addEnquiryLine, createEnquiry, seedDefaultClientsIfMissing } from '@/lib/crmApi';
import { SUPPORTED_CURRENCIES } from '@/types/crm';

type EnquiryLineForm = {
  id: string;
  partNumber: string;
  description: string;
  quantity: string;
};

type EnquirySummary = {
  forValue: string;
  make: string;
  type: string;
  serialNumber: string;
};

const createLine = (index: number): EnquiryLineForm => ({
  id: `line-${index}`,
  partNumber: '',
  description: '',
  quantity: '1'
});

const NewEnquiryPage = () => {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [summary, setSummary] = useState<EnquirySummary>({
    forValue: '',
    make: '',
    type: '',
    serialNumber: ''
  });
  const [lines, setLines] = useState<EnquiryLineForm[]>([createLine(1)]);

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

  const updateSummary = (field: keyof EnquirySummary, value: string) => {
    setSummary((prev) => ({ ...prev, [field]: value }));
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
        subject: `Enquiry for ${selectedClient.name}${summary.forValue.trim() ? ` - ${summary.forValue.trim()}` : ''}`,
        priority: 'medium'
      });

      const summaryLines = [
        summary.forValue.trim() ? `For: ${summary.forValue.trim()}` : '',
        summary.make.trim() ? `Make: ${summary.make.trim()}` : '',
        summary.type.trim() ? `Type: ${summary.type.trim()}` : '',
        summary.serialNumber.trim() ? `S No: ${summary.serialNumber.trim()}` : ''
      ].filter(Boolean);

      const lineItems = lines
        .map((line) => ({
          description: line.description.trim(),
          partNumber: line.partNumber.trim(),
          quantity: Number(line.quantity),
          unitPrice: 0,
          currency: 'AED' as (typeof SUPPORTED_CURRENCIES)[number],
          vatRate: 5,
          isZeroRated: false,
          isExempt: false
        }))
        .filter((line) => line.description.length > 0 && Number.isFinite(line.quantity) && line.quantity > 0)
        .map((line) => ({
          ...line,
          description: `${line.description}${line.partNumber ? ` | Part No: ${line.partNumber}` : ''}`
        }));

      if (!lineItems.length) {
        throw new Error('Please add at least one item with description and quantity.');
      }

      const allLines = [
        ...summaryLines.map((description) => ({
          description,
          quantity: 1,
          unitPrice: 0,
          currency: 'AED' as (typeof SUPPORTED_CURRENCIES)[number],
          vatRate: 5,
          isZeroRated: false,
          isExempt: false
        })),
        ...lineItems
      ];

      await Promise.all(allLines.map((line) => addEnquiryLine(enquiry.id, line)));

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

        <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm text-slate-700">
            <span className="font-medium">For</span>
            <input
              value={summary.forValue}
              onChange={(event) => updateSummary('forValue', event.target.value)}
              className="rounded border p-2"
              placeholder="MGPS"
            />
          </label>
          <label className="grid gap-1 text-sm text-slate-700">
            <span className="font-medium">Make</span>
            <input value={summary.make} onChange={(event) => updateSummary('make', event.target.value)} className="rounded border p-2" placeholder="Cathelco" />
          </label>
          <label className="grid gap-1 text-sm text-slate-700">
            <span className="font-medium">Type</span>
            <input value={summary.type} onChange={(event) => updateSummary('type', event.target.value)} className="rounded border p-2" placeholder="16C-DW" />
          </label>
          <label className="grid gap-1 text-sm text-slate-700">
            <span className="font-medium">Serial no.</span>
            <input
              value={summary.serialNumber}
              onChange={(event) => updateSummary('serialNumber', event.target.value)}
              className="rounded border p-2"
              placeholder="10029876"
            />
          </label>
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-[auto,1.1fr,2fr,120px] gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <p className="text-center">S/No</p>
            <p>Part No.</p>
            <p>Item Description</p>
            <p>Qty</p>
          </div>
          {lines.map((line, index) => (
            <div key={line.id} className="grid grid-cols-[auto,1.1fr,2fr,120px] gap-2">
              <div className="flex items-center justify-center rounded border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600">{index + 1}</div>
              <input
                value={line.partNumber}
                onChange={(event) => updateLine(line.id, 'partNumber', event.target.value)}
                className="rounded border p-2"
                placeholder="Part number"
              />
              <input
                value={line.description}
                onChange={(event) => updateLine(line.id, 'description', event.target.value)}
                className="rounded border p-2"
                placeholder="Item description"
                required
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
