'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { addQuotationLine, convertQuotationToSalesOrder, deleteQuotationLine, getQuotationDetail, updateQuotationCommercialTerms, updateQuotationLines } from '@/lib/crmApi';
import type { CurrencyCode, Quotation, QuotationLine } from '@/types/crm';
import { DOCUMENT_TEMPLATE_CONFIG } from '@/config/documentTemplateConfig';
import { renderAnvaDocumentHtml } from '@/services/documents/anvaDocumentTemplate';

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

const DELIVERY_TERMS_OPTIONS = ['EXW', 'FCA', 'FOB', 'CFR', 'CIF', 'DAP', 'DDP'];
const PAYMENT_TERMS_OPTIONS = ['Advance Payment', 'Net 15', 'Net 30', 'Net 45', 'COD'];

type CommercialTermsForm = {
  termsAndConditions: string;
  deliveryTerms: string;
  deliveryTime: string;
  paymentTerms: string;
  partsOrigin: string;
  partsQuality: string;
  companyLetterheadEnabled: boolean;
  stampEnabled: boolean;
  signatureEnabled: boolean;
  customerReference: string;
  customerTrn: string;
  companyTrn: string;
  picDetails: string;
  additionalNotes: string;
  validity: string;
};

const QuotationDetailPage = ({ id }: QuotationDetailPageProps) => {
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [lines, setLines] = useState<QuotationLine[]>([]);
  const [editableLines, setEditableLines] = useState<EditablePricingLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [salesOrderId, setSalesOrderId] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [bulkMarginPct, setBulkMarginPct] = useState(0);
  const [globalDiscountPct, setGlobalDiscountPct] = useState(0);
  const [pricingActionsOpen, setPricingActionsOpen] = useState(false);
  const [commercialTerms, setCommercialTerms] = useState<CommercialTermsForm>({
    termsAndConditions: '',
    deliveryTerms: '',
    deliveryTime: '',
    paymentTerms: '',
    partsOrigin: '',
    partsQuality: '',
    companyLetterheadEnabled: true,
    stampEnabled: true,
    signatureEnabled: false,
    customerReference: '',
    customerTrn: '',
    companyTrn: '',
    picDetails: '',
    additionalNotes: '',
    validity: ''
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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
    setCommercialTerms({
      termsAndConditions: quotation.terms_and_conditions ?? '',
      deliveryTerms: quotation.delivery_terms ?? '',
      deliveryTime: quotation.delivery_time ?? '',
      paymentTerms: quotation.payment_terms ?? '',
      partsOrigin: quotation.parts_origin ?? '',
      partsQuality: quotation.parts_quality ?? '',
      companyLetterheadEnabled: quotation.letterhead_enabled ?? quotation.company_letterhead_enabled ?? true,
      stampEnabled: quotation.stamp_enabled ?? true,
      signatureEnabled: quotation.signature_enabled ?? false,
      customerReference: quotation.customer_reference ?? '',
      customerTrn: quotation.customer_trn ?? '',
      companyTrn: quotation.company_trn ?? '',
      picDetails: quotation.pic_details ?? '',
      additionalNotes: quotation.additional_notes ?? '',
      validity: quotation.validity ?? ''
    });
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

  const openPricingAction = (action: 'manual' | 'excel') => {
    setPricingActionsOpen(false);
    if (action === 'manual') {
      setSaveMessage('Manual line-by-line supplier pricing is ready below.');
      return;
    }
    fileInputRef.current?.click();
  };

  const onImportPricing = async (event: FormEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const loadSpreadsheetModule = new Function('moduleName', 'return import(moduleName);') as (moduleName: string) => Promise<any>;
      const XLSX = await loadSpreadsheetModule('xlsx');
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Array<Record<string, unknown>>;

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
      const message = (err as Error).message;
      if (message.includes("Cannot find module") || message.includes("Can't resolve")) {
        setError('Unable to load Excel parser (xlsx). Please run npm install and redeploy.');
      } else {
        setError(`Unable to import pricing file: ${message}`);
      }
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
    const printable = window.open('', '_blank', 'width=900,height=700');
    if (!printable) return;

    const html = renderAnvaDocumentHtml({
      kind: 'quotation',
      config: DOCUMENT_TEMPLATE_CONFIG.quotation,
      documentNumber: quotation.document_number,
      issueDate: new Date().toISOString().slice(0, 10),
      recipientName: quotation.client_name ?? '',
      meta: {
        customer_reference: commercialTerms.customerReference,
        validity: commercialTerms.validity,
        customer_trn: commercialTerms.customerTrn,
        company_trn: commercialTerms.companyTrn,
        pic_details: commercialTerms.picDetails
      },
      rows: editableLines.map((line, index) => {
        const base = line.quantity * line.unit_price;
        const discount = line.discount > 0 ? line.discount : base * (line.discount_pct / 100);
        const taxable = Math.max(0, base - discount);
        const vat = taxable * (line.vat_rate / 100);
        return {
          serial: String(index + 1),
          partNumber: '-',
          description: line.description,
          quantity: line.quantity.toFixed(2),
          unitPrice: line.unit_price.toFixed(2),
          discount: discount.toFixed(2),
          netPrice: taxable.toFixed(2),
          vat: line.vat_rate.toFixed(2),
          totalPrice: (taxable + vat).toFixed(2)
        };
      }),
      totals: {
        subtotal: liveTotals.subtotal.toFixed(2),
        vatAmount: liveTotals.vat.toFixed(2),
        grandTotal: liveTotals.total.toFixed(2)
      },
      terms: {
        payment_terms: commercialTerms.paymentTerms,
        delivery_terms: commercialTerms.deliveryTerms,
        delivery_time: commercialTerms.deliveryTime,
        parts_origin: commercialTerms.partsOrigin,
        parts_quality: commercialTerms.partsQuality,
        terms_and_conditions: commercialTerms.termsAndConditions,
        additional_notes: commercialTerms.additionalNotes
      },
      letterheadEnabled: commercialTerms.companyLetterheadEnabled,
      stampEnabled: commercialTerms.stampEnabled,
      signatureEnabled: commercialTerms.signatureEnabled,
      logoPath: '/branding/anva-logo.svg',
      stampPath: '/branding/anva-stamp.svg'
    });

    printable.document.write(html);
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

  const onSaveCommercialTerms = async () => {
    try {
      setError(null);
      setSaveMessage(null);
      await updateQuotationCommercialTerms(id, commercialTerms);
      await load();
      setSaveMessage('Commercial terms saved.');
    } catch (err) {
      setError((err as Error).message);
    }
  };

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
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">Commercial Terms</h2>
          <button type="button" onClick={onSaveCommercialTerms} className="rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-white">Save commercial terms</button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-xs font-medium text-slate-600 md:col-span-2">
            <span>Terms & Conditions</span>
            <textarea className="min-h-24 w-full rounded border p-2 text-sm" value={commercialTerms.termsAndConditions} onChange={(event) => setCommercialTerms((prev) => ({ ...prev, termsAndConditions: event.target.value }))} />
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-600">
            <span>Delivery Terms</span>
            <input list="delivery-terms-options" className="w-full rounded border p-2 text-sm" value={commercialTerms.deliveryTerms} onChange={(event) => setCommercialTerms((prev) => ({ ...prev, deliveryTerms: event.target.value }))} />
            <datalist id="delivery-terms-options">{DELIVERY_TERMS_OPTIONS.map((option) => <option key={option} value={option} />)}</datalist>
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-600">
            <span>Payment Terms</span>
            <input list="payment-terms-options" className="w-full rounded border p-2 text-sm" value={commercialTerms.paymentTerms} onChange={(event) => setCommercialTerms((prev) => ({ ...prev, paymentTerms: event.target.value }))} />
            <datalist id="payment-terms-options">{PAYMENT_TERMS_OPTIONS.map((option) => <option key={option} value={option} />)}</datalist>
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-600"><span>Delivery Time</span><input className="w-full rounded border p-2 text-sm" value={commercialTerms.deliveryTime} onChange={(event) => setCommercialTerms((prev) => ({ ...prev, deliveryTime: event.target.value }))} /></label>
          <label className="space-y-1 text-xs font-medium text-slate-600"><span>Validity</span><input className="w-full rounded border p-2 text-sm" value={commercialTerms.validity} onChange={(event) => setCommercialTerms((prev) => ({ ...prev, validity: event.target.value }))} /></label>
          <label className="space-y-1 text-xs font-medium text-slate-600"><span>Customer Reference</span><input className="w-full rounded border p-2 text-sm" value={commercialTerms.customerReference} onChange={(event) => setCommercialTerms((prev) => ({ ...prev, customerReference: event.target.value }))} /></label>
          <label className="space-y-1 text-xs font-medium text-slate-600"><span>Customer TRN</span><input className="w-full rounded border p-2 text-sm" value={commercialTerms.customerTrn} onChange={(event) => setCommercialTerms((prev) => ({ ...prev, customerTrn: event.target.value }))} /></label>
          <label className="space-y-1 text-xs font-medium text-slate-600"><span>Company TRN</span><input className="w-full rounded border p-2 text-sm" value={commercialTerms.companyTrn} onChange={(event) => setCommercialTerms((prev) => ({ ...prev, companyTrn: event.target.value }))} /></label>
          <label className="space-y-1 text-xs font-medium text-slate-600 md:col-span-2"><span>PIC Details</span><input className="w-full rounded border p-2 text-sm" value={commercialTerms.picDetails} onChange={(event) => setCommercialTerms((prev) => ({ ...prev, picDetails: event.target.value }))} /></label>
          <label className="space-y-1 text-xs font-medium text-slate-600 md:col-span-2"><span>Additional Notes</span><textarea className="min-h-20 w-full rounded border p-2 text-sm" value={commercialTerms.additionalNotes} onChange={(event) => setCommercialTerms((prev) => ({ ...prev, additionalNotes: event.target.value }))} /></label>
          <label className="space-y-1 text-xs font-medium text-slate-600"><span>Parts Origin</span><input className="w-full rounded border p-2 text-sm" value={commercialTerms.partsOrigin} onChange={(event) => setCommercialTerms((prev) => ({ ...prev, partsOrigin: event.target.value }))} /></label>
          <label className="space-y-1 text-xs font-medium text-slate-600"><span>Parts Quality</span><input className="w-full rounded border p-2 text-sm" value={commercialTerms.partsQuality} onChange={(event) => setCommercialTerms((prev) => ({ ...prev, partsQuality: event.target.value }))} /></label>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600 md:col-span-2">
            <input type="checkbox" checked={commercialTerms.companyLetterheadEnabled} onChange={(event) => setCommercialTerms((prev) => ({ ...prev, companyLetterheadEnabled: event.target.checked }))} />
            <span>Use company letterhead for print/PDF output</span>
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600 md:col-span-2">
            <input type="checkbox" checked={commercialTerms.stampEnabled} onChange={(event) => setCommercialTerms((prev) => ({ ...prev, stampEnabled: event.target.checked }))} />
            <span>Show company stamp</span>
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600 md:col-span-2">
            <input type="checkbox" checked={commercialTerms.signatureEnabled} onChange={(event) => setCommercialTerms((prev) => ({ ...prev, signatureEnabled: event.target.checked }))} />
            <span>Show signature block</span>
          </label>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 grid gap-2 md:grid-cols-4">
          <label className="space-y-1 text-xs font-medium text-slate-600">
            <span>Bulk margin %</span>
            <input type="number" step="0.01" className="w-full rounded border p-2 text-sm" value={bulkMarginPct} onChange={(e) => setBulkMarginPct(toNumber(e.target.value))} />
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-600">
            <span>Global discount %</span>
            <input type="number" step="0.01" className="w-full rounded border p-2 text-sm" value={globalDiscountPct} onChange={(e) => setGlobalDiscountPct(toNumber(e.target.value))} />
          </label>
          <button type="button" className="rounded border px-2 py-1" onClick={onBulkApply}>Apply to all lines</button>
          <div className="relative">
            <button
              type="button"
              className="rounded border px-3 py-2 text-sm font-medium"
              onClick={() => setPricingActionsOpen((prev) => !prev)}
            >
              Add supplier pricing
            </button>
            {pricingActionsOpen ? (
              <div className="absolute right-0 z-10 mt-2 w-56 rounded-md border border-slate-200 bg-white p-2 shadow">
                <button type="button" onClick={() => openPricingAction('manual')} className="block w-full rounded px-2 py-2 text-left text-sm hover:bg-slate-50">Enter manually</button>
                <button type="button" onClick={() => openPricingAction('excel')} className="block w-full rounded px-2 py-2 text-left text-sm hover:bg-slate-50">Import Excel / CSV</button>
                <p className="mt-2 text-xs text-slate-500">Coming soon: PDF import, text import, AI quote recognition.</p>
              </div>
            ) : null}
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onInput={onImportPricing} />
          </div>
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
                <label className="space-y-1 text-xs font-medium text-slate-600">
                  <span>Quantity</span>
                  <input type="number" step="0.001" className="w-full rounded border p-2 text-sm" value={editableLine.quantity} onChange={(event) => onChangePricing(line.id, 'quantity', event.target.value)} />
                </label>
                <label className="space-y-1 text-xs font-medium text-slate-600">
                  <span>Supplier cost</span>
                  <input type="number" step="0.01" className="w-full rounded border p-2 text-sm" value={editableLine.supplier_cost} onChange={(event) => onChangePricing(line.id, 'supplier_cost', event.target.value)} />
                </label>
                <label className="space-y-1 text-xs font-medium text-slate-600">
                  <span>Supplier currency</span>
                  <select className="w-full rounded border p-2 text-sm" value={editableLine.supplier_currency} onChange={(event) => onChangePricing(line.id, 'supplier_currency', event.target.value)}>
                    <option value="AED">AED</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option>
                  </select>
                </label>
                <label className="space-y-1 text-xs font-medium text-slate-600">
                  <span>Exchange rate (FX)</span>
                  <input type="number" step="0.0001" className="w-full rounded border p-2 text-sm" value={editableLine.exchange_rate} onChange={(event) => onChangePricing(line.id, 'exchange_rate', event.target.value)} />
                </label>
                <label className="space-y-1 text-xs font-medium text-slate-600">
                  <span>Landed AED cost</span>
                  <input type="number" step="0.01" className="w-full rounded border p-2 text-sm" value={editableLine.landed_aed_cost} onChange={(event) => onChangePricing(line.id, 'landed_aed_cost', event.target.value)} />
                </label>
                <label className="space-y-1 text-xs font-medium text-slate-600">
                  <span>Margin %</span>
                  <input type="number" step="0.01" className="w-full rounded border p-2 text-sm" value={editableLine.margin_pct} onChange={(event) => onChangePricing(line.id, 'margin_pct', event.target.value)} />
                </label>
                <label className="space-y-1 text-xs font-medium text-slate-600">
                  <span>Sell price</span>
                  <input type="number" step="0.01" className="w-full rounded border p-2 text-sm" value={editableLine.unit_price} onChange={(event) => onChangePricing(line.id, 'unit_price', event.target.value)} />
                </label>
                <label className="space-y-1 text-xs font-medium text-slate-600">
                  <span>Discount %</span>
                  <input type="number" step="0.01" className="w-full rounded border p-2 text-sm" value={editableLine.discount_pct} onChange={(event) => onChangePricing(line.id, 'discount_pct', event.target.value)} />
                </label>
                <label className="space-y-1 text-xs font-medium text-slate-600">
                  <span>Discount amount</span>
                  <input type="number" step="0.01" className="w-full rounded border p-2 text-sm" value={editableLine.discount} onChange={(event) => onChangePricing(line.id, 'discount', event.target.value)} />
                </label>
                <label className="space-y-1 text-xs font-medium text-slate-600">
                  <span>VAT %</span>
                  <input type="number" step="0.01" className="w-full rounded border p-2 text-sm" value={editableLine.vat_rate} onChange={(event) => onChangePricing(line.id, 'vat_rate', event.target.value)} />
                </label>
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
        <label className="space-y-1 text-xs font-medium text-slate-600 md:col-span-2"><span>Description</span><input name="description" className="w-full rounded border p-2 text-sm" required /></label>
        <label className="space-y-1 text-xs font-medium text-slate-600"><span>Quantity</span><input name="quantity" type="number" min="0.001" step="0.001" className="w-full rounded border p-2 text-sm" required /></label>
        <label className="space-y-1 text-xs font-medium text-slate-600"><span>Supplier cost</span><input name="supplierCost" type="number" min="0" step="0.01" className="w-full rounded border p-2 text-sm" defaultValue="0" required /></label>
        <label className="space-y-1 text-xs font-medium text-slate-600"><span>Exchange rate (FX)</span><input name="exchangeRate" type="number" min="0.0001" step="0.0001" className="w-full rounded border p-2 text-sm" defaultValue="1" required /></label>
        <label className="space-y-1 text-xs font-medium text-slate-600"><span>Landed AED cost</span><input name="landedAedCost" type="number" min="0" step="0.01" className="w-full rounded border p-2 text-sm" defaultValue="0" required /></label>
        <label className="space-y-1 text-xs font-medium text-slate-600"><span>Margin %</span><input name="marginPct" type="number" min="0" step="0.01" className="w-full rounded border p-2 text-sm" defaultValue="0" required /></label>
        <label className="space-y-1 text-xs font-medium text-slate-600"><span>Sell price</span><input name="unitPrice" type="number" min="0" step="0.01" className="w-full rounded border p-2 text-sm" required /></label>
        <label className="space-y-1 text-xs font-medium text-slate-600"><span>Discount %</span><input name="discountPct" type="number" min="0" step="0.01" className="w-full rounded border p-2 text-sm" defaultValue="0" required /></label>
        <label className="space-y-1 text-xs font-medium text-slate-600"><span>Discount amount</span><input name="discount" type="number" min="0" step="0.01" className="w-full rounded border p-2 text-sm" defaultValue="0" required /></label>
        <button className="rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-white" type="submit">Add line</button>
        <input type="hidden" name="supplierCurrency" value="AED" />
        <input type="hidden" name="currency" value="AED" />
        <input type="hidden" name="vatRate" value="5" />
      </form>
    </div>
  );
};

export default QuotationDetailPage;
