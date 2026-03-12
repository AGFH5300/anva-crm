'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  convertSalesOrderToInvoice,
  createClient,
  createSupplierPurchaseOrderFromSalesOrder,
  getSalesOrderDetail,
  listSupplierPurchaseOrdersBySalesOrder,
  listVendorClients,
  updateSalesOrderClientPoNumber
} from '@/lib/crmApi';
import type { SalesOrder, SalesOrderLine, SupplierPurchaseOrder } from '@/types/crm';

type SalesOrderDetailPageProps = { id: string };
type DraftPoLine = {
  sourceSalesOrderItemId: string;
  description: string;
  quantity: number;
  supplierCost: number;
  supplierCurrency: 'AED' | 'USD' | 'EUR' | 'GBP';
  vatRate: number;
};

const SalesOrderDetailPage = ({ id }: SalesOrderDetailPageProps) => {
  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [lines, setLines] = useState<SalesOrderLine[]>([]);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [clientPoNumber, setClientPoNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [supplierOptions, setSupplierOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [supplierId, setSupplierId] = useState('');
  const [newSupplierName, setNewSupplierName] = useState('');
  const [supplierReference, setSupplierReference] = useState('');
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [poNotes, setPoNotes] = useState('');
  const [createdPoId, setCreatedPoId] = useState<string | null>(null);
  const [showCreatePo, setShowCreatePo] = useState(false);
  const [draftLines, setDraftLines] = useState<DraftPoLine[]>([]);
  const [linkedSupplierPos, setLinkedSupplierPos] = useState<SupplierPurchaseOrder[]>([]);

  const loadSupplierPos = () => listSupplierPurchaseOrdersBySalesOrder(id)
    .then(setLinkedSupplierPos)
    .catch((err: Error) => setError(err.message));

  useEffect(() => {
    getSalesOrderDetail(id)
      .then(({ order, lines }) => {
        setOrder(order);
        setLines(lines);
        setClientPoNumber(order.client_po_number || '');
        setDraftLines(lines.map((line) => ({
          sourceSalesOrderItemId: line.id,
          description: line.description,
          quantity: Number(line.quantity),
          supplierCost: Number(line.supplier_cost ?? line.unit_price ?? 0),
          supplierCurrency: line.supplier_currency ?? 'AED',
          vatRate: Number(line.vat_rate ?? 0),
        })));
      })
      .catch((err: Error) => setError(err.message));

    listVendorClients()
      .then((suppliers) => {
        setSupplierOptions(suppliers.map((item) => ({ id: item.id, name: item.name })));
      })
      .catch((err: Error) => setError(err.message));

    loadSupplierPos();
  }, [id]);

  const onConvert = async () => {
    try {
      setError(null);
      setInvoiceId(await convertSalesOrderToInvoice(id));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const onSaveClientPo = async () => {
    try {
      setError(null);
      const updated = await updateSalesOrderClientPoNumber(id, clientPoNumber);
      setOrder(updated);
      setClientPoNumber(updated.client_po_number || '');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const onAddSupplier = async () => {
    if (!newSupplierName.trim()) return;
    try {
      const created = await createClient({ name: newSupplierName, type: 'vendor' });
      setSupplierOptions((prev) => [...prev, { id: created.id, name: created.name }].sort((a, b) => a.name.localeCompare(b.name)));
      setSupplierId(created.id);
      setNewSupplierName('');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const updateDraftLine = (lineId: string, field: 'quantity' | 'supplierCost' | 'vatRate' | 'description' | 'supplierCurrency', value: string) => {
    setDraftLines((prev) => prev.map((line) => {
      if (line.sourceSalesOrderItemId !== lineId) return line;
      if (field === 'description') return { ...line, description: value };
      if (field === 'supplierCurrency') return { ...line, supplierCurrency: value as DraftPoLine['supplierCurrency'] };
      return { ...line, [field]: Number(value) };
    }));
  };

  const onCreateSupplierPo = async () => {
    if (!supplierId) {
      setError('Please choose a supplier before creating Supplier PO.');
      return;
    }

    const validLines = draftLines.filter((line) => line.quantity > 0);
    if (!validLines.length) {
      setError('Please keep at least one line with quantity greater than zero.');
      return;
    }

    try {
      setError(null);
      const poId = await createSupplierPurchaseOrderFromSalesOrder({
        salesOrderId: id,
        supplierId,
        supplierReference,
        expectedDelivery,
        notes: poNotes,
        lineItems: validLines,
      });
      setCreatedPoId(poId);
      setShowCreatePo(false);
      await loadSupplierPos();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (!order) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">{order.document_number}</h1>
        <button type="button" onClick={onConvert} className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-white">Convert to invoice</button>
      </div>
      {invoiceId ? <p className="text-sm text-emerald-700">Invoice created: {invoiceId}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Link className="text-sm text-primary underline" href="/dashboard/sales-orders">Back to sale orders</Link>
      <p className="text-sm text-slate-600">Client reference number: <span className="font-medium">{order.client_reference_number || '-'}</span></p>

      <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
        <p><span className="font-medium">Payment Terms:</span> {order.payment_terms || '-'}</p>
        <p><span className="font-medium">Delivery Terms:</span> {order.delivery_terms || '-'}</p>
        <p><span className="font-medium">Delivery Time:</span> {order.delivery_time || '-'}</p>
        <p><span className="font-medium">Validity:</span> {order.validity || '-'}</p>
        <p><span className="font-medium">Parts Origin:</span> {order.parts_origin || '-'}</p>
        <p><span className="font-medium">Parts Quality:</span> {order.parts_quality || '-'}</p>
        <p><span className="font-medium">Company TRN:</span> {order.company_trn || '-'}</p>
        <p><span className="font-medium">Customer TRN:</span> {order.customer_trn || '-'}</p>
        <p className="md:col-span-2"><span className="font-medium">PIC Details:</span> {order.pic_details || '-'}</p>
        <p className="md:col-span-2"><span className="font-medium">Terms & Conditions:</span> {order.terms_and_conditions || '-'}</p>
        <p className="md:col-span-2"><span className="font-medium">Additional Notes:</span> {order.additional_notes || '-'}</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Vendor Purchase Orders linked to this Sale Order</h2>
          <button type="button" onClick={() => setShowCreatePo((current) => !current)} className="rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white">
            {showCreatePo ? 'Close' : 'Create Vendor PO'}
          </button>
        </div>
        {linkedSupplierPos.length ? (
          <div className="space-y-2">
            {linkedSupplierPos.map((po) => (
              <p key={po.id} className="text-sm text-slate-700">
                <Link href={`/dashboard/supplier-purchase-orders/${po.id}`} className="font-medium text-primary underline">{po.document_number}</Link>
                {' '}• {po.supplier_name || po.supplier_id} • {po.status}
              </p>
            ))}
          </div>
        ) : <p className="text-sm text-slate-500">No vendor/supplier PO created yet.</p>}
      </div>

      {showCreatePo ? (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">Raise Supplier Purchase Order</h2>
          <label className="block space-y-1 text-xs font-medium text-slate-600">
            <span>Supplier</span>
            <select className="w-full rounded border p-2 text-sm" value={supplierId} onChange={(event) => setSupplierId(event.target.value)}>
              <option value="">Select supplier</option>
              {supplierOptions.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
            </select>
          </label>
          <div className="flex gap-2">
            <input className="flex-1 rounded border p-2 text-sm" placeholder="Add new supplier" value={newSupplierName} onChange={(event) => setNewSupplierName(event.target.value)} />
            <button type="button" className="rounded border border-slate-300 px-3 py-2 text-sm" onClick={onAddSupplier}>Add</button>
          </div>
          <input className="w-full rounded border p-2 text-sm" placeholder="Supplier reference (optional)" value={supplierReference} onChange={(event) => setSupplierReference(event.target.value)} />
          <input className="w-full rounded border p-2 text-sm" type="date" value={expectedDelivery} onChange={(event) => setExpectedDelivery(event.target.value)} />
          <textarea className="w-full rounded border p-2 text-sm" rows={2} placeholder="Notes / commercial terms" value={poNotes} onChange={(event) => setPoNotes(event.target.value)} />

          <div className="overflow-x-auto rounded border border-slate-200">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-2 py-2">Description</th>
                  <th className="px-2 py-2">Qty</th>
                  <th className="px-2 py-2">Supplier Cost</th>
                  <th className="px-2 py-2">Currency</th>
                  <th className="px-2 py-2">VAT %</th>
                </tr>
              </thead>
              <tbody>
                {draftLines.map((line) => (
                  <tr key={line.sourceSalesOrderItemId} className="border-t">
                    <td className="px-2 py-2"><input className="w-full rounded border p-1" value={line.description} onChange={(event) => updateDraftLine(line.sourceSalesOrderItemId, 'description', event.target.value)} /></td>
                    <td className="px-2 py-2"><input type="number" min="0" step="0.001" className="w-24 rounded border p-1" value={line.quantity} onChange={(event) => updateDraftLine(line.sourceSalesOrderItemId, 'quantity', event.target.value)} /></td>
                    <td className="px-2 py-2"><input type="number" min="0" step="0.01" className="w-28 rounded border p-1" value={line.supplierCost} onChange={(event) => updateDraftLine(line.sourceSalesOrderItemId, 'supplierCost', event.target.value)} /></td>
                    <td className="px-2 py-2"><select className="rounded border p-1" value={line.supplierCurrency} onChange={(event) => updateDraftLine(line.sourceSalesOrderItemId, 'supplierCurrency', event.target.value)}><option value="AED">AED</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option></select></td>
                    <td className="px-2 py-2"><input type="number" min="0" step="0.01" className="w-20 rounded border p-1" value={line.vatRate} onChange={(event) => updateDraftLine(line.sourceSalesOrderItemId, 'vatRate', event.target.value)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button type="button" onClick={onCreateSupplierPo} className="w-fit rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white">Create supplier PO from this sale order</button>
          {createdPoId ? <p className="text-sm text-emerald-700">Supplier PO created. <Link href={`/dashboard/supplier-purchase-orders/${createdPoId}`} className="underline">Open PO</Link></p> : null}
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        {lines.map((line) => (
          <p key={line.id} className="border-b py-2 text-sm last:border-b-0">{line.description} • Qty: {line.quantity}</p>
        ))}
      </div>

      <div className="max-w-sm space-y-2 rounded-xl border border-slate-200 bg-white p-4">
        <label className="block space-y-1 text-xs font-medium text-slate-600">
          <span>Client PO Number</span>
          <input className="w-full rounded border p-2 text-sm" value={clientPoNumber} onChange={(event) => setClientPoNumber(event.target.value)} />
        </label>
        <button type="button" onClick={onSaveClientPo} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium">Save client PO</button>
      </div>
    </div>
  );
};

export default SalesOrderDetailPage;
