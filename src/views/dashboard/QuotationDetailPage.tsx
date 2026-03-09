'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { addQuotationLine, convertQuotationToSalesOrder, deleteQuotationLine, getQuotationDetail, updateQuotationLines } from '@/lib/crmApi';
import type { CurrencyCode, Quotation, QuotationLine } from '@/types/crm';

type QuotationDetailPageProps = {
  id: string;
};

type EditablePricingLine = Pick<QuotationLine, 'id' | 'quantity' | 'supplier_cost' | 'supplier_currency' | 'exchange_rate' | 'landed_aed_cost' | 'margin_pct' | 'unit_price' | 'discount_pct' | 'discount' | 'vat_rate'> & {
  description: string;
};

const toNumber = (value: unknown, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const computeSellPrice = (landedAedCost: number, marginPct: number) => landedAedCost * (1 + marginPct / 100);

const QuotationDetailPage = ({ id }: QuotationDetailPageProps) => {
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [lines, setLines] = useState<QuotationLine[]>([]);
  const [editableLines, setEditableLines] = useState<EditablePricingLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [salesOrderId, setSalesOrderId] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [bulkMarginPct, setBulkMarginPct] = useState(0);
  const [globalDiscountPct, setGlobalDiscountPct] = useState(0);
  const searchParams = useSearchParams();

  const load = () => getQuotationDetail(id).then(({ quotation, lines }) => {
    setQuotation(quotation);
    setLines(lines);
    setEditableLines(lines.map((line) => ({
      id: line.id,
      description: line.description,
      quantity: toNumber(line.quantity),
      supplier_cost: toNumber(line.supplier_cost),
      supplier_currency: line.supplier_currency,
      exchange_rate: toNumber(line.exchange_rate, 1),
      landed_aed_cost: toNumber(line.landed_aed_cost),
      margin_pct: toNumber(line.margin_pct),
      unit_price: toNumber(line.unit_price),
      discount_pct: toNumber(line.discount_pct),
      discount: toNumber(line.discount),
      vat_rate: toNumber(line.vat_rate)
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
        supplierCost: Number(form.get('supplierCost') ?? 0),
        supplierCurrency: String(form.get('supplierCurrency') ?? 'AED') as CurrencyCode,
        exchangeRate: Number(form.get('exchangeRate') ?? 1),
        landedAedCost: Number(form.get('landedAedCost') ?? 0),
        marginPct: Number(form.get('marginPct') ?? 0),
        currency: String(form.get('currency')) as CurrencyCode,
        vatRate: Number(form.get('vatRate')),
        isZeroRated: false,
        isExempt: false,
        discountPct: Number(form.get('discountPct') ?? 0),
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

  const onChangePricing = (lineId: string, field: keyof Omit<EditablePricingLine, 'id' | 'description'>, value: string | number) => {
    setEditableLines((previous) => previous.map((line) => {
      if (line.id !== lineId) return line;
      if (field === 'supplier_currency') return { ...line, supplier_currency: String(value) as CurrencyCode };

      const next = { ...line, [field]: toNumber(value) } as EditablePricingLine;
      if (field === 'supplier_cost' || field === 'exchange_rate') {
        next.landed_aed_cost = Number((next.supplier_cost * next.exchange_rate).toFixed(2));
      }
      if (field === 'landed_aed_cost' || field === 'margin_pct' || field === 'supplier_cost' || field === 'exchange_rate') {
        next.unit_price = Number(computeSellPrice(next.landed_aed_cost, next.margin_pct).toFixed(2));
      }
      if (field === 'discount_pct') {
        next.discount = Number((next.quantity * next.unit_price * (next.discount_pct / 100)).toFixed(2));
      }
      return next;
    }));
  };

  const onBulkApply = () => {
    setEditableLines((previous) => previous.map((line) => {
      const unitPrice = Number(computeSellPrice(line.landed_aed_cost, bulkMarginPct).toFixed(2));
      const discount = Number((line.quantity * unitPrice * (globalDiscountPct / 100)).toFixed(2));
      return {
        ...line,
        margin_pct: bulkMarginPct,
        unit_price: unitPrice,
        discount_pct: globalDiscountPct,
        discount
      };
    }));
    setSaveMessage('Bulk margin/discount applied. You can still adjust any line before saving.');
  };

  const onImportPricing = async (event: FormEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const XLSX = await import('xlsx');
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

      setEditableLines((previous) => previous.map((line, index) => {
        const row = rows[index] ?? {};
        const supplierCost = toNumber(row.supplier_cost ?? row.supplierCost, line.supplier_cost);
        const exchangeRate = toNumber(row.exchange_rate ?? row.exchangeRate, line.exchange_rate || 1);
        const landedAedCost = toNumber(row.landed_aed_cost ?? row.landedAedCost, supplierCost * exchangeRate);
        const marginPct = toNumber(row.margin_pct ?? row.marginPct, line.margin_pct);
        const unitPrice = Number(computeSellPrice(landedAedCost, marginPct).toFixed(2));
        const discountPct = toNumber(row.discount_pct ?? row.discountPct, line.discount_pct);
        const discount = Number((line.quantity * unitPrice * (discountPct / 100)).toFixed(2));

        return {
          ...line,
          supplier_cost: supplierCost,
          supplier_currency: String(row.supplier_currency ?? row.supplierCurrency ?? line.supplier_currency) as CurrencyCode,
          exchange_rate: exchangeRate,
          landed_aed_cost: landedAedCost,
          margin_pct: marginPct,
          unit_price: unitPrice,
          discount_pct: discountPct,
          discount,
          vat_rate: toNumber(row.vat_rate ?? row.vatRate, line.vat_rate)
        };
      }));
      setSaveMessage('Supplier pricing imported from file (sheet row order mapped to line order).');
      input.value = '';
    } catch (err) {
      setError(`Unable to import pricing file: ${(err as Error).message}`);
    }
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

  const onClientPdf = () => {
    if (!quotation) return;
    const linesHtml = editableLines.map((line) => {
      const base = line.quantity * line.unit_price;
      const discount = line.discount > 0 ? line.discount : base * (line.discount_pct / 100);
      const taxable = Math.max(0, base - discount);
      const vat = taxable * (line.vat_rate / 100);
      const total = taxable + vat;
      return `<tr><td>${line.description}</td><td>${line.quantity}</td><td>${line.unit_price.toFixed(2)}</td><td>${discount.toFixed(2)}</td><td>${line.vat_rate.toFixed(2)}%</td><td>${total.toFixed(2)}</td></tr>`;
    }).join('');
    const printable = window.open('', '_blank', 'width=900,height=700');
    if (!printable) return;
    printable.document.write(`<html><body><h1>Quotation ${quotation.document_number}</h1><table border="1" cellspacing="0" cellpadding="6"><thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Discount</th><th>VAT</th><th>Line Total</th></tr></thead><tbody>${linesHtml}</tbody></table><p>Subtotal: ${liveTotals.subtotal.toFixed(2)}</p><p>VAT: ${liveTotals.vat.toFixed(2)}</p><p><strong>Grand Total: ${liveTotals.total.toFixed(2)}</strong></p></body></html>`);
    printable.document.close();
    printable.print();
  };

  const liveTotals = useMemo(() => editableLines.reduce((acc, line) => {
    const base = line.quantity * line.unit_price;
    const discount = line.discount > 0 ? line.discount : base * (line.discount_pct / 100);
    const taxable = Math.max(0, base - discount);
    const vat = taxable * (line.vat_rate / 100);
    return { subtotal: acc.subtotal + taxable, vat: acc.vat + vat, total: acc.total + taxable + vat };
  }, { subtotal: 0, vat: 0, total: 0 }), [editableLines]);

  if (!quotation) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">{quotation.document_number}</h1>
        <div className="flex gap-2">
          <button type="button" onClick={onClientPdf} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium">Client PDF</button>
          <button type="button" onClick={onConvert} className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-white">Convert to sales order</button>
        </div>
      </div>
      {createdMessage ? <p className="text-sm text-emerald-700">{createdMessage}</p> : null}
      {salesOrderId ? <p className="text-sm text-emerald-700">Sales order created: {salesOrderId}</p> : null}
      {saveMessage ? <p className="text-sm text-emerald-700">{saveMessage}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {quotation.enquiry_id ? <Link className="text-sm text-primary underline" href={`/dashboard/enquiries/${quotation.enquiry_id}`}>Back to enquiry</Link> : null}

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 grid gap-2 md:grid-cols-4">
          <input type="number" step="0.01" className="rounded border p-2" placeholder="Bulk margin %" value={bulkMarginPct} onChange={(e) => setBulkMarginPct(toNumber(e.target.value))} />
          <input type="number" step="0.01" className="rounded border p-2" placeholder="Global discount %" value={globalDiscountPct} onChange={(e) => setGlobalDiscountPct(toNumber(e.target.value))} />
          <button type="button" className="rounded border px-2 py-1" onClick={onBulkApply}>Apply to all lines</button>
          <input type="file" accept=".csv,.xlsx,.xls" className="rounded border p-2" onInput={onImportPricing} />
        </div>

        {lines.map((line) => {
          const editableLine = editableLines.find((item) => item.id === line.id);
          if (!editableLine) return null;
          const taxable = Math.max(0, editableLine.quantity * editableLine.unit_price - editableLine.discount);
          const lineTotal = taxable + taxable * editableLine.vat_rate / 100;

          return (
            <div key={line.id} className="space-y-2 border-b py-3 text-sm last:border-b-0">
              <p className="font-medium text-slate-900">{line.description}</p>
              <div className="grid gap-2 md:grid-cols-6">
                <input type="number" step="0.001" className="rounded border p-2" value={editableLine.quantity} onChange={(event) => onChangePricing(line.id, 'quantity', event.target.value)} />
                <input type="number" step="0.01" className="rounded border p-2" value={editableLine.supplier_cost} onChange={(event) => onChangePricing(line.id, 'supplier_cost', event.target.value)} placeholder="Supplier cost" />
                <select className="rounded border p-2" value={editableLine.supplier_currency} onChange={(event) => onChangePricing(line.id, 'supplier_currency', event.target.value)}>
                  <option value="AED">AED</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option>
                </select>
                <input type="number" step="0.0001" className="rounded border p-2" value={editableLine.exchange_rate} onChange={(event) => onChangePricing(line.id, 'exchange_rate', event.target.value)} placeholder="FX" />
                <input type="number" step="0.01" className="rounded border p-2" value={editableLine.landed_aed_cost} onChange={(event) => onChangePricing(line.id, 'landed_aed_cost', event.target.value)} placeholder="Landed AED" />
                <input type="number" step="0.01" className="rounded border p-2" value={editableLine.margin_pct} onChange={(event) => onChangePricing(line.id, 'margin_pct', event.target.value)} placeholder="Margin %" />
                <input type="number" step="0.01" className="rounded border p-2" value={editableLine.unit_price} onChange={(event) => onChangePricing(line.id, 'unit_price', event.target.value)} placeholder="Sell price" />
                <input type="number" step="0.01" className="rounded border p-2" value={editableLine.discount_pct} onChange={(event) => onChangePricing(line.id, 'discount_pct', event.target.value)} placeholder="Discount %" />
                <input type="number" step="0.01" className="rounded border p-2" value={editableLine.discount} onChange={(event) => onChangePricing(line.id, 'discount', event.target.value)} placeholder="Discount amount" />
                <input type="number" step="0.01" className="rounded border p-2" value={editableLine.vat_rate} onChange={(event) => onChangePricing(line.id, 'vat_rate', event.target.value)} placeholder="VAT %" />
                <p className="rounded border border-slate-200 bg-slate-50 p-2">Line total: {lineTotal.toFixed(2)}</p>
                <button type="button" onClick={() => onDeleteLine(line.id)} className="rounded border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50">Delete</button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-base font-semibold">Totals</h2>
        <p>Subtotal: {quotation.currency} {liveTotals.subtotal.toFixed(2)}</p>
        <p>VAT: {quotation.currency} {liveTotals.vat.toFixed(2)}</p>
        <p className="font-semibold">Grand Total: {quotation.currency} {liveTotals.total.toFixed(2)}</p>
        <button type="button" onClick={onSavePricing} className="mt-3 rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-white">Save pricing</button>
      </div>

      <form onSubmit={onAddLine} className="grid gap-2 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-6">
        <input name="description" className="rounded border p-2 md:col-span-2" placeholder="Description" required />
        <input name="quantity" type="number" min="0.001" step="0.001" className="rounded border p-2" placeholder="Qty" required />
        <input name="supplierCost" type="number" min="0" step="0.01" className="rounded border p-2" placeholder="Supplier cost" defaultValue="0" required />
        <input name="exchangeRate" type="number" min="0.0001" step="0.0001" className="rounded border p-2" placeholder="FX" defaultValue="1" required />
        <input name="landedAedCost" type="number" min="0" step="0.01" className="rounded border p-2" placeholder="Landed AED" defaultValue="0" required />
        <input name="marginPct" type="number" min="0" step="0.01" className="rounded border p-2" placeholder="Margin %" defaultValue="0" required />
        <input name="unitPrice" type="number" min="0" step="0.01" className="rounded border p-2" placeholder="Sell price" required />
        <input name="discountPct" type="number" min="0" step="0.01" className="rounded border p-2" placeholder="Discount %" defaultValue="0" required />
        <input name="discount" type="number" min="0" step="0.01" className="rounded border p-2" placeholder="Discount" defaultValue="0" required />
        <button className="rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-white" type="submit">Add line</button>
        <input type="hidden" name="supplierCurrency" value="AED" />
        <input type="hidden" name="currency" value="AED" />
        <input type="hidden" name="vatRate" value="5" />
      </form>
    </div>
  );
};

export default QuotationDetailPage;
