'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listSupplierPurchaseOrders } from '@/lib/crmApi';
import type { SupplierPurchaseOrder } from '@/types/crm';
import { formatIsoDate } from '@/utils/date';

const SupplierPurchaseOrdersListPage = () => {
  const [rows, setRows] = useState<SupplierPurchaseOrder[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listSupplierPurchaseOrders().then(setRows).catch((err: Error) => setError(err.message));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Supplier Purchase Orders</h1>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full table-auto text-left text-xs text-slate-600">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">SPO Number</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Supplier</th>
              <th className="px-3 py-2">Sales Order</th>
              <th className="px-3 py-2">Expected Delivery</th>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((po) => (
              <tr key={po.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-2 font-semibold text-slate-900"><Link href={`/dashboard/supplier-purchase-orders/${po.id}`} className="text-primary hover:underline">{po.document_number}</Link></td>
                <td className="px-3 py-2">{formatIsoDate(po.issue_date)}</td>
                <td className="px-3 py-2">{po.supplier_name || '-'}</td>
                <td className="px-3 py-2">{po.related_sales_order_id || '-'}</td>
                <td className="px-3 py-2">{po.expected_delivery ? formatIsoDate(po.expected_delivery) : '-'}</td>
                <td className="px-3 py-2">{po.currency} {po.total.toFixed(2)}</td>
                <td className="px-3 py-2 uppercase">{po.status}</td>
              </tr>
            ))}
            {!rows.length ? <tr><td className="px-3 py-4 text-sm text-slate-500" colSpan={7}>No supplier purchase orders yet.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SupplierPurchaseOrdersListPage;
