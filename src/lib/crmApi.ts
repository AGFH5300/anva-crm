import { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import {
  enquirySchema,
  lineSchema,
  quotationLineSchema,
  type EnquiryInput,
  type LineInput,
  type QuotationLineInput
} from '@/lib/crmValidation';
import type { Enquiry, EnquiryLine, Quotation, QuotationLine, SalesOrder, SalesOrderLine } from '@/types/crm';

const throwIfError = (error: PostgrestError | null) => {
  if (error) {
    throw new Error(error.message);
  }
};

const callFirstAvailableRpc = async <T>(names: string[], args: Record<string, unknown>) => {
  let lastError = '';

  for (const name of names) {
    const response = await supabase.rpc(name, args);
    if (!response.error) {
      return response.data as T;
    }
    lastError = response.error.message;
    if (!response.error.message.toLowerCase().includes('function') && response.error.code !== '42883') {
      throw new Error(response.error.message);
    }
  }

  throw new Error(
    `No supported conversion RPC found (${names.join(', ')}). Last DB error: ${lastError || 'unknown error'}`
  );
};


export const listClients = async () => {
  const { data, error } = await supabase
    .from('clients')
    .select('id, name')
    .order('name');

  throwIfError(error);
  return (data ?? []) as Array<{ id: string; name: string }>;
};


export const seedDefaultClientsIfMissing = async (clientNames: string[]) => {
  const normalized = Array.from(new Set(clientNames.map((name) => name.trim()).filter(Boolean)));
  if (!normalized.length) {
    return listClients();
  }

  const { data: existing, error: existingError } = await supabase
    .from('clients')
    .select('id, name')
    .in('name', normalized);

  throwIfError(existingError);

  const existingNames = new Set((existing ?? []).map((client) => client.name));
  const missingNames = normalized.filter((name) => !existingNames.has(name));

  if (missingNames.length) {
    const { error: insertError } = await supabase
      .from('clients')
      .insert(missingNames.map((name) => ({ name, type: 'client', status: 'active' })));

    throwIfError(insertError);
  }

  const { data, error } = await supabase
    .from('clients')
    .select('id, name')
    .in('name', normalized)
    .order('name');

  throwIfError(error);
  return (data ?? []) as Array<{ id: string; name: string }>;
};

export const listEnquiries = async () => {
  const { data, error } = await supabase
    .from('enquiries')
    .select('id, client_id, contact_id, subject, description, status, priority, created_at')
    .order('created_at', { ascending: false });

  throwIfError(error);
  return (data ?? []) as Enquiry[];
};

export const getEnquiryDetail = async (id: string) => {
  const [{ data: enquiry, error: enquiryError }, { data: lines, error: linesError }] = await Promise.all([
    supabase
      .from('enquiries')
      .select('id, client_id, contact_id, subject, description, status, priority, created_at')
      .eq('id', id)
      .single(),
    supabase
      .from('enquiry_items')
      .select('id, enquiry_id, description, quantity, unit_price, currency, vat_rate, is_zero_rated, is_exempt, line_total, sort_order')
      .eq('enquiry_id', id)
      .order('sort_order')
  ]);

  throwIfError(enquiryError);
  throwIfError(linesError);

  return {
    enquiry: enquiry as Enquiry,
    lines: (lines ?? []) as EnquiryLine[]
  };
};

export const createEnquiry = async (payload: EnquiryInput) => {
  const parsed = enquirySchema.parse(payload);
  const { data, error } = await supabase
    .from('enquiries')
    .insert({
      client_id: parsed.clientId,
      contact_id: parsed.contactId ?? null,
      subject: parsed.subject,
      description: parsed.description ?? null,
      priority: parsed.priority
    })
    .select('id, client_id, contact_id, subject, description, status, priority, created_at')
    .single();

  throwIfError(error);
  return data as Enquiry;
};

export const addEnquiryLine = async (enquiryId: string, payload: LineInput) => {
  const parsed = lineSchema.parse(payload);
  const lineTotal = Number((parsed.quantity * parsed.unitPrice).toFixed(2));

  const { data: latest } = await supabase
    .from('enquiry_items')
    .select('sort_order')
    .eq('enquiry_id', enquiryId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from('enquiry_items')
    .insert({
      enquiry_id: enquiryId,
      description: parsed.description,
      quantity: parsed.quantity,
      unit_price: parsed.unitPrice,
      currency: parsed.currency,
      vat_rate: parsed.vatRate,
      is_zero_rated: parsed.isZeroRated,
      is_exempt: parsed.isExempt,
      line_total: lineTotal,
      sort_order: (latest?.sort_order ?? 0) + 1
    })
    .select('id, enquiry_id, description, quantity, unit_price, currency, vat_rate, is_zero_rated, is_exempt, line_total, sort_order')
    .single();

  throwIfError(error);
  return data as EnquiryLine;
};

export const convertEnquiryToQuotationDraft = async (enquiryId: string) => {
  return callFirstAvailableRpc<string>(
    ['convert_enquiry_to_quotation_draft', 'crm_convert_enquiry_to_quotation_draft'],
    { p_enquiry_id: enquiryId }
  );
};

export const listQuotations = async () => {
  const { data, error } = await supabase
    .from('quotations')
    .select('id, enquiry_id, client_id, document_number, status, currency, subtotal, vat_amount, total, created_at')
    .order('created_at', { ascending: false });

  throwIfError(error);
  return (data ?? []) as Quotation[];
};

export const getQuotationDetail = async (id: string) => {
  const [{ data: quotation, error: quotationError }, { data: lines, error: linesError }] = await Promise.all([
    supabase
      .from('quotations')
      .select('id, enquiry_id, client_id, document_number, status, currency, subtotal, vat_amount, total, created_at')
      .eq('id', id)
      .single(),
    supabase
      .from('quotation_items')
      .select('id, quotation_id, description, quantity, unit_price, currency, vat_rate, is_zero_rated, is_exempt, discount, line_total, sort_order')
      .eq('quotation_id', id)
      .order('sort_order')
  ]);

  throwIfError(quotationError);
  throwIfError(linesError);

  return {
    quotation: quotation as Quotation,
    lines: (lines ?? []) as QuotationLine[]
  };
};

export const addQuotationLine = async (quotationId: string, payload: QuotationLineInput) => {
  const parsed = quotationLineSchema.parse(payload);
  const lineTotal = Number((parsed.quantity * parsed.unitPrice - parsed.discount).toFixed(2));

  const { data: latest } = await supabase
    .from('quotation_items')
    .select('sort_order')
    .eq('quotation_id', quotationId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from('quotation_items')
    .insert({
      quotation_id: quotationId,
      description: parsed.description,
      quantity: parsed.quantity,
      unit_price: parsed.unitPrice,
      currency: parsed.currency,
      vat_rate: parsed.vatRate,
      is_zero_rated: parsed.isZeroRated,
      is_exempt: parsed.isExempt,
      discount: parsed.discount,
      line_total: lineTotal,
      sort_order: (latest?.sort_order ?? 0) + 1
    })
    .select('id, quotation_id, description, quantity, unit_price, currency, vat_rate, is_zero_rated, is_exempt, discount, line_total, sort_order')
    .single();

  throwIfError(error);
  return data as QuotationLine;
};

export const convertQuotationToSalesOrder = async (quotationId: string) => {
  return callFirstAvailableRpc<string>(
    ['convert_quotation_to_sales_order', 'crm_convert_quotation_to_sales_order'],
    { p_quotation_id: quotationId }
  );
};

export const getSalesOrderDetail = async (id: string) => {
  const [{ data: order, error: orderError }, { data: lines, error: linesError }] = await Promise.all([
    supabase
      .from('sales_orders')
      .select('id, quotation_id, client_id, document_number, status, currency, subtotal, vat_amount, total, created_at')
      .eq('id', id)
      .single(),
    supabase
      .from('sales_order_items')
      .select('id, sales_order_id, description, quantity, unit_price, currency, vat_rate, is_zero_rated, is_exempt, line_total, sort_order')
      .eq('sales_order_id', id)
      .order('sort_order')
  ]);

  throwIfError(orderError);
  throwIfError(linesError);

  return {
    order: order as SalesOrder,
    lines: (lines ?? []) as SalesOrderLine[]
  };
};
