export const SUPPORTED_CURRENCIES = ['AED', 'USD', 'EUR', 'GBP'] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export type Enquiry = {
  id: string;
  client_id: string;
  contact_id: string | null;
  subject: string;
  description: string | null;
  status: 'new' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
  priority: 'low' | 'medium' | 'high';
  machinery_for: string | null;
  machinery_make: string | null;
  machinery_type: string | null;
  machinery_serial_no: string | null;
  created_at: string;
};

export type EnquiryLine = {
  id: string;
  enquiry_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  currency: CurrencyCode;
  vat_rate: number;
  is_zero_rated: boolean;
  is_exempt: boolean;
  line_total: number;
  sort_order: number;
};

export type Quotation = {
  id: string;
  enquiry_id: string | null;
  client_id: string;
  document_number: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  currency: CurrencyCode;
  subtotal: number;
  vat_amount: number;
  total: number;
  created_at: string;
};

export type QuotationLine = {
  id: string;
  quotation_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  currency: CurrencyCode;
  vat_rate: number;
  is_zero_rated: boolean;
  is_exempt: boolean;
  discount: number;
  line_total: number;
  sort_order: number;
};

export type SalesOrder = {
  id: string;
  quotation_id: string | null;
  client_id: string;
  document_number: string;
  status: 'draft' | 'confirmed' | 'in-progress' | 'fulfilled' | 'cancelled';
  currency: CurrencyCode;
  subtotal: number;
  vat_amount: number;
  total: number;
  created_at: string;
};

export type SalesOrderLine = {
  id: string;
  sales_order_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  currency: CurrencyCode;
  vat_rate: number;
  is_zero_rated: boolean;
  is_exempt: boolean;
  line_total: number;
  sort_order: number;
};
