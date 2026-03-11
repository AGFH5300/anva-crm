import { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import {
  enquirySchema,
  lineSchema,
  quotationCommercialTermsSchema,
  quotationLineSchema,
  type EnquiryInput,
  type LineInput,
  type QuotationCommercialTermsInput,
  type QuotationLineInput
} from '@/lib/crmValidation';
import type { CompanyDocumentSettings, Enquiry, EnquiryLine, Invoice, JobType, Quotation, QuotationLine, SalesOrder, SalesOrderLine, SalesUser, Supplier, SupplierRfqDocument } from '@/types/crm';

const throwIfError = (error: PostgrestError | null) => {
  if (error) {
    throw new Error(error.message);
  }
};


const callFirstAvailableRpc = async <T>(names: string[], args: Record<string, unknown>) => {
  let lastError = '';

  for (const name of names) {
    const response = await supabase.schema('crm').rpc(name, args);
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



const formatSupabaseConnectivityError = (err: unknown, action: string) => {
  const message = err instanceof Error ? err.message : String(err);
  if (message === 'Failed to fetch' || message.toLowerCase().includes('failed to fetch')) {
    return new Error(`Unable to ${action}. Could not reach Supabase API. Check NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY and network access.`);
  }
  return err instanceof Error ? err : new Error(message);
};

const getDiscountAmount = (baseAmount: number, discountPct: number, discountAmount: number) => {
  const pctAmount = baseAmount * (discountPct / 100);
  if (discountAmount > 0) return Math.min(baseAmount, discountAmount);
  return Math.min(baseAmount, pctAmount);
};

const isUndefinedColumnError = (error: PostgrestError | null) => Boolean(
  error
  && (
    error.code === '42703'
    || error.code === 'PGRST204'
    || /column .* does not exist/i.test(error.message)
    || /could not find the '.*' column .* schema cache/i.test(error.message)
  )
);

const normalizeQuotation = (row: Record<string, unknown>, clientName: string | null): Quotation => ({
  id: String(row.id ?? ''),
  enquiry_id: (row.enquiry_id as string | null | undefined) ?? null,
  job_number: (row.job_number as string | null | undefined) ?? null,
  client_id: String(row.client_id ?? ''),
  client_name: clientName,
  document_number: String(row.document_number ?? ''),
  status: ((row.status as Quotation['status'] | undefined) ?? 'draft'),
  currency: ((row.currency as Quotation['currency'] | undefined) ?? 'AED'),
  subtotal: Number(row.subtotal ?? 0),
  vat_amount: Number(row.vat_amount ?? 0),
  total: Number(row.total ?? 0),
  terms_and_conditions: (row.terms_and_conditions as string | null | undefined) ?? null,
  delivery_terms: (row.delivery_terms as string | null | undefined) ?? null,
  delivery_time: (row.delivery_time as string | null | undefined) ?? null,
  payment_terms: (row.payment_terms as string | null | undefined) ?? null,
  parts_origin: (row.parts_origin as string | null | undefined) ?? null,
  parts_quality: (row.parts_quality as string | null | undefined) ?? null,
  customer_reference: (row.customer_reference as string | null | undefined) ?? null,
  client_reference_number: ((row.client_reference_number as string | null | undefined) ?? (row.customer_reference as string | null | undefined) ?? null),
  customer_trn: (row.customer_trn as string | null | undefined) ?? null,
  company_trn: (row.company_trn as string | null | undefined) ?? null,
  pic_details: (row.pic_details as string | null | undefined) ?? null,
  additional_notes: (row.additional_notes as string | null | undefined) ?? null,
  company_letterhead_enabled: (row.company_letterhead_enabled as boolean | null | undefined) ?? false,
  stamp_enabled: (row.stamp_enabled as boolean | null | undefined) ?? true,
  signature_enabled: (row.signature_enabled as boolean | null | undefined) ?? true,
  validity: (row.validity as string | null | undefined) ?? null,
  created_at: String(row.created_at ?? new Date(0).toISOString())
});

export const listClients = async () => {
  const { data, error } = await supabase
    .schema('crm')
    .from('clients')
    .select('id,name,type,status,account_code')
    .in('type', ['client', 'both'])
    .eq('status', 'active')
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Unable to read customers from crm.clients: ${error.message}`);
  }

  return (data ?? []) as Array<{ id: string; name: string }>;
};

export const listClientDirectory = async () => {
  const { data, error } = await supabase
    .schema('crm')
    .from('clients')
    .select('id,name,email:contact_email,phone:contact_phone,type,status')
    .in('type', ['client', 'both'])
    .order('name', { ascending: true });

  throwIfError(error);
  return (data ?? []) as Array<Record<string, string | null>>;
};

export const listVendorDirectory = async () => {
  const { data, error } = await supabase
    .schema('crm')
    .from('clients')
    .select('id,name,email:contact_email,phone:contact_phone,type,status')
    .in('type', ['vendor', 'both'])
    .order('name', { ascending: true });

  throwIfError(error);
  return (data ?? []) as Array<Record<string, string | null>>;
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
    .order('sort_order', { ascending: true });

  throwIfError(error);
  return (data ?? []) as JobType[];
};

export const listActiveSalesUsers = async () => {
  const { data, error } = await supabase
    .schema('crm')
    .rpc('list_active_sales_users');

  throwIfError(error);

  return ((data ?? []) as Array<{ id: string; display_name: string | null; email: string | null }>).map((user) => ({
    id: user.id,
    full_name: user.display_name ?? user.email ?? 'Unknown',
    email: user.email,
    job_title: null,
    is_active: true,
  }));
};

export const listEnquiries = async () => {
  try {
    const { data, error } = await supabase
      .schema('crm')
      .from('enquiries')
      .select('id, job_number, enquiry_date, client_id, contact_id, job_type_id, sales_pic_user_id, pic_name, pic_phone, pic_email, vessel_name, vessel_imo_number, shipyard, hull_number, status, machinery_for, machinery_make, machinery_type, machinery_serial_no, client_reference_number, created_at, client:clients(name), job_type:job_types(name), quotations(id)')
      .in('status', ACTIVE_ENQUIRY_STATUSES)
      .order('enquiry_date', { ascending: false })
      .order('created_at', { ascending: false });

    throwIfError(error);
    return ((data ?? []) as Array<Enquiry & {
      client?: { name: string | null } | Array<{ name: string | null }> | null;
      job_type?: { name: string | null } | Array<{ name: string | null }> | null;
      quotations?: Array<{ id: string | null }> | null;
    }>)
      .filter((item) => !item.quotations?.length)
      .map(({ client, job_type, quotations, ...item }) => ({
      ...item,
      client_name: getRelationName(client) ?? null,
      job_type_name: getRelationName(job_type) ?? null,
    }));
  } catch (err) {
    throw formatSupabaseConnectivityError(err, 'load enquiries');
  }
};

export const getEnquiryDetail = async (id: string) => {
  const [{ data: enquiry, error: enquiryError }, { data: lines, error: linesError }] = await Promise.all([
    supabase
      .schema('crm')
      .from('enquiries')
      .select('id, job_number, enquiry_date, client_id, contact_id, job_type_id, sales_pic_user_id, pic_name, pic_phone, pic_email, vessel_name, vessel_imo_number, shipyard, hull_number, status, machinery_for, machinery_make, machinery_type, machinery_serial_no, client_reference_number, created_at, client:clients(name), job_type:job_types(name)')
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
  const baseSelect = 'id, job_number, enquiry_date, client_id, contact_id, job_type_id, sales_pic_user_id, pic_name, pic_phone, pic_email, vessel_name, vessel_imo_number, shipyard, hull_number, status, machinery_for, machinery_make, machinery_type, machinery_serial_no, client_reference_number, created_at';

  const { data, error } = await supabase
    .schema('crm')
    .from('enquiries')
    .insert({
      enquiry_date: new Date().toISOString().slice(0, 10),
      client_id: parsed.clientId,
      contact_id: parsed.contactId ?? null,
      job_type_id: parsed.jobTypeId,
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
      machinery_serial_no: parsed.machinerySerialNo ?? null,
      client_reference_number: parsed.clientReferenceNumber ?? null
    })
    .select(baseSelect)
    .single();

  throwIfError(error);
  return data as Enquiry;
};


export const updateEnquiry = async (
  id: string,
  payload: Pick<EnquiryInput, 'jobTypeId' | 'salesPicUserId' | 'picName' | 'picPhone' | 'picEmail' | 'vesselName' | 'vesselImoNumber' | 'shipyard' | 'hullNumber' | 'clientReferenceNumber'>
) => {
  const parsed = enquirySchema
    .pick({
      jobTypeId: true,
      salesPicUserId: true,
      picName: true,
      picPhone: true,
      picEmail: true,
      vesselName: true,
      vesselImoNumber: true,
      shipyard: true,
      hullNumber: true,
      clientReferenceNumber: true
    })
    .parse(payload);

  const { data, error } = await supabase
    .schema('crm')
    .from('enquiries')
    .update({
      job_type_id: parsed.jobTypeId,
      sales_pic_user_id: parsed.salesPicUserId ?? null,
      pic_name: parsed.picName ?? null,
      pic_phone: parsed.picPhone ?? null,
      pic_email: parsed.picEmail ?? null,
      vessel_name: parsed.vesselName,
      vessel_imo_number: parsed.vesselImoNumber ?? null,
      shipyard: parsed.shipyard ?? null,
      hull_number: parsed.hullNumber ?? null,
      client_reference_number: parsed.clientReferenceNumber ?? null
    })
    .eq('id', id)
    .select('id, job_number, enquiry_date, client_id, contact_id, job_type_id, sales_pic_user_id, pic_name, pic_phone, pic_email, vessel_name, vessel_imo_number, shipyard, hull_number, status, machinery_for, machinery_make, machinery_type, machinery_serial_no, client_reference_number, created_at')
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
  const { data: enquiry, error: enquiryError } = await supabase
    .schema('crm')
    .from('enquiries')
    .select('id, job_number')
    .eq('id', enquiryId)
    .single();

  throwIfError(enquiryError);

  if (!enquiry?.job_number) {
    throw new Error('Cannot convert enquiry without a parent enquiry job number.');
  }

  const { data, error } = await supabase
    .schema('crm')
    .rpc('crm_convert_enquiry_to_quotation_draft', { p_enquiry_id: enquiryId });

  throwIfError(error);

  if (!data) {
    throw new Error('Conversion succeeded but no quotation id was returned.');
  }

  const { error: syncError } = await supabase
    .schema('crm')
    .from('quotations')
    .update({ job_number: enquiry.job_number })
    .eq('id', data);

  throwIfError(syncError);

  const { error: enquiryStatusError } = await supabase
    .schema('crm')
    .from('enquiries')
    .update({ status: 'won' })
    .eq('id', enquiryId);

  throwIfError(enquiryStatusError);

  return data as string;
};

export const listQuotations = async () => {
  const selectCandidates = [
    'id, enquiry_id, job_number, client_id, document_number, status, currency, subtotal, vat_amount, total, terms_and_conditions, delivery_terms, delivery_time, payment_terms, parts_origin, parts_quality, customer_reference, client_reference_number, customer_trn, company_trn, pic_details, additional_notes, company_letterhead_enabled, stamp_enabled, signature_enabled, validity, created_at, client:clients(name), sales_orders(id)',
    'id, enquiry_id, job_number, client_id, document_number, status, currency, subtotal, vat_amount, total, delivery_terms, delivery_time, payment_terms, parts_origin, parts_quality, customer_reference, client_reference_number, customer_trn, company_trn, pic_details, additional_notes, company_letterhead_enabled, stamp_enabled, signature_enabled, validity, created_at, client:clients(name), sales_orders(id)',
    'id, enquiry_id, client_id, document_number, status, currency, subtotal, vat_amount, total, created_at, client:clients(name), sales_orders(id)'
  ];

  let data: Array<Record<string, unknown>> | null = null;
  let error: PostgrestError | null = null;

  for (const selectClause of selectCandidates) {
    const response = await supabase
      .schema('crm')
      .from('quotations')
      .select(selectClause)
      .in('status', ACTIVE_QUOTATION_STATUSES)
      .order('created_at', { ascending: false });

    if (!response.error) {
      data = (response.data ?? []) as unknown as Array<Record<string, unknown>>;
      error = null;
      break;
    }

    error = response.error;
    if (!isUndefinedColumnError(response.error)) {
      break;
    }
  }

  throwIfError(error);

  return (data ?? [])
    .filter((item) => !(Array.isArray(item.sales_orders) && item.sales_orders.length > 0))
    .map((item) => normalizeQuotation(item, getRelationName((item.client as { name: string | null } | Array<{ name: string | null }> | null | undefined)) ?? null));
};

export const getQuotationDetail = async (id: string) => {
  const selectCandidates = [
    'id, enquiry_id, job_number, client_id, document_number, status, currency, subtotal, vat_amount, total, terms_and_conditions, delivery_terms, delivery_time, payment_terms, parts_origin, parts_quality, customer_reference, client_reference_number, customer_trn, company_trn, pic_details, additional_notes, company_letterhead_enabled, stamp_enabled, signature_enabled, validity, created_at, client:clients(name), enquiry:enquiries(id,job_number,vessel_name,machinery_for,machinery_make,machinery_type,machinery_serial_no,job_type:job_types(name))',
    'id, enquiry_id, job_number, client_id, document_number, status, currency, subtotal, vat_amount, total, delivery_terms, delivery_time, payment_terms, parts_origin, parts_quality, customer_reference, client_reference_number, customer_trn, company_trn, pic_details, additional_notes, company_letterhead_enabled, stamp_enabled, signature_enabled, validity, created_at, client:clients(name), enquiry:enquiries(id,job_number,vessel_name,machinery_for,machinery_make,machinery_type,machinery_serial_no,job_type:job_types(name))',
    'id, enquiry_id, client_id, document_number, status, currency, subtotal, vat_amount, total, created_at, client:clients(name), enquiry:enquiries(id,job_number,vessel_name,machinery_for,machinery_make,machinery_type,machinery_serial_no,job_type:job_types(name))'
  ];

  const linesQuery = supabase
    .schema('crm')
    .from('quotation_items')
    .select('id, quotation_id, description, quantity, supplier_cost, supplier_currency, exchange_rate, landed_aed_cost, margin_pct, unit_price, currency, discount_pct, vat_rate, is_zero_rated, is_exempt, discount, line_total, sort_order')
    .eq('quotation_id', id)
    .order('sort_order');

  let quotation: Record<string, unknown> | null = null;
  let quotationError: PostgrestError | null = null;
  let lines: unknown[] | null = null;
  let linesError: PostgrestError | null = null;

  for (const selectClause of selectCandidates) {
    const [quotationResponse, linesResponse] = await Promise.all([
      supabase
        .schema('crm')
        .from('quotations')
        .select(selectClause)
        .eq('id', id)
        .single(),
      linesQuery
    ]);

    quotation = (quotationResponse.data ?? null) as unknown as Record<string, unknown> | null;
    quotationError = quotationResponse.error;
    lines = linesResponse.data;
    linesError = linesResponse.error;

    if (!quotationError || !isUndefinedColumnError(quotationError)) {
      break;
    }
  }

  throwIfError(quotationError);
  throwIfError(linesError);

  const quotationRow = (quotation ?? {}) as unknown as (Quotation & {
    client?: { name: string | null } | Array<{ name: string | null }> | null;
    enquiry?: ({
      id: string;
      job_number: string;
      vessel_name: string | null;
      machinery_for: string | null;
      machinery_make: string | null;
      machinery_type: string | null;
      machinery_serial_no: string | null;
      job_type?: { name: string | null } | Array<{ name: string | null }> | null;
    } | Array<{
      id: string;
      job_number: string;
      vessel_name: string | null;
      machinery_for: string | null;
      machinery_make: string | null;
      machinery_type: string | null;
      machinery_serial_no: string | null;
      job_type?: { name: string | null } | Array<{ name: string | null }> | null;
    }>) | null;
  });

  const { client, enquiry, ...quotationData } = quotationRow;
  const parentEnquiry = Array.isArray(enquiry) ? enquiry[0] : enquiry;

  return {
    quotation: {
      ...normalizeQuotation(quotationData as unknown as Record<string, unknown>, getRelationName(client) ?? null),
      enquiry: parentEnquiry ? {
        id: parentEnquiry.id,
        job_number: parentEnquiry.job_number,
        vessel_name: parentEnquiry.vessel_name,
        machinery_for: parentEnquiry.machinery_for,
        machinery_make: parentEnquiry.machinery_make,
        machinery_type: parentEnquiry.machinery_type,
        machinery_serial_no: parentEnquiry.machinery_serial_no
      } : null,
      job_type_name: parentEnquiry ? getRelationName(parentEnquiry.job_type) ?? null : null
    } as Quotation,
    lines: (lines ?? []) as QuotationLine[]
  };
};

export const addQuotationLine = async (quotationId: string, payload: QuotationLineInput) => {
  const parsed = quotationLineSchema.parse(payload);
  const baseAmount = parsed.quantity * parsed.unitPrice;
  const discountAmount = getDiscountAmount(baseAmount, parsed.discountPct, parsed.discount);
  const discountedBase = Math.max(0, baseAmount - discountAmount);
  const lineVat = discountedBase * (parsed.vatRate / 100);
  const lineTotal = Number((discountedBase + lineVat).toFixed(2));

  const { data: latest } = await supabase
    .schema('crm')
    .from('quotation_items')
    .select('sort_order')
    .eq('quotation_id', quotationId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .schema('crm')
    .from('quotation_items')
    .insert({
      quotation_id: quotationId,
      description: parsed.description,
      quantity: parsed.quantity,
      supplier_cost: parsed.supplierCost,
      supplier_currency: parsed.supplierCurrency,
      exchange_rate: parsed.exchangeRate,
      landed_aed_cost: parsed.landedAedCost,
      margin_pct: parsed.marginPct,
      unit_price: parsed.unitPrice,
      currency: parsed.currency,
      vat_rate: parsed.vatRate,
      is_zero_rated: parsed.isZeroRated,
      is_exempt: parsed.isExempt,
      discount_pct: parsed.discountPct,
      discount: parsed.discount,
      line_total: lineTotal,
      sort_order: (latest?.sort_order ?? 0) + 1
    })
    .select('id, quotation_id, description, quantity, supplier_cost, supplier_currency, exchange_rate, landed_aed_cost, margin_pct, unit_price, currency, discount_pct, vat_rate, is_zero_rated, is_exempt, discount, line_total, sort_order')
    .single();

  throwIfError(error);
  await recalculateQuotationTotals(quotationId);
  return data as QuotationLine;
};

export const updateQuotationCommercialTerms = async (quotationId: string, payload: QuotationCommercialTermsInput) => {
  const parsed = quotationCommercialTermsSchema.parse(payload);

  const { error } = await supabase
    .schema('crm')
    .from('quotations')
    .update({
      terms_and_conditions: parsed.termsAndConditions || null,
      delivery_terms: parsed.deliveryTerms || null,
      delivery_time: parsed.deliveryTime || null,
      payment_terms: parsed.paymentTerms || null,
      parts_origin: parsed.partsOrigin || null,
      parts_quality: parsed.partsQuality || null,
      customer_reference: parsed.customerReference || null,
      customer_trn: parsed.customerTrn || null,
      company_trn: parsed.companyTrn || null,
      pic_details: parsed.picDetails || null,
      additional_notes: parsed.additionalNotes || null,
      company_letterhead_enabled: parsed.companyLetterheadEnabled,
      stamp_enabled: parsed.stampEnabled,
      signature_enabled: parsed.signatureEnabled,
      validity: parsed.validity || null
    })
    .eq('id', quotationId);

  throwIfError(error);
};

const recalculateQuotationTotals = async (quotationId: string) => {
  const { data: lines, error: linesError } = await supabase
    .schema('crm')
    .from('quotation_items')
    .select('quantity, unit_price, discount, discount_pct, vat_rate')
    .eq('quotation_id', quotationId);

  throwIfError(linesError);

  const computed = (lines ?? []).reduce(
    (acc, line) => {
      const baseAmount = Number(line.quantity) * Number(line.unit_price);
      const discountAmount = getDiscountAmount(baseAmount, Number(line.discount_pct ?? 0), Number(line.discount ?? 0));
      const discountedBase = Math.max(0, baseAmount - discountAmount);
      const lineVat = discountedBase * (Number(line.vat_rate ?? 0) / 100);

      return {
        subtotal: acc.subtotal + discountedBase,
        vatAmount: acc.vatAmount + lineVat
      };
    },
    { subtotal: 0, vatAmount: 0 }
  );

  const subtotal = Number(computed.subtotal.toFixed(2));
  const vatAmount = Number(computed.vatAmount.toFixed(2));
  const total = Number((subtotal + vatAmount).toFixed(2));

  const { error: updateError } = await supabase
    .schema('crm')
    .from('quotations')
    .update({ subtotal, vat_amount: vatAmount, total })
    .eq('id', quotationId);

  throwIfError(updateError);
};

export const updateQuotationLines = async (
  quotationId: string,
  payload: Array<Pick<QuotationLine, 'id' | 'quantity' | 'supplier_cost' | 'supplier_currency' | 'exchange_rate' | 'landed_aed_cost' | 'margin_pct' | 'unit_price' | 'discount_pct' | 'discount' | 'vat_rate'>>
) => {
  for (const line of payload) {
    const quantity = Number(line.quantity);
    const supplierCost = Number(line.supplier_cost ?? 0);
    const exchangeRate = Number(line.exchange_rate ?? 1);
    const landedAedCost = Number(line.landed_aed_cost ?? 0);
    const marginPct = Number(line.margin_pct ?? 0);
    const unitPrice = Number(line.unit_price);
    const discountPct = Number(line.discount_pct ?? 0);
    const discount = Number(line.discount ?? 0);
    const vatRate = Number(line.vat_rate ?? 0);
    const baseAmount = quantity * unitPrice;
    const discountAmount = getDiscountAmount(baseAmount, discountPct, discount);
    const discountedBase = Math.max(0, baseAmount - discountAmount);
    const lineVat = discountedBase * (vatRate / 100);
    const lineTotal = Number((discountedBase + lineVat).toFixed(2));

    const { error } = await supabase
      .schema('crm')
      .from('quotation_items')
      .update({
        quantity,
        supplier_cost: supplierCost,
        supplier_currency: line.supplier_currency ?? 'AED',
        exchange_rate: exchangeRate,
        landed_aed_cost: landedAedCost,
        margin_pct: marginPct,
        unit_price: unitPrice,
        discount_pct: discountPct,
        discount,
        vat_rate: vatRate,
        line_total: lineTotal
      })
      .eq('id', line.id)
      .eq('quotation_id', quotationId);

    throwIfError(error);
  }

  await recalculateQuotationTotals(quotationId);
};

export const deleteQuotationLine = async (quotationId: string, lineId: string) => {
  const { error } = await supabase
    .schema('crm')
    .from('quotation_items')
    .delete()
    .eq('id', lineId)
    .eq('quotation_id', quotationId);

  throwIfError(error);
  await recalculateQuotationTotals(quotationId);
};

export const convertQuotationToSalesOrder = async (quotationId: string, clientPoNumber?: string) => {
  const { data, error } = await supabase
    .schema('crm')
    .rpc('crm_convert_quotation_to_sales_order', {
      p_quotation_id: quotationId,
      p_client_po_number: clientPoNumber?.trim() || null
    });

  throwIfError(error);

  if (typeof data === 'string') {
    return data;
  }

  if (data && typeof data === 'object' && 'id' in (data as Record<string, unknown>) && typeof (data as Record<string, unknown>).id === 'string') {
    return (data as { id: string }).id;
  }

  throw new Error('Quotation conversion RPC returned an unsupported payload. Expected sales order id as uuid text or { id }.');
};

export const getSalesOrderDetail = async (id: string) => {
  const [{ data: order, error: orderError }, { data: lines, error: linesError }] = await Promise.all([
    supabase
      .schema('crm')
      .from('sales_orders')
      .select('id, quotation_id, client_id, document_number, status, issue_date, currency, subtotal, vat_amount, total, terms_and_conditions, delivery_terms, delivery_time, payment_terms, parts_origin, parts_quality, validity, customer_trn, company_trn, pic_details, additional_notes, company_letterhead_enabled, stamp_enabled, signature_enabled, client_reference_number, client_po_number, created_at')
      .eq('id', id)
      .single(),
    supabase
      .schema('crm')
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

export const updateSalesOrderClientPoNumber = async (id: string, clientPoNumber: string) => {
  const { data, error } = await supabase
    .schema('crm')
    .from('sales_orders')
    .update({ client_po_number: clientPoNumber.trim() || null })
    .eq('id', id)
    .select('id, quotation_id, client_id, document_number, status, issue_date, currency, subtotal, vat_amount, total, terms_and_conditions, delivery_terms, delivery_time, payment_terms, parts_origin, parts_quality, validity, customer_trn, company_trn, pic_details, additional_notes, company_letterhead_enabled, stamp_enabled, signature_enabled, client_reference_number, client_po_number, created_at')
    .single();

  throwIfError(error);
  return data as SalesOrder;
};


type SupplierInput = {
  companyName: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  addressLine1?: string;
  city?: string;
  country?: string;
  notes?: string;
};

const MOCK_SUPPLIERS: Supplier[] = [
  {
    id: 'mock-supplier-001',
    supplier_code: 'SUP-001',
    company_name: 'ABC Marine Supplies LLC',
    contact_person: 'Ahmed Khan',
    email: 'sales@abcmarine.example',
    phone: '+971500001001',
    mobile: null,
    website: null,
    address_line_1: 'Al Quoz Industrial Area',
    address_line_2: null,
    city: 'Dubai',
    state: null,
    country: 'UAE',
    postal_code: null,
    tax_registration_no: null,
    payment_terms: null,
    currency: 'AED',
    vendor_type: null,
    notes: 'Mock supplier fallback',
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString()
  },
  {
    id: 'mock-supplier-002',
    supplier_code: 'SUP-002',
    company_name: 'Gulf Engine Parts Trading',
    contact_person: 'Fatima Noor',
    email: 'quotes@gulfengineparts.example',
    phone: '+971500001002',
    mobile: null,
    website: null,
    address_line_1: 'Sharjah Industrial Area',
    address_line_2: null,
    city: 'Sharjah',
    state: null,
    country: 'UAE',
    postal_code: null,
    tax_registration_no: null,
    payment_terms: null,
    currency: 'AED',
    vendor_type: null,
    notes: 'Mock supplier fallback',
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString()
  },
  {
    id: 'mock-supplier-003',
    supplier_code: 'SUP-003',
    company_name: 'Oceanic Ship Spares FZE',
    contact_person: 'Ravi Menon',
    email: 'rfq@oceanicspares.example',
    phone: '+971500001003',
    mobile: null,
    website: null,
    address_line_1: 'JAFZA South',
    address_line_2: null,
    city: 'Dubai',
    state: null,
    country: 'UAE',
    postal_code: null,
    tax_registration_no: null,
    payment_terms: null,
    currency: 'AED',
    vendor_type: null,
    notes: 'Mock supplier fallback',
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString()
  }
];

const isMissingSuppliersTableError = (message: string) =>
  message.includes("crm.suppliers") ||
  message.toLowerCase().includes("relation \"crm.suppliers\" does not exist");

const filterMockSuppliers = (search: string) => {
  const query = search.trim().toLowerCase();
  if (!query) return MOCK_SUPPLIERS;
  return MOCK_SUPPLIERS.filter((supplier) =>
    supplier.company_name.toLowerCase().includes(query) ||
    (supplier.email ?? '').toLowerCase().includes(query) ||
    (supplier.contact_person ?? '').toLowerCase().includes(query)
  );
};

export const listSuppliers = async (search = '') => {
  let query = supabase
    .schema('crm')
    .from('suppliers')
    .select('id,supplier_code,company_name,contact_person,email,phone,mobile,website,address_line_1,address_line_2,city,state,country,postal_code,tax_registration_no,payment_terms,currency,vendor_type,notes,created_at,updated_at')
    .order('company_name', { ascending: true })
    .limit(100);

  if (search.trim()) {
    query = query.or(`company_name.ilike.%${search.trim()}%,email.ilike.%${search.trim()}%,contact_person.ilike.%${search.trim()}%`);
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingSuppliersTableError(error.message)) {
      return filterMockSuppliers(search);
    }
    throw new Error(error.message);
  }

  return (data ?? []) as Supplier[];
};

export const checkSupplierDuplicates = async (companyName: string, email?: string) => {
  const clauses = [`company_name.ilike.${companyName.trim()}`];
  if (email?.trim()) clauses.push(`email.ilike.${email.trim()}`);
  const { data, error } = await supabase
    .schema('crm')
    .from('suppliers')
    .select('id,company_name,email')
    .or(clauses.join(','))
    .limit(5);

  if (error) {
    if (isMissingSuppliersTableError(error.message)) {
      const mockMatches = filterMockSuppliers(companyName).filter((supplier) =>
        supplier.company_name.toLowerCase() === companyName.trim().toLowerCase() ||
        (!!email?.trim() && supplier.email?.toLowerCase() === email.trim().toLowerCase())
      );

      return mockMatches.map((supplier) => ({ id: supplier.id, company_name: supplier.company_name, email: supplier.email }));
    }
    throw new Error(error.message);
  }

  return data ?? [];
};

export const createSupplier = async (payload: SupplierInput) => {
  const { data, error } = await supabase
    .schema('crm')
    .from('suppliers')
    .insert({
      company_name: payload.companyName.trim(),
      contact_person: payload.contactPerson?.trim() || null,
      email: payload.email?.trim() || null,
      phone: payload.phone?.trim() || null,
      mobile: payload.mobile?.trim() || null,
      address_line_1: payload.addressLine1?.trim() || null,
      city: payload.city?.trim() || null,
      country: payload.country?.trim() || null,
      notes: payload.notes?.trim() || null
    })
    .select('id,supplier_code,company_name,contact_person,email,phone,mobile,website,address_line_1,address_line_2,city,state,country,postal_code,tax_registration_no,payment_terms,currency,vendor_type,notes,created_at,updated_at')
    .single();

  throwIfError(error);
  return data as Supplier;
};

export const createSupplierRfqDocumentLog = async (payload: {
  enquiryId: string;
  supplierId: string;
  documentNumber: string;
  includeSerialNumber: boolean;
  filePath: string;
  notes?: string;
  selectedLineIds?: string[];
}) => {
  const { data, error } = await supabase
    .schema('crm')
    .from('supplier_rfq_documents')
    .insert({
      enquiry_id: payload.enquiryId,
      supplier_id: payload.supplierId,
      document_type: 'supplier_rfq_pdf',
      document_number: payload.documentNumber,
      include_serial_number: payload.includeSerialNumber,
      file_path: payload.filePath,
      notes: payload.notes ?? null,
      selected_line_ids: payload.selectedLineIds ?? []
    })
    .select('id,enquiry_id,supplier_id,document_type,document_number,include_serial_number,file_path,generated_by,generated_at,notes')
    .single();

  throwIfError(error);
  return data as SupplierRfqDocument;
};

export const upsertEnquirySupplierLink = async (payload: {
  enquiryId: string;
  supplier: Supplier;
  status?: 'draft' | 'generated' | 'sent' | 'quote_received' | 'regretted' | 'closed';
}) => {
  const { error } = await supabase
    .schema('crm')
    .from('enquiry_suppliers')
    .upsert({
      enquiry_id: payload.enquiryId,
      supplier_id: payload.supplier.id,
      supplier_name_snapshot: payload.supplier.company_name,
      contact_person_snapshot: payload.supplier.contact_person,
      email_snapshot: payload.supplier.email,
      phone_snapshot: payload.supplier.phone ?? payload.supplier.mobile,
      status: payload.status ?? 'generated',
      sent_at: payload.status === 'sent' ? new Date().toISOString() : null
    }, { onConflict: 'enquiry_id,supplier_id' });

  throwIfError(error);
};

export const uploadSupplierRfqPdf = async (payload: {
  enquiryId: string;
  supplierId: string;
  documentNumber: string;
  blob: Blob;
}) => {
  const filePath = `supplier-rfqs/${payload.enquiryId}/${payload.supplierId}/${payload.documentNumber}.pdf`;
  const { error } = await supabase
    .storage
    .from('crm-documents')
    .upload(filePath, payload.blob, { contentType: 'application/pdf', upsert: true });

  if (error) throw new Error(error.message);
  return filePath;
};




export type DashboardStageCounts = {
  enquiries: number;
  quotations: number;
  saleOrders: number;
  invoices: number;
};

const ACTIVE_ENQUIRY_STATUSES: Enquiry['status'][] = ['new', 'qualified', 'proposal', 'negotiation'];
const ACTIVE_QUOTATION_STATUSES: Quotation['status'][] = ['draft', 'sent'];
const ACTIVE_SALES_ORDER_STATUSES: SalesOrder['status'][] = ['draft', 'confirmed', 'in-progress'];
const ACTIVE_INVOICE_STATUSES: Invoice['status'][] = ['draft', 'issued', 'overdue'];

export const getDashboardStageCounts = async (): Promise<DashboardStageCounts> => {
  const [enquiries, quotations, saleOrders, invoices] = await Promise.all([
    listEnquiries(),
    listQuotations(),
    listSalesOrders(),
    listInvoices()
  ]);

  return {
    enquiries: enquiries.length,
    quotations: quotations.length,
    saleOrders: saleOrders.length,
    invoices: invoices.length
  };
};

export const listSalesOrders = async () => {
  const { data, error } = await supabase
    .schema('crm')
    .from('sales_orders')
    .select('id, quotation_id, client_id, document_number, status, issue_date, currency, subtotal, vat_amount, total, client_reference_number, client_po_number, created_at, client:clients(name), invoices(id)')
    .in('status', ACTIVE_SALES_ORDER_STATUSES)
    .order('created_at', { ascending: false });

  throwIfError(error);
  return ((data ?? []) as Array<SalesOrder & {
    client?: { name: string | null } | Array<{ name: string | null }> | null;
    invoices?: Array<{ id: string | null }> | null;
  }>)
    .filter((item) => !item.invoices?.length)
    .map(({ client, invoices, ...item }) => ({
      ...item,
      client_name: getRelationName(client) ?? null
    }));
};

export const listInvoices = async () => {
  const { data, error } = await supabase
    .schema('crm')
    .from('invoices')
    .select('id, sales_order_id, client_id, document_number, status, issue_date, due_date, currency, total, balance_due, client_po_number, created_at, client:clients(name)')
    .in('status', ACTIVE_INVOICE_STATUSES)
    .order('created_at', { ascending: false });

  throwIfError(error);
  return ((data ?? []) as Array<Invoice & { client?: { name: string | null } | Array<{ name: string | null }> | null }>).map(({ client, ...item }) => ({
    ...item,
    client_name: getRelationName(client) ?? null
  }));
};

export const convertSalesOrderToInvoice = async (salesOrderId: string) => {
  const invoiceId = await callFirstAvailableRpc<string>(
    ['convert_sales_order_to_invoice', 'crm_convert_sales_order_to_invoice'],
    { p_sales_order_id: salesOrderId }
  );

  const { error } = await supabase
    .schema('crm')
    .from('sales_orders')
    .update({ status: 'fulfilled' })
    .eq('id', salesOrderId);

  throwIfError(error);

  return invoiceId;
};

export const getCompanyDocumentSettings = async () => {
  const { data, error } = await supabase
    .schema('crm')
    .from('company_document_settings')
    .select('id,company_name,company_trn,default_payment_terms,default_delivery_terms,default_validity,default_footer_text,default_terms_and_conditions,default_letterhead_enabled,default_stamp_enabled,default_signature_enabled,logo_url,stamp_url,updated_at')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  throwIfError(error);
  return (data ?? null) as CompanyDocumentSettings | null;
};


export const updateCompanyDocumentSettings = async (payload: Partial<CompanyDocumentSettings> & { id?: string }) => {
  const { data, error } = await supabase
    .schema('crm')
    .from('company_document_settings')
    .upsert({
      id: payload.id,
      company_name: payload.company_name,
      company_trn: payload.company_trn ?? null,
      default_payment_terms: payload.default_payment_terms ?? null,
      default_delivery_terms: payload.default_delivery_terms ?? null,
      default_validity: payload.default_validity ?? null,
      default_footer_text: payload.default_footer_text ?? null,
      default_terms_and_conditions: payload.default_terms_and_conditions ?? null,
      default_letterhead_enabled: payload.default_letterhead_enabled ?? true,
      default_stamp_enabled: payload.default_stamp_enabled ?? true,
      default_signature_enabled: payload.default_signature_enabled ?? true,
      logo_url: payload.logo_url ?? null,
      stamp_url: payload.stamp_url ?? null
    })
    .select('id,company_name,company_trn,default_payment_terms,default_delivery_terms,default_validity,default_footer_text,default_terms_and_conditions,default_letterhead_enabled,default_stamp_enabled,default_signature_enabled,logo_url,stamp_url,updated_at')
    .single();

  throwIfError(error);
  return data as CompanyDocumentSettings;
};
