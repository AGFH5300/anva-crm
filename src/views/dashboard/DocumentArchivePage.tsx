'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { listAllEnquiries, listAllInvoices, listAllQuotations, listAllSalesOrders } from '@/lib/crmApi';
import type { Enquiry, Invoice, Quotation, SalesOrder } from '@/types/crm';
import { formatIsoDate } from '@/utils/date';

type RegistryType = 'enquiries' | 'quotations' | 'sales-orders' | 'invoices';

const DocumentArchivePage = () => {
  const params = useSearchParams();
  const [type, setType] = useState<RegistryType>('enquiries');
  const [query, setQuery] = useState('');
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const requested = params.get('type') as RegistryType | null;
    if (requested && ['enquiries', 'quotations', 'sales-orders', 'invoices'].includes(requested)) {
      setType(requested);
    }
  }, [params]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[CRM] DocumentArchivePage fetch start');
    }

    Promise.allSettled([listAllEnquiries(), listAllQuotations(), listAllSalesOrders(), listAllInvoices()])
      .then(([enquiriesResult, quotationsResult, salesOrdersResult, invoicesResult]) => {
        if (enquiriesResult.status === 'fulfilled') setEnquiries(enquiriesResult.value);
        if (quotationsResult.status === 'fulfilled') setQuotations(quotationsResult.value);
        if (salesOrdersResult.status === 'fulfilled') setOrders(salesOrdersResult.value);
        if (invoicesResult.status === 'fulfilled') setInvoices(invoicesResult.value);

        const failed: Array<{ name: string; reason: unknown }> = [];
        if (enquiriesResult.status === 'rejected') failed.push({ name: 'enquiries', reason: enquiriesResult.reason });
        if (quotationsResult.status === 'rejected') failed.push({ name: 'quotations', reason: quotationsResult.reason });
        if (salesOrdersResult.status === 'rejected') failed.push({ name: 'sales orders', reason: salesOrdersResult.reason });
        if (invoicesResult.status === 'rejected') failed.push({ name: 'invoices', reason: invoicesResult.reason });

        if (failed.length) {
          const message = failed
            .map(({ name, reason }) => `${name}: ${reason instanceof Error ? reason.message : String(reason)}`)
            .join(' | ');
          setError(`Failed to load archive records (${message})`);
          if (process.env.NODE_ENV !== 'production') {
            failed.forEach(({ name, reason }) => {
              console.error(`[CRM] DocumentArchivePage fetch error (${name})`, reason);
            });
          }
        }

        if (process.env.NODE_ENV !== 'production') {
          console.debug('[CRM] DocumentArchivePage fetch complete', {
            enquiries: enquiriesResult.status === 'fulfilled' ? enquiriesResult.value.length : 0,
            quotations: quotationsResult.status === 'fulfilled' ? quotationsResult.value.length : 0,
            salesOrders: salesOrdersResult.status === 'fulfilled' ? salesOrdersResult.value.length : 0,
            invoices: invoicesResult.status === 'fulfilled' ? invoicesResult.value.length : 0,
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const needle = query.trim().toLowerCase();

  const filteredEnquiries = useMemo(() => enquiries.filter((row) => {
    if (!needle) return true;
    return [row.job_number, row.client_name, row.client_reference_number, row.status, row.vessel_name]
      .some((value) => String(value ?? '').toLowerCase().includes(needle));
  }), [enquiries, needle]);

  const filteredQuotations = useMemo(() => quotations.filter((row) => {
    if (!needle) return true;
    return [row.document_number, row.client_name, row.client_reference_number, row.customer_reference, row.status]
      .some((value) => String(value ?? '').toLowerCase().includes(needle));
  }), [quotations, needle]);

  const filteredOrders = useMemo(() => orders.filter((row) => {
    if (!needle) return true;
    return [row.document_number, row.quotation_document_number, row.client_name, row.client_reference_number, row.client_po_number, row.status]
      .some((value) => String(value ?? '').toLowerCase().includes(needle));
  }), [orders, needle]);

  const filteredInvoices = useMemo(() => invoices.filter((row) => {
    if (!needle) return true;
    return [row.document_number, row.client_name, row.client_po_number, row.status]
      .some((value) => String(value ?? '').toLowerCase().includes(needle));
  }), [invoices, needle]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Document Archive / Master Data</h1>
      <p className="text-sm text-slate-600">Stable retrieval registry for all enquiries, quotations, sale orders, and invoices regardless of conversion/stage transitions.</p>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex flex-wrap items-center gap-2">
        {(['enquiries', 'quotations', 'sales-orders', 'invoices'] as RegistryType[]).map((item) => (
          <button key={item} type="button" onClick={() => setType(item)} className={`rounded-md border px-3 py-2 text-xs font-medium ${type === item ? 'border-primary bg-primary/10 text-primary' : 'border-slate-300 text-slate-700'}`}>
            {item}
          </button>
        ))}
        <input className="ml-auto w-72 rounded border border-slate-300 p-2 text-sm" placeholder="Search by number/client/status/reference" value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>

      {type === 'enquiries' ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] uppercase text-slate-500"><tr><th className="px-3 py-2">Ref</th><th className="px-3 py-2">Date</th><th className="px-3 py-2">Client</th><th className="px-3 py-2">Client Ref</th><th className="px-3 py-2">Status</th></tr></thead>
            <tbody>{filteredEnquiries.map((row) => <tr key={row.id} className="border-t"><td className="px-3 py-2 font-semibold"><Link href={`/dashboard/enquiries/${row.id}`} className="text-primary hover:underline">{row.job_number}</Link></td><td className="px-3 py-2">{formatIsoDate(row.enquiry_date)}</td><td className="px-3 py-2">{row.client_name || row.client_id}</td><td className="px-3 py-2">{row.client_reference_number || '-'}</td><td className="px-3 py-2 uppercase">{row.status}</td></tr>)}{!filteredEnquiries.length ? <tr><td className="px-3 py-4" colSpan={5}>No records.</td></tr> : null}</tbody>
          </table>
        </div>
      ) : null}

      {type === 'quotations' ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] uppercase text-slate-500"><tr><th className="px-3 py-2">Quotation</th><th className="px-3 py-2">Date</th><th className="px-3 py-2">Client</th><th className="px-3 py-2">Client Ref</th><th className="px-3 py-2">Status</th></tr></thead>
            <tbody>{filteredQuotations.map((row) => <tr key={row.id} className="border-t"><td className="px-3 py-2 font-semibold"><Link href={`/dashboard/quotations/${row.id}`} className="text-primary hover:underline">{row.document_number}</Link></td><td className="px-3 py-2">{formatIsoDate(row.created_at)}</td><td className="px-3 py-2">{row.client_name || row.client_id}</td><td className="px-3 py-2">{row.client_reference_number || row.customer_reference || '-'}</td><td className="px-3 py-2 uppercase">{row.status}</td></tr>)}{!filteredQuotations.length ? <tr><td className="px-3 py-4" colSpan={5}>No records.</td></tr> : null}</tbody>
          </table>
        </div>
      ) : null}

      {type === 'sales-orders' ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] uppercase text-slate-500"><tr><th className="px-3 py-2">Sale Order</th><th className="px-3 py-2">Quotation</th><th className="px-3 py-2">Date</th><th className="px-3 py-2">Client</th><th className="px-3 py-2">Client PO</th><th className="px-3 py-2">Status</th></tr></thead>
            <tbody>{loading ? <tr><td className="px-3 py-4" colSpan={6}>Loading records...</td></tr> : null}{filteredOrders.map((row) => <tr key={row.id} className="border-t"><td className="px-3 py-2 font-semibold"><Link href={`/dashboard/sales-orders/${row.id}`} className="text-primary hover:underline">{row.document_number}</Link></td><td className="px-3 py-2">{row.quotation_document_number || '-'}</td><td className="px-3 py-2">{formatIsoDate(row.issue_date)}</td><td className="px-3 py-2">{row.client_name || row.client_id}</td><td className="px-3 py-2">{row.client_po_number || '-'}</td><td className="px-3 py-2 uppercase">{row.status}</td></tr>)}{!loading && !filteredOrders.length ? <tr><td className="px-3 py-4" colSpan={6}>No records.</td></tr> : null}</tbody>
          </table>
        </div>
      ) : null}

      {type === 'invoices' ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] uppercase text-slate-500"><tr><th className="px-3 py-2">Invoice</th><th className="px-3 py-2">Date</th><th className="px-3 py-2">Client</th><th className="px-3 py-2">Client PO</th><th className="px-3 py-2">Status</th></tr></thead>
            <tbody>{filteredInvoices.map((row) => <tr key={row.id} className="border-t"><td className="px-3 py-2 font-semibold"><Link href={`/dashboard/invoices/${row.id}`} className="text-primary hover:underline">{row.document_number}</Link></td><td className="px-3 py-2">{formatIsoDate(row.issue_date)}</td><td className="px-3 py-2">{row.client_name || row.client_id}</td><td className="px-3 py-2">{row.client_po_number || '-'}</td><td className="px-3 py-2 uppercase">{row.status}</td></tr>)}{!filteredInvoices.length ? <tr><td className="px-3 py-4" colSpan={5}>No records.</td></tr> : null}</tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
};

export default DocumentArchivePage;
