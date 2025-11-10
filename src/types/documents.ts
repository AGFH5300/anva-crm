export type CurrencyCode = 'AED' | 'USD' | 'EUR' | 'GBP' | 'INR';

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
}

export interface Counterparty {
  name: string;
  taxRegistrationNumber?: string;
  trn?: string; // UAE VAT Tax Registration Number
  address: Address;
  contactEmail?: string;
  contactPhone?: string;
}

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  currency: CurrencyCode;
  isZeroRated?: boolean;
  isExempt?: boolean;
}

export interface DocumentMeta {
  documentNumber: string;
  issueDate: string;
  dueDate?: string;
  reference?: string;
  notes?: string;
  currency: CurrencyCode;
}

export interface TaxSummary {
  subtotal: number;
  vatAmount: number;
  total: number;
}

export interface CommercialDocument {
  issuer: Counterparty;
  recipient: Counterparty;
  items: LineItem[];
  meta: DocumentMeta;
  taxSummary: TaxSummary;
  paymentTerms?: string;
  deliveryTerms?: string;
}
