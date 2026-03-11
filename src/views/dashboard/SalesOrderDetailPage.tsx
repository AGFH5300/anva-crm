'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { convertSalesOrderToInvoice, getSalesOrderDetail, updateSalesOrderClientPoNumber } from '@/lib/crmApi';
import type { SalesOrder, SalesOrderLine } from '@/types/crm';

type SalesOrderDetailPageProps = { id: string };

const SalesOrderDetailPage = ({ id }: SalesOrderDetailPageProps) => {
  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [lines, setLines] = useState<SalesOrderLine[]>([]);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [clientPoNumber, setClientPoNumber] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSalesOrderDetail(id)
      .then(({ order, lines }) => {
        setOrder(order);
        setLines(lines);
        setClientPoNumber(order.client_po_number || '');
      })
      .catch((err: Error) => setError(err.message));
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
        <p><span className="font-medium">Company Letterhead:</span> {order.company_letterhead_enabled ? 'Yes' : 'No'}</p>
        <p><span className="font-medium">Stamp:</span> {order.stamp_enabled ? 'Yes' : 'No'}</p>
        <p><span className="font-medium">Signature:</span> {order.signature_enabled ? 'Yes' : 'No'}</p>
      </div>

      <div className="max-w-sm space-y-2 rounded-xl border border-slate-200 bg-white p-4">
        <label className="block space-y-1 text-xs font-medium text-slate-600">
          <span>Client PO Number</span>
          <input className="w-full rounded border p-2 text-sm" value={clientPoNumber} onChange={(event) => setClientPoNumber(event.target.value)} />
        </label>
        <button type="button" onClick={onSaveClientPo} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium">Save client PO</button>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        {lines.map((line) => (
          <p key={line.id} className="border-b py-2 text-sm last:border-b-0">{line.description} • Qty: {line.quantity}</p>
        ))}
      </div>
    </div>
  );
};

export default SalesOrderDetailPage;
