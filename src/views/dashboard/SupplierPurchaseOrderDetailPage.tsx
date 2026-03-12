'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSupplierPurchaseOrderDetail } from '@/lib/crmApi';
import type { SupplierPurchaseOrder, SupplierPurchaseOrderLine } from '@/types/crm';

const SupplierPurchaseOrderDetailPage = ({ id }: { id: string }) => {
  const [purchaseOrder, setPurchaseOrder] = useState<SupplierPurchaseOrder | null>(null);
  const [lines, setLines] = useState<SupplierPurchaseOrderLine[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSupplierPurchaseOrderDetail(id)
      .then((data) => {
        setPurchaseOrder(data.purchaseOrder);
        setLines(data.lines);
      })
      .catch((err: Error) => setError(err.message));
  }, [id]);

  if (!purchaseOrder) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">{purchaseOrder.document_number}</h1>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Link className="text-sm text-primary underline" href="/dashboard/supplier-purchase-orders">Back to supplier purchase orders</Link>
      <div className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
        <p><span className="font-medium">Supplier:</span> {purchaseOrder.supplier_name || purchaseOrder.supplier_id}</p>
        <p><span className="font-medium">Status:</span> {purchaseOrder.status}</p>
        <p><span className="font-medium">Linked Sale Order:</span> {purchaseOrder.related_sales_order_id || '-'}</p>
        <p><span className="font-medium">Expected Delivery:</span> {purchaseOrder.expected_delivery || '-'}</p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        {lines.map((line) => (
          <p key={line.id} className="border-b py-2 text-sm last:border-b-0">{line.description} • Qty: {line.quantity} • Cost: {line.supplier_currency} {line.supplier_cost.toFixed(2)}</p>
        ))}
      </div>
    </div>
  );
};

export default SupplierPurchaseOrderDetailPage;
