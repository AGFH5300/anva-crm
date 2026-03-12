'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSupplierPurchaseOrderDetail, updateSupplierPurchaseOrderStatus } from '@/lib/crmApi';
import type { SupplierPurchaseOrder, SupplierPurchaseOrderLine, SupplierPurchaseOrderStatus } from '@/types/crm';

const STATUS_OPTIONS: SupplierPurchaseOrderStatus[] = ['draft', 'sent', 'confirmed', 'partially_received', 'received', 'cancelled'];

const SupplierPurchaseOrderDetailPage = ({ id }: { id: string }) => {
  const [purchaseOrder, setPurchaseOrder] = useState<SupplierPurchaseOrder | null>(null);
  const [lines, setLines] = useState<SupplierPurchaseOrderLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<SupplierPurchaseOrderStatus>('draft');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    getSupplierPurchaseOrderDetail(id)
      .then((data) => {
        setPurchaseOrder(data.purchaseOrder);
        setStatus(data.purchaseOrder.status);
        setLines(data.lines);
      })
      .catch((err: Error) => setError(err.message));
  }, [id]);

  const onUpdateStatus = async () => {
    try {
      setError(null);
      setStatusMessage(null);
      await updateSupplierPurchaseOrderStatus(id, status);
      setPurchaseOrder((current) => current ? { ...current, status } : current);
      setStatusMessage('Supplier PO status updated successfully.');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (!purchaseOrder) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">{purchaseOrder.document_number}</h1>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {statusMessage ? <p className="text-sm text-emerald-700">{statusMessage}</p> : null}
      <Link className="text-sm text-primary underline" href="/dashboard/supplier-purchase-orders">Back to supplier purchase orders</Link>
      <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
        <p><span className="font-medium">Supplier:</span> {purchaseOrder.supplier_name || purchaseOrder.supplier_id}</p>
        <p><span className="font-medium">Status:</span> {purchaseOrder.status}</p>
        <p><span className="font-medium">Linked Sale Order:</span> {purchaseOrder.related_sales_order_document_number || purchaseOrder.related_sales_order_id || '-'}</p>
        <p><span className="font-medium">Expected Delivery:</span> {purchaseOrder.expected_delivery || '-'}</p>
        <p><span className="font-medium">Vendor Reference:</span> {purchaseOrder.vendor_reference || '-'}</p>
        <p><span className="font-medium">Notes:</span> {purchaseOrder.notes || '-'}</p>
      </div>
      <div className="flex items-end gap-2 rounded border border-slate-200 bg-white p-3">
        <label className="space-y-1 text-xs font-medium text-slate-600">
          <span>Update status</span>
          <select className="block rounded border p-2 text-sm" value={status} onChange={(event) => setStatus(event.target.value as SupplierPurchaseOrderStatus)}>
            {STATUS_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <button type="button" onClick={onUpdateStatus} className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white">Save status</button>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        {lines.map((line) => (
          <p key={line.id} className="border-b py-2 text-sm last:border-b-0">
            {line.description} • Qty: {line.quantity} • Cost: {line.supplier_currency} {line.supplier_cost.toFixed(2)}
            {line.source_sales_order_item_id ? ` • Source SO line: ${line.source_sales_order_item_id}` : ''}
          </p>
        ))}
      </div>
    </div>
  );
};

export default SupplierPurchaseOrderDetailPage;
