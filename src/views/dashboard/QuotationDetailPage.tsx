'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { addQuotationLine, convertQuotationToSalesOrder, deleteQuotationLine, getQuotationDetail, updateQuotationLines } from '@/lib/crmApi';
import type { Quotation, QuotationLine } from '@/types/crm';

type QuotationDetailPageProps = {
  id: string;
};

type EditablePricingLine = {
  id: string;
  quantity: number;
  unit_price: number;
  discount: number;
  vat_rate: number;
};

const QuotationDetailPage = ({ id }: QuotationDetailPageProps) => {
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [lines, setLines] = useState<QuotationLine[]>([]);
  const [editableLines, setEditableLines] = useState<EditablePricingLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [salesOrderId, setSalesOrderId] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const searchParams = useSearchParams();

  const load = () => getQuotationDetail(id).then(({ quotation, lines }) => {
    setQuotation(quotation);
    setLines(lines);
    setEditableLines(lines.map((line) => ({
      id: line.id,
      quantity: Number(line.quantity),
      unit_price: Number(line.unit_price),
      discount: Number(line.discount ?? 0),
      vat_rate: Number(line.vat_rate ?? 0)
    })));
  });

  useEffect(() => { load().catch((err: Error) => setError(err.message)); }, [id]);

  const createdMessage = useMemo(() => {
    if (searchParams.get('created') !== '1') return null;
    const reference = searchParams.get('reference');
    return reference ? `Quotation draft created successfully: ${reference}` : 'Quotation draft created successfully.';
  }, [searchParams]);

  const onAddLine = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      setError(null);
      setSaveMessage(null);
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
      setError(null);
      setSaveMessage(null);
      await deleteQuotationLine(id, lineId);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const onChangePricing = (lineId: string, field: keyof Omit<EditablePricingLine, 'id'>, value: number) => {
    setEditableLines((previous) => previous.map((line) => {
      if (line.id !== lineId) return line;
      return { ...line, [field]: Number.isFinite(value) ? value : 0 };
    }));
  };

  const onSavePricing = async () => {
    try {
      setError(null);
      setSaveMessage(null);
      await updateQuotationLines(id, editableLines);
      await load();
      setSaveMessage('Quotation pricing saved and totals recalculated.');
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
      {createdMessage ? <p className="text-sm text-emerald-700">{createdMessage}</p> : null}
      {salesOrderId ? <p className="text-sm text-emerald-700">Sales order created: {salesOrderId}</p> : null}
      {saveMessage ? <p className="text-sm text-emerald-700">{saveMessage}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {quotation.enquiry_id ? <Link className="text-sm text-primary underline" href={`/dashboard/enquiries/${quotation.enquiry_id}`}>Back to enquiry</Link> : null}

      <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 md:grid-cols-2">
        <p><span className="font-medium">Quotation Ref:</span> {quotation.document_number}</p>
        <p><span className="font-medium">Parent Enquiry / Job Number:</span> {quotation.job_number || quotation.enquiry?.job_number || '-'}</p>
        <p><span className="font-medium">Client:</span> {quotation.client_name || quotation.client_id}</p>
        <p><span className="font-medium">Vessel:</span> {quotation.enquiry?.vessel_name || '-'}</p>
        <p><span className="font-medium">Job Type:</span> {quotation.job_type_name || '-'}</p>
        <p><span className="font-medium">FOR / MAKE / TYPE / S.No.:</span> {[quotation.enquiry?.machinery_for, quotation.enquiry?.machinery_make, quotation.enquiry?.machinery_type, quotation.enquiry?.machinery_serial_no].map((part) => part || '-').join(' / ')}</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        {lines.map((line) => {
          const editableLine = editableLines.find((item) => item.id === line.id);
          const qty = editableLine?.quantity ?? 0;
          const unitPrice = editableLine?.unit_price ?? 0;
          const discount = editableLine?.discount ?? 0;
          const vatRate = editableLine?.vat_rate ?? 0;
          const taxable = Math.max(0, qty * unitPrice - discount);
          const lineTotal = taxable + taxable * vatRate / 100;

          return (
            <div key={line.id} className="space-y-2 border-b py-3 text-sm last:border-b-0">
              <p className="font-medium text-slate-900">{line.description}</p>
              <div className="grid gap-2 md:grid-cols-6">
                <input type="number" min="0.001" step="0.001" className="rounded border p-2" value={qty} onChange={(event) => onChangePricing(line.id, 'quantity', Number(event.target.value))} />
                <input type="number" min="0" step="0.01" className="rounded border p-2" value={unitPrice} onChange={(event) => onChangePricing(line.id, 'unit_price', Number(event.target.value))} />
                <input type="number" min="0" step="0.01" className="rounded border p-2" value={discount} onChange={(event) => onChangePricing(line.id, 'discount', Number(event.target.value))} />
                <input type="number" min="0" max="100" step="0.01" className="rounded border p-2" value={vatRate} onChange={(event) => onChangePricing(line.id, 'vat_rate', Number(event.target.value))} />
                <p className="rounded border border-slate-200 bg-slate-50 p-2">Line total: {lineTotal.toFixed(2)}</p>
                <button
                  type="button"
                  onClick={() => onDeleteLine(line.id)}
                  className="rounded border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-base font-semibold">Totals</h2>
        <p>Subtotal: {quotation.currency} {quotation.subtotal.toFixed(2)}</p>
        <p>VAT: {quotation.currency} {quotation.vat_amount.toFixed(2)}</p>
        <p className="font-semibold">Total: {quotation.currency} {quotation.total.toFixed(2)}</p>
        <button type="button" onClick={onSavePricing} className="mt-3 rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-white">Save pricing</button>
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
