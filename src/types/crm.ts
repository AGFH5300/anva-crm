export const SUPPORTED_CURRENCIES = ['AED', 'USD', 'EUR', 'GBP'] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export type Enquiry = {
  id: string;
  job_number: string;
  enquiry_date: string;
  client_id: string;
  client_name?: string | null;
  contact_id: string | null;
  job_type_id: string;
  job_type_name?: string | null;
  sales_pic_user_id: string | null;
  sales_pic_name?: string | null;
  pic_name: string | null;
  pic_phone: string | null;
  pic_email: string | null;
  vessel_name: string | null;
  vessel_imo_number: string | null;
  shipyard: string | null;
  hull_number: string | null;
  status: 'new' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
  machinery_for: string | null;
  machinery_make: string | null;
  machinery_type: string | null;
  machinery_serial_no: string | null;
  created_at: string;
};

export type JobType = {
  id: string;
  name: string;
  code: string | null;
  is_active: boolean;
  sort_order: number;
};

export type SalesUser = {
  id: string;
  full_name: string;
  email: string | null;
  job_title: string | null;
  is_active: boolean;
};

export type EnquiryLine = {
  id: string;
  enquiry_id: string;
  item_serial_no: string | null;
  part_no: string | null;
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
  job_number: string | null;
  client_id: string;
  client_name?: string | null;
  document_number: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  currency: CurrencyCode;
  subtotal: number;
  vat_amount: number;
  total: number;
  created_at: string;
  enquiry?: Pick<Enquiry, 'id' | 'job_number' | 'vessel_name' | 'machinery_for' | 'machinery_make' | 'machinery_type' | 'machinery_serial_no'> | null;
  job_type_name?: string | null;
};

export type QuotationLine = {
  id: string;
  quotation_id: string;
  description: string;
  quantity: number;
  supplier_cost: number;
  supplier_currency: CurrencyCode;
  exchange_rate: number;
  landed_aed_cost: number;
  margin_pct: number;
  unit_price: number;
  currency: CurrencyCode;
  discount_pct: number;
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
