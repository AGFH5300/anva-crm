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
import type { Enquiry, EnquiryLine, JobType, Quotation, QuotationLine, SalesOrder, SalesOrderLine, SalesUser, Supplier, SupplierRfqDocument } from '@/types/crm';

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


const getDiscountAmount = (baseAmount: number, discountPct: number, discountAmount: number) => {
  const pctAmount = baseAmount * (discountPct / 100);
  if (discountAmount > 0) return Math.min(baseAmount, discountAmount);
  return Math.min(baseAmount, pctAmount);
};

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
    .from('sales_people')
    .select('id,full_name,email,job_title,is_active')
    .eq('is_active', true)
    .order('full_name', { ascending: true });

  throwIfError(error);
  return (data ?? []) as SalesUser[];
};

export const listEnquiries = async () => {
  const { data, error } = await supabase
    .schema('crm')
    .from('enquiries')
    .select('id, job_number, enquiry_date, client_id, contact_id, job_type_id, sales_pic_user_id, pic_name, pic_phone, pic_email, vessel_name, vessel_imo_number, shipyard, hull_number, status, machinery_for, machinery_make, machinery_type, machinery_serial_no, created_at, client:clients(name), job_type:job_types(name)')
    .order('enquiry_date', { ascending: false })
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
      .select('id, job_number, enquiry_date, client_id, contact_id, job_type_id, sales_pic_user_id, pic_name, pic_phone, pic_email, vessel_name, vessel_imo_number, shipyard, hull_number, status, machinery_for, machinery_make, machinery_type, machinery_serial_no, created_at, client:clients(name), job_type:job_types(name)')
      .eq('id', id)
      .single(),
    supabase
      .schema('crm')
      .from('enquiry_items')
      .select('id, enquiry_id, item_serial_no, part_no, unit, drawing_reference, supplier_remarks, supplier_description_override, is_hidden_from_supplier_pdf, description, quantity, unit_price, currency, vat_rate, is_zero_rated, is_exempt, line_total, sort_order')
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
      machinery_serial_no: parsed.machinerySerialNo ?? null
    })
    .select('id, job_number, enquiry_date, client_id, contact_id, job_type_id, sales_pic_user_id, pic_name, pic_phone, pic_email, vessel_name, vessel_imo_number, shipyard, hull_number, status, machinery_for, machinery_make, machinery_type, machinery_serial_no, created_at')
    .single();

  throwIfError(error);
  return data as Enquiry;
};


export const updateEnquiry = async (
  id: string,
  payload: Pick<EnquiryInput, 'jobTypeId' | 'salesPicUserId' | 'picName' | 'picPhone' | 'picEmail' | 'vesselName' | 'vesselImoNumber' | 'shipyard' | 'hullNumber'>
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
      hullNumber: true
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
      hull_number: parsed.hullNumber ?? null
    })
    .eq('id', id)
    .select('id, job_number, enquiry_date, client_id, contact_id, job_type_id, sales_pic_user_id, pic_name, pic_phone, pic_email, vessel_name, vessel_imo_number, shipyard, hull_number, status, machinery_for, machinery_make, machinery_type, machinery_serial_no, created_at')
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
    .select('id, enquiry_id, item_serial_no, part_no, unit, drawing_reference, supplier_remarks, supplier_description_override, is_hidden_from_supplier_pdf, description, quantity, unit_price, currency, vat_rate, is_zero_rated, is_exempt, line_total, sort_order')
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

  return data as string;
};

export const listQuotations = async () => {
  const { data, error } = await supabase
    .schema('crm')
    .from('quotations')
    .select('id, enquiry_id, job_number, client_id, document_number, status, currency, subtotal, vat_amount, total, created_at, client:clients(name)')
    .order('created_at', { ascending: false });

  throwIfError(error);
  return ((data ?? []) as Array<Quotation & { client?: { name: string | null } | Array<{ name: string | null }> | null }>).map(({ client, ...item }) => ({
    ...item,
    client_name: getRelationName(client) ?? null
  }));
};

export const getQuotationDetail = async (id: string) => {
  const [{ data: quotation, error: quotationError }, { data: lines, error: linesError }] = await Promise.all([
    supabase
      .schema('crm')
      .from('quotations')
      .select('id, enquiry_id, job_number, client_id, document_number, status, currency, subtotal, vat_amount, total, created_at, client:clients(name), enquiry:enquiries(id,job_number,vessel_name,machinery_for,machinery_make,machinery_type,machinery_serial_no,job_type:job_types(name))')
      .eq('id', id)
      .single(),
    supabase
      .schema('crm')
      .from('quotation_items')
      .select('id, quotation_id, description, quantity, supplier_cost, supplier_currency, exchange_rate, landed_aed_cost, margin_pct, unit_price, currency, discount_pct, vat_rate, is_zero_rated, is_exempt, discount, line_total, sort_order')
      .eq('quotation_id', id)
      .order('sort_order')
  ]);

  throwIfError(quotationError);
  throwIfError(linesError);

  const quotationRow = quotation as unknown as (Quotation & {
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
      ...quotationData,
      client_name: getRelationName(client) ?? null,
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
  throwIfError(error);
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

  throwIfError(error);
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
