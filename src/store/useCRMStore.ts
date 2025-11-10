import { create } from 'zustand';
import type { CommercialDocument, LineItem } from '@/types/documents';
import { buildCommercialDocument } from '@/services/documentBuilder';
import { formatCurrencyAED } from '@/config/uaeTax';

export interface ClientRecord {
  id: string;
  name: string;
  type: 'client' | 'vendor' | 'both';
  contactEmail?: string;
  contactPhone?: string;
  status: 'active' | 'prospect' | 'inactive';
  lastInteraction?: string;
}

export interface EnquiryRecord {
  id: string;
  clientId: string;
  subject: string;
  status: 'new' | 'in-progress' | 'quoted' | 'won' | 'lost';
  createdAt: string;
  owner: string;
}

export interface QuotationRecord {
  id: string;
  enquiryId: string;
  document: CommercialDocument;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
}

export interface OrderRecord {
  id: string;
  quotationId: string;
  type: 'sales' | 'purchase';
  status: 'draft' | 'confirmed' | 'fulfilled' | 'cancelled';
  document: CommercialDocument;
}

export interface InvoiceRecord {
  id: string;
  orderId: string;
  document: CommercialDocument;
  status: 'draft' | 'issued' | 'paid' | 'overdue';
  balanceDue: number;
}

interface CRMState {
  clients: ClientRecord[];
  enquiries: EnquiryRecord[];
  quotations: QuotationRecord[];
  orders: OrderRecord[];
  invoices: InvoiceRecord[];
  createQuotation: (input: {
    enquiryId: string;
    issuer: CommercialDocument['issuer'];
    recipient: CommercialDocument['recipient'];
    items: LineItem[];
    meta: CommercialDocument['meta'];
    paymentTerms?: string;
  }) => QuotationRecord;
}

export const useCRMStore = create<CRMState>((set) => ({
  clients: [
    {
      id: 'client-001',
      name: 'Gulf Star Trading LLC',
      type: 'client',
      contactEmail: 'procurement@gulfstar.com',
      contactPhone: '+971-4-123-4567',
      status: 'active',
      lastInteraction: '2024-05-22'
    },
    {
      id: 'client-002',
      name: 'Desert Logistics FZCO',
      type: 'vendor',
      contactEmail: 'sales@desertlogistics.ae',
      contactPhone: '+971-4-987-6543',
      status: 'prospect'
    }
  ],
  enquiries: [
    {
      id: 'enquiry-100',
      clientId: 'client-001',
      subject: 'Supply of HVAC components',
      status: 'in-progress',
      createdAt: '2024-06-01',
      owner: 'Aisha Khan'
    }
  ],
  quotations: [],
  orders: [],
  invoices: [],
  createQuotation: ({ enquiryId, issuer, recipient, items, meta, paymentTerms }) => {
    const document = buildCommercialDocument({
      issuer,
      recipient,
      items,
      meta,
      paymentTerms
    });

    const quotation: QuotationRecord = {
      id: `quo-${Date.now()}`,
      enquiryId,
      document,
      status: 'draft'
    };

    set((state) => ({ quotations: [...state.quotations, quotation] }));
    return quotation;
  }
}));

export const summarizeInvoice = (invoice: InvoiceRecord) => ({
  number: invoice.document.meta.documentNumber,
  issueDate: invoice.document.meta.issueDate,
  customer: invoice.document.recipient.name,
  total: formatCurrencyAED(invoice.document.taxSummary.total),
  status: invoice.status,
  balanceDue: formatCurrencyAED(invoice.balanceDue)
});
