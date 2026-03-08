'use client';

import { useMemo, useState } from 'react';
import type { QuotationRecord, EnquiryRecord } from '@/store/useCRMStore';
import { useCRMStore } from '@/store/useCRMStore';
import type { LineItem } from '@/types/documents';
import { formatCurrencyAED } from '@/config/uaeTax';

interface EnquiryWithClient extends EnquiryRecord {
  client?: {
    id: string;
    name: string;
    contactEmail?: string;
    contactPhone?: string;
    trn?: string;
  };
}

interface QuotationComposerProps {
  enquiries: EnquiryWithClient[];
  existingQuotations: QuotationRecord[];
}

const defaultLineItem: LineItem = {
  id: 'item-1',
  description: 'Consultancy Service',
  quantity: 1,
  unitPrice: 1000,
  currency: 'AED'
};

const QuotationComposer = ({ enquiries, existingQuotations }: QuotationComposerProps) => {
  const { createQuotation } = useCRMStore();
  const [selectedEnquiryId, setSelectedEnquiryId] = useState<string>(enquiries[0]?.id ?? '');
  const [items, setItems] = useState<LineItem[]>([defaultLineItem]);
  const [notes, setNotes] = useState('Pricing valid for 30 days. Payment within 30 days of invoice.');

  const selectedEnquiry = useMemo(
    () => enquiries.find((enquiry) => enquiry.id === selectedEnquiryId),
    [enquiries, selectedEnquiryId]
  );

  const taxPreview = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const vat = items.reduce((sum, item) => {
      if (item.isZeroRated || item.isExempt) return sum;
      return sum + item.quantity * item.unitPrice * 0.05;
    }, 0);
    return {
      subtotal: formatCurrencyAED(subtotal),
      vat: formatCurrencyAED(vat),
      total: formatCurrencyAED(subtotal + vat)
    };
  }, [items]);

  const handleGenerate = () => {
    if (!selectedEnquiry || items.length === 0) return;

    const documentNumber = `QTN-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`;

    createQuotation({
      enquiryId: selectedEnquiry.id,
      issuer: {
        name: 'Anva Solutions LLC',
        trn: '100292939000003',
        address: {
          line1: 'Office 2102, Al Shatha Tower',
          city: 'Dubai',
          country: 'United Arab Emirates'
        },
        contactEmail: 'sales@anva-solutions.ae',
        contactPhone: '+971-4-555-1234'
      },
      recipient: {
        name: selectedEnquiry.client?.name ?? 'Unknown Client',
        address: {
          line1: 'Client Address',
          city: 'Dubai',
          country: 'United Arab Emirates'
        },
        contactEmail: selectedEnquiry.client?.contactEmail
      },
      items,
      meta: {
        documentNumber,
        issueDate: new Date().toISOString().slice(0, 10),
        reference: selectedEnquiry.subject,
        notes,
        currency: 'AED'
      },
      paymentTerms: '30% advance, balance on delivery'
    });

    setNotes('Pricing valid for 30 days. Payment within 30 days of invoice.');
  };

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Quotation composer</h2>
      <div className="space-y-3">
        <label className="block text-xs font-semibold uppercase text-slate-500">Enquiry</label>
        <select
          value={selectedEnquiryId}
          onChange={(event) => setSelectedEnquiryId(event.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          {enquiries.map((enquiry) => (
            <option key={enquiry.id} value={enquiry.id}>
              {enquiry.subject} — {enquiry.client?.name ?? 'Unknown client'}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-3">
        <label className="block text-xs font-semibold uppercase text-slate-500">Line items</label>
        {items.map((item, index) => (
          <div key={item.id} className="grid gap-3 rounded-lg border border-slate-200 p-4 md:grid-cols-4">
            <input
              value={item.description}
              onChange={(event) => {
                const next = [...items];
                next[index] = { ...item, description: event.target.value };
                setItems(next);
              }}
              className="rounded border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              type="number"
              value={item.quantity}
              min={1}
              onChange={(event) => {
                const next = [...items];
                next[index] = { ...item, quantity: Number(event.target.value) };
                setItems(next);
              }}
              className="rounded border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              type="number"
              value={item.unitPrice}
              min={0}
              onChange={(event) => {
                const next = [...items];
                next[index] = { ...item, unitPrice: Number(event.target.value) };
                setItems(next);
              }}
              className="rounded border border-slate-200 px-3 py-2 text-sm"
            />
            <select
              value={item.isZeroRated ? 'zero-rated' : item.isExempt ? 'exempt' : 'standard'}
              onChange={(event) => {
                const next = [...items];
                const choice = event.target.value;
                next[index] = {
                  ...item,
                  isZeroRated: choice === 'zero-rated',
                  isExempt: choice === 'exempt'
                };
                setItems(next);
              }}
              className="rounded border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="standard">Standard 5% VAT</option>
              <option value="zero-rated">Zero-rated (0%)</option>
              <option value="exempt">Exempt</option>
            </select>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            setItems((prev) => [
              ...prev,
              {
                ...defaultLineItem,
                id: `item-${prev.length + 1}`,
                description: 'New line item'
              }
            ])
          }
          className="text-sm font-medium text-primary"
        >
          + Add another line item
        </button>
      </div>
      <div className="space-y-3">
        <label className="block text-xs font-semibold uppercase text-slate-500">Special notes</label>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={4}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
        <p className="font-semibold text-slate-700">Tax summary</p>
        <div className="mt-2 space-y-1 text-xs text-slate-500">
          <p>Subtotal: {taxPreview.subtotal}</p>
          <p>VAT (5%): {taxPreview.vat}</p>
          <p className="font-semibold text-slate-700">Total: {taxPreview.total}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={handleGenerate}
        className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow hover:bg-primary/90"
      >
        Generate VAT-compliant quotation
      </button>
      <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4 text-xs text-primary">
        <p className="font-semibold">Compliance reminder</p>
        <p>
          Quotations generated here include VAT according to UAE Federal Tax Authority requirements and ensure
          customer TRNs can be recorded for auditing.
        </p>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-slate-700">Existing quotations</h3>
        <ul className="mt-2 space-y-1 text-xs text-slate-500">
          {existingQuotations.map((quotation) => (
            <li key={quotation.id}>
              {quotation.document.meta.documentNumber} — {quotation.document.recipient.name} — {quotation.status}
            </li>
          ))}
          {existingQuotations.length === 0 && <li>No quotations generated yet.</li>}
        </ul>
      </div>
    </div>
  );
};

export default QuotationComposer;
