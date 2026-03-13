'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getInvoiceDetail, updateInvoice } from '@/lib/crmApi';
import type { Invoice, InvoiceLine } from '@/types/crm';
import { formatIsoDate } from '@/utils/date';

const INVOICE_STATUSES: Invoice['status'][] = ['draft', 'issued', 'paid', 'overdue', 'cancelled'];

const InvoiceDetailPage = ({ id }: { id: string }) => {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const [status, setStatus] = useState<Invoice['status']>('draft');
  const [dueDate, setDueDate] = useState('');
  const [clientPoNumber, setClientPoNumber] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const response = await getInvoiceDetail(id);
    setInvoice(response.invoice as Invoice);
    setLines(response.lines as InvoiceLine[]);
    setStatus(response.invoice.status as Invoice['status']);
    setDueDate(response.invoice.due_date ?? '');
    setClientPoNumber(response.invoice.client_po_number ?? '');
  };

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
  }, [id]);

  const onSave = async () => {
    try {
      setError(null);
      setMessage(null);
      await updateInvoice(id, { status, dueDate: dueDate || null, clientPoNumber });
      await load();
      setMessage('Invoice updated.');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (!invoice) return <p className="text-sm text-slate-500">Loading invoice…</p>;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h1 className="text-2xl font-semibold text-slate-900">Invoice {invoice.document_number}</h1>
        <p className="text-xs text-slate-500">Issue date: {formatIsoDate(invoice.issue_date)} · Client: {invoice.client_name || invoice.client_id}</p>
        {invoice.sales_order_document_number ? <p className="text-xs text-slate-500">From Sales Order: <Link href={`/dashboard/sales-orders/${invoice.sales_order_id}`} className="text-primary underline">{invoice.sales_order_document_number}</Link></p> : null}
      </div>

      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="max-w-sm space-y-2 rounded-xl border border-slate-200 bg-white p-4">
        <label className="block space-y-1 text-xs font-medium text-slate-600">
          <span>Status</span>
          <select className="w-full rounded border p-2 text-sm" value={status} onChange={(event) => setStatus(event.target.value as Invoice['status'])}>
            {INVOICE_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="block space-y-1 text-xs font-medium text-slate-600">
          <span>Due date</span>
          <input type="date" className="w-full rounded border p-2 text-sm" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
        </label>
        <label className="block space-y-1 text-xs font-medium text-slate-600">
          <span>Client PO Number</span>
          <input className="w-full rounded border p-2 text-sm" value={clientPoNumber} onChange={(event) => setClientPoNumber(event.target.value)} />
        </label>
        <button type="button" onClick={onSave} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium">Save invoice</button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        {lines.map((line) => (
          <p key={line.id} className="border-b py-2 text-sm last:border-b-0">{line.description} • Qty {line.quantity} • {line.currency} {line.line_total.toFixed(2)}</p>
        ))}
      </div>
    </div>
  );
};

export default InvoiceDetailPage;
