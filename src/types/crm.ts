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
  client_reference_number: string | null;
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
  unit?: string | null;
  drawing_reference?: string | null;
  supplier_remarks?: string | null;
  supplier_description_override?: string | null;
  is_hidden_from_supplier_pdf?: boolean;
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
  terms_and_conditions: string | null;
  delivery_terms: string | null;
  delivery_time: string | null;
  payment_terms: string | null;
  parts_origin: string | null;
  parts_quality: string | null;
  customer_reference: string | null;
  client_reference_number: string | null;
  customer_trn: string | null;
  company_trn: string | null;
  pic_details: string | null;
  additional_notes: string | null;
  company_letterhead_enabled: boolean;
  stamp_enabled: boolean;
  signature_enabled: boolean;
  validity: string | null;
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
  quotation_document_number?: string | null;
  client_id: string;
  client_name?: string | null;
  document_number: string;
  status: 'draft' | 'confirmed' | 'in-progress' | 'fulfilled' | 'cancelled';
  currency: CurrencyCode;
  subtotal: number;
  vat_amount: number;
  total: number;
  terms_and_conditions: string | null;
  delivery_terms: string | null;
  delivery_time: string | null;
  payment_terms: string | null;
  parts_origin: string | null;
  parts_quality: string | null;
  validity: string | null;
  customer_trn: string | null;
  company_trn: string | null;
  pic_details: string | null;
  additional_notes: string | null;
  company_letterhead_enabled: boolean;
  stamp_enabled: boolean;
  signature_enabled: boolean;
  client_reference_number: string | null;
  client_po_number: string | null;
  issue_date: string;
  created_at: string;
};

export type Invoice = {
  id: string;
  sales_order_id: string | null;
  client_id: string;
  client_name?: string | null;
  document_number: string;
  status: 'draft' | 'issued' | 'paid' | 'overdue' | 'cancelled';
  issue_date: string;
  due_date: string | null;
  currency: CurrencyCode;
  total: number;
  balance_due: number;
  client_po_number: string | null;
  created_at: string;
};

export type SalesOrderLine = {
  id: string;
  sales_order_id: string;
  description: string;
  quantity: number;
  supplier_cost: number;
  supplier_currency: CurrencyCode;
  unit_price: number;
  currency: CurrencyCode;
  vat_rate: number;
  is_zero_rated: boolean;
  is_exempt: boolean;
  line_total: number;
  sort_order: number;
};

export type SupplierPurchaseOrderStatus = 'draft' | 'sent' | 'confirmed' | 'partially_received' | 'received' | 'cancelled';

export type SupplierPurchaseOrder = {
  id: string;
  related_sales_order_id: string | null;
  related_sales_order_document_number?: string | null;
  supplier_id: string;
  supplier_name?: string | null;
  document_number: string;
  status: SupplierPurchaseOrderStatus;
  issue_date: string;
  expected_delivery: string | null;
  vendor_reference?: string | null;
  notes?: string | null;
  currency: CurrencyCode;
  payment_terms: string | null;
  subtotal: number;
  vat_amount: number;
  total: number;
  created_at: string;
};

export type SupplierPurchaseOrderLine = {
  id: string;
  purchase_order_id: string;
  source_sales_order_item_id: string | null;
  description: string;
  quantity: number;
  supplier_cost: number;
  supplier_currency: CurrencyCode;
  unit_price: number;
  currency: CurrencyCode;
  vat_rate: number;
  line_total: number;
  sort_order: number;
};


export type Supplier = {
  id: string;
  supplier_code: string | null;
  company_name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  website: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  tax_registration_no: string | null;
  payment_terms: string | null;
  currency: CurrencyCode;
  vendor_type: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type SupplierRfqDocument = {
  id: string;
  enquiry_id: string;
  supplier_id: string;
  document_type: 'supplier_rfq_pdf';
  document_number: string;
  include_serial_number: boolean;
  file_path: string;
  generated_by: string | null;
  generated_at: string;
  notes: string | null;
};

export type CompanyDocumentSettings = {
  id: string;
  company_name: string;
  company_trn: string | null;
  default_payment_terms: string | null;
  default_delivery_terms: string | null;
  default_validity: string | null;
  default_footer_text: string | null;
  default_terms_and_conditions: string | null;
  default_letterhead_enabled: boolean;
  default_stamp_enabled: boolean;
  default_signature_enabled: boolean;
  logo_url: string | null;
  stamp_url: string | null;
  updated_at: string;
};
