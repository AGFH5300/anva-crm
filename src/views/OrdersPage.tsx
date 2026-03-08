'use client';

import { useCRMStore } from '@/store/useCRMStore';
import { formatCurrencyAED } from '@/config/uaeTax';
import { formatIsoDate } from '@/utils/date';

const OrdersPage = () => {
  const { orders } = useCRMStore();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Orders</h1>
        <p className="text-sm text-slate-500">
          Convert quotations to sales or purchase orders while maintaining document chains for audit readiness.
        </p>
      </div>
      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Order #</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Counterparty</th>
              <th className="px-4 py-3">Issued</th>
              <th className="px-4 py-3">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm text-slate-700">
            {orders.map((order) => (
              <tr key={order.id}>
                <td className="px-4 py-3 font-medium text-slate-900">{order.document.meta.documentNumber}</td>
                <td className="px-4 py-3 capitalize">{order.type}</td>
                <td className="px-4 py-3 capitalize">{order.status}</td>
                <td className="px-4 py-3">{order.document.recipient.name}</td>
                <td className="px-4 py-3">{formatIsoDate(order.document.meta.issueDate)}</td>
                <td className="px-4 py-3">{formatCurrencyAED(order.document.taxSummary.total)}</td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                  No orders yet. Confirm quotations to generate downstream documents.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OrdersPage;
