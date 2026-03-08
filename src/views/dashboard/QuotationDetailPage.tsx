'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { addQuotationLine, convertQuotationToSalesOrder, deleteQuotationLine, getQuotationDetail } from '@/lib/crmApi';
import type { Quotation, QuotationLine } from '@/types/crm';

type QuotationDetailPageProps = {
  id: string;
};

const QuotationDetailPage = ({ id }: QuotationDetailPageProps) => {
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [lines, setLines] = useState<QuotationLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [salesOrderId, setSalesOrderId] = useState<string | null>(null);

  const load = () => getQuotationDetail(id).then(({ quotation, lines }) => { setQuotation(quotation); setLines(lines); });
  useEffect(() => { load().catch((err: Error) => setError(err.message)); }, [id]);

  const onAddLine = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await addQuotationLine(id, {
        description: String(form.get('description')),
        quantity: Number(form.get('quantity')),
        unitPrice: Number(form.get('unitPrice')),
        currency: String(form.get('currency')) as 'AED' | 'USD' | 'EUR' | 'GBP',
        vatRate: Number(form.get('vatRate')),
        isZeroRated: false,
        isExempt: false,
        discount: Number(form.get('discount'))
      });
      event.currentTarget.reset();
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const onDeleteLine = async (lineId: string) => {
    try {
      await deleteQuotationLine(lineId);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const onConvert = async () => {
    try {
      const createdId = await convertQuotationToSalesOrder(id);
      setSalesOrderId(createdId);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (!quotation) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">{quotation.document_number}</h1>
        <button type="button" onClick={onConvert} className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-white">Convert to sales order</button>
      </div>
      {salesOrderId ? <p className="text-sm text-emerald-700">Sales order created: {salesOrderId}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {quotation.enquiry_id ? <Link className="text-sm text-primary underline" href={`/dashboard/enquiries/${quotation.enquiry_id}`}>Back to enquiry</Link> : null}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        {lines.map((line) => (
          <div key={line.id} className="flex items-center justify-between border-b py-2 text-sm last:border-b-0">
            <p>{line.description} • {line.quantity} × {line.unit_price}</p>
            <button
              type="button"
              onClick={() => onDeleteLine(line.id)}
              className="rounded border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
      <form onSubmit={onAddLine} className="grid gap-2 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-6">
        <input name="description" className="rounded border p-2 md:col-span-2" placeholder="Description" required />
        <input name="quantity" type="number" min="0.001" step="0.001" className="rounded border p-2" placeholder="Qty" required />
        <input name="unitPrice" type="number" min="0" step="0.01" className="rounded border p-2" placeholder="Unit price" required />
        <input name="discount" type="number" min="0" step="0.01" className="rounded border p-2" placeholder="Discount" defaultValue="0" required />
        <button className="rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-white" type="submit">Add line</button>
        <input type="hidden" name="currency" value="AED" />
        <input type="hidden" name="vatRate" value="5" />
      </form>
    </div>
  );
};

export default QuotationDetailPage;
