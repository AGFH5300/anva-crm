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
import type { Enquiry, EnquiryLine, JobType, Quotation, QuotationLine, SalesOrder, SalesOrderLine, SalesUser } from '@/types/crm';

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


const getRelationName = (value: { name: string | null } | Array<{ name: string | null }> | null | undefined) => {
  if (!value) return null;
  return Array.isArray(value) ? value[0]?.name ?? null : value.name ?? null;
};
export const listClients = async () => {
  const { data, error } = await supabase
    .schema('crm')
    .from('clients')
    .select('id, name')
    .order('name');

  if (error) {
    throw new Error(`Unable to read customers from crm.clients: ${error.message}`);
  }

  return (data ?? []) as Array<{ id: string; name: string }>;
};

export const seedDefaultClientsIfMissing = async (clientNames: string[]) => {
  void clientNames;
  return listClients();
};

export const listActiveJobTypes = async () => {
  const { data, error } = await supabase
    .schema('crm')
    .from('job_types')
    .select('id, name, code, is_active, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  throwIfError(error);
  return (data ?? []) as JobType[];
};

export const listActiveSalesUsers = async () => {
  const { data, error } = await supabase
    .schema('crm')
    .rpc('list_active_sales_users');

  throwIfError(error);
  return (data ?? []) as SalesUser[];
};

export const listEnquiries = async () => {
  const { data, error } = await supabase
    .schema('crm')
    .from('enquiries')
    .select('id, client_id, contact_id, job_type_id, sales_pic_user_id, pic_name, pic_phone, pic_email, vessel_name, vessel_imo_number, shipyard, hull_number, status, machinery_for, machinery_make, machinery_type, machinery_serial_no, created_at, client:clients(name), job_type:job_types(name)')
    .order('created_at', { ascending: false });

  throwIfError(error);
  return ((data ?? []) as Array<Enquiry & {
    client?: { name: string | null } | Array<{ name: string | null }> | null;
    job_type?: { name: string | null } | Array<{ name: string | null }> | null;
  }>).map(({ client, job_type, ...item }) => ({
    ...item,
    client_name: getRelationName(client) ?? null,
    job_type_name: getRelationName(job_type) ?? null,
  }));
};

export const getEnquiryDetail = async (id: string) => {
  const [{ data: enquiry, error: enquiryError }, { data: lines, error: linesError }] = await Promise.all([
    supabase
      .schema('crm')
      .from('enquiries')
      .select('id, client_id, contact_id, job_type_id, sales_pic_user_id, pic_name, pic_phone, pic_email, vessel_name, vessel_imo_number, shipyard, hull_number, status, machinery_for, machinery_make, machinery_type, machinery_serial_no, created_at, client:clients(name), job_type:job_types(name)')
      .eq('id', id)
      .single(),
    supabase
      .schema('crm')
      .from('enquiry_items')
      .select('id, enquiry_id, item_serial_no, part_no, description, quantity, unit_price, currency, vat_rate, is_zero_rated, is_exempt, line_total, sort_order')
      .eq('enquiry_id', id)
      .order('sort_order')
  ]);

  throwIfError(enquiryError);
  throwIfError(linesError);

  const { client, job_type, ...enquiryData } = (enquiry as Enquiry & {
    client?: { name: string | null } | Array<{ name: string | null }> | null;
    job_type?: { name: string | null } | Array<{ name: string | null }> | null;
  });

  return {
    enquiry: {
      ...enquiryData,
      client_name: getRelationName(client) ?? null,
      job_type_name: getRelationName(job_type) ?? null,
      },
    lines: (lines ?? []) as EnquiryLine[]
  };
};

export const createEnquiry = async (payload: EnquiryInput) => {
  const parsed = enquirySchema.parse(payload);
  const { data, error } = await supabase
    .schema('crm')
    .from('enquiries')
    .insert({
      client_id: parsed.clientId,
      contact_id: parsed.contactId ?? null,
      job_type_id: parsed.jobTypeId ?? null,
      sales_pic_user_id: parsed.salesPicUserId ?? null,
      pic_name: parsed.picName ?? null,
      pic_phone: parsed.picPhone ?? null,
      pic_email: parsed.picEmail ?? null,
      vessel_name: parsed.vesselName,
      vessel_imo_number: parsed.vesselImoNumber ?? null,
      shipyard: parsed.shipyard ?? null,
      hull_number: parsed.hullNumber ?? null,
      machinery_for: parsed.machineryFor ?? null,
      machinery_make: parsed.machineryMake ?? null,
      machinery_type: parsed.machineryType ?? null,
      machinery_serial_no: parsed.machinerySerialNo ?? null
    })
    .select('id, client_id, contact_id, job_type_id, sales_pic_user_id, pic_name, pic_phone, pic_email, vessel_name, vessel_imo_number, shipyard, hull_number, status, machinery_for, machinery_make, machinery_type, machinery_serial_no, created_at')
    .single();

  throwIfError(error);
  return data as Enquiry;
};


export const updateEnquiry = async (id: string, payload: Pick<EnquiryInput, 'jobTypeId' | 'salesPicUserId'>) => {
  const parsed = enquirySchema.pick({ jobTypeId: true, salesPicUserId: true }).parse(payload);

  const { data, error } = await supabase
    .schema('crm')
    .from('enquiries')
    .update({
      job_type_id: parsed.jobTypeId ?? null,
      sales_pic_user_id: parsed.salesPicUserId ?? null
    })
    .eq('id', id)
    .select('id, client_id, contact_id, job_type_id, sales_pic_user_id, pic_name, pic_phone, pic_email, vessel_name, vessel_imo_number, shipyard, hull_number, status, machinery_for, machinery_make, machinery_type, machinery_serial_no, created_at')
    .single();

  throwIfError(error);
  return data as Enquiry;
};

export const addEnquiryLine = async (enquiryId: string, payload: LineInput) => {
  const parsed = lineSchema.parse(payload);
  const lineTotal = Number((parsed.quantity * parsed.unitPrice).toFixed(2));

  const { data: latest } = await supabase
    .schema('crm')
    .from('enquiry_items')
    .select('sort_order')
    .eq('enquiry_id', enquiryId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .schema('crm')
    .from('enquiry_items')
    .insert({
      enquiry_id: enquiryId,
      item_serial_no: parsed.itemSerialNo ?? null,
      part_no: parsed.partNo ?? null,
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
    .select('id, enquiry_id, item_serial_no, part_no, description, quantity, unit_price, currency, vat_rate, is_zero_rated, is_exempt, line_total, sort_order')
    .single();

  throwIfError(error);
  return data as EnquiryLine;
};


export const deleteEnquiryLine = async (lineId: string) => {
  const { error } = await supabase
    .schema('crm')
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
