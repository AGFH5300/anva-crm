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


type GenericRow = Record<string, unknown>;

const readAccountName = (row: GenericRow) => {
  const value = row.name ?? row.account_name ?? row.display_name ?? row.company_name;
  return typeof value === 'string' ? value.trim() : '';
};

const isCustomerAccount = (row: GenericRow) => {
  const accountType = String(row.account_type ?? row.type ?? row.category ?? '').toLowerCase();
  const customerFlag = row.is_customer;

  if (typeof customerFlag === 'boolean') {
    return customerFlag;
  }

  if (!accountType) {
    return true;
  }

  return ['customer', 'client', 'both'].some((value) => accountType.includes(value));
};

const normalizeAccounts = (rows: GenericRow[]) => {
  return rows
    .map((row) => ({
      id: String(row.id ?? ''),
      name: readAccountName(row),
      isCustomer: isCustomerAccount(row)
    }))
    .filter((row) => row.id && row.name && row.isCustomer)
    .map(({ id, name }) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
};

const TRIAL_CUSTOMERS = [
  'Premier Marine Engineering Services, DMC, Dubai. PO Box 113417',
  'Silverburn'
] as const;

export const listClients = async () => {
  const { data, error } = await supabase
    .schema('public')
    .from('accounts')
    .select('*');

  if (error) {
    throw new Error(`Unable to read customers from public.accounts: ${error.message}`);
  }

  return normalizeAccounts((data ?? []) as GenericRow[]);
};

export const seedDefaultClientsIfMissing = async (clientNames: string[]) => {
  const normalized = Array.from(new Set(clientNames.map((name) => name.trim()).filter(Boolean)));
  const expected = normalized.length ? normalized : [...TRIAL_CUSTOMERS];

  const existing = await listClients();
  const existingNames = new Set(existing.map((client) => client.name));
  const missingNames = expected.filter((name) => !existingNames.has(name));

  if (missingNames.length) {
    const payloadVariants = [
      missingNames.map((name) => ({ name, account_type: 'customer' })),
      missingNames.map((name) => ({ name, type: 'customer' })),
      missingNames.map((name) => ({ name, is_customer: true })),
      missingNames.map((name) => ({ name }))
    ];

    for (const payload of payloadVariants) {
      const { error } = await supabase.schema('public').from('accounts').upsert(payload, { onConflict: 'name' });
      if (!error) {
        break;
      }
    }
  }

  try {
    const refreshed = await listClients();
    if (!refreshed.length) {
      return [...TRIAL_CUSTOMERS].map((name) => ({ id: name, name }));
    }

    return expected.map((name) => refreshed.find((item) => item.name === name) ?? { id: name, name });
  } catch {
    return [...TRIAL_CUSTOMERS].map((name) => ({ id: name, name }));
  }
};

export const listEnquiries = async () => {
  const { data, error } = await supabase
    .from('enquiries')
    .select('id, client_id, contact_id, subject, description, status, priority, machinery_for, machinery_make, machinery_type, machinery_serial_no, created_at')
    .order('created_at', { ascending: false });

  throwIfError(error);
  return (data ?? []) as Enquiry[];
};

export const getEnquiryDetail = async (id: string) => {
  const [{ data: enquiry, error: enquiryError }, { data: lines, error: linesError }] = await Promise.all([
    supabase
      .from('enquiries')
      .select('id, client_id, contact_id, subject, description, status, priority, machinery_for, machinery_make, machinery_type, machinery_serial_no, created_at')
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
      subject: parsed.subject ?? `Enquiry ${new Date().toISOString().slice(0, 10)}`,
      description: parsed.description ?? null,
      priority: parsed.priority,
      machinery_for: parsed.machineryFor ?? null,
      machinery_make: parsed.machineryMake ?? null,
      machinery_type: parsed.machineryType ?? null,
      machinery_serial_no: parsed.machinerySerialNo ?? null
    })
    .select('id, client_id, contact_id, subject, description, status, priority, machinery_for, machinery_make, machinery_type, machinery_serial_no, created_at')
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


export const deleteEnquiryLine = async (lineId: string) => {
  const { error } = await supabase
    .from('enquiry_items')
    .delete()
    .eq('id', lineId);

  throwIfError(error);
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


export const deleteQuotationLine = async (lineId: string) => {
  const { error } = await supabase
    .from('quotation_items')
    .delete()
    .eq('id', lineId);

  throwIfError(error);
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
