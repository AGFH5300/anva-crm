-- Canonicalize quotation->sales order RPC, carry quotation commercial terms, and enforce enquiry job number rule for new records.

alter table crm.sales_orders
  add column if not exists terms_and_conditions text,
  add column if not exists delivery_time text,
  add column if not exists parts_origin text,
  add column if not exists parts_quality text,
  add column if not exists validity text,
  add column if not exists customer_trn text,
  add column if not exists company_trn text,
  add column if not exists pic_details text,
  add column if not exists additional_notes text,
  add column if not exists company_letterhead_enabled boolean not null default false,
  add column if not exists stamp_enabled boolean not null default true,
  add column if not exists signature_enabled boolean not null default true;

update crm.sales_orders so
set
  terms_and_conditions = coalesce(so.terms_and_conditions, q.terms_and_conditions),
  delivery_time = coalesce(so.delivery_time, q.delivery_time),
  parts_origin = coalesce(so.parts_origin, q.parts_origin),
  parts_quality = coalesce(so.parts_quality, q.parts_quality),
  validity = coalesce(so.validity, q.validity),
  customer_trn = coalesce(so.customer_trn, q.customer_trn),
  company_trn = coalesce(so.company_trn, q.company_trn),
  pic_details = coalesce(so.pic_details, q.pic_details),
  additional_notes = coalesce(so.additional_notes, q.additional_notes),
  company_letterhead_enabled = coalesce(so.company_letterhead_enabled, q.company_letterhead_enabled, false),
  stamp_enabled = coalesce(so.stamp_enabled, q.stamp_enabled, true),
  signature_enabled = coalesce(so.signature_enabled, q.signature_enabled, true),
  client_reference_number = coalesce(so.client_reference_number, q.client_reference_number, q.customer_reference)
from crm.quotations q
where so.quotation_id = q.id;

create or replace function crm.tg_set_enquiry_job_number()
returns trigger
language plpgsql
as $$
begin
  if new.job_number is null or btrim(new.job_number) = '' then
    new.job_number := 'ENQ-' || upper(substr(replace(new.id::text, '-', ''), 1, 8));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_enquiry_job_number on crm.enquiries;
create trigger trg_set_enquiry_job_number
before insert on crm.enquiries
for each row execute procedure crm.tg_set_enquiry_job_number();

update crm.enquiries
set job_number = 'ENQ-' || upper(substr(replace(id::text, '-', ''), 1, 8))
where job_number is null or btrim(job_number) = '';

-- Remove overloaded and legacy wrappers so PostgREST resolves a single deterministic RPC path.
drop function if exists crm.convert_quotation_to_sales_order(uuid, text);
drop function if exists crm.convert_quotation_to_sales_order(uuid);
drop function if exists crm.crm_convert_quotation_to_sales_order(uuid);

create or replace function crm.crm_convert_quotation_to_sales_order(p_quotation_id uuid, p_client_po_number text default null)
returns uuid
language plpgsql
security definer
set search_path = crm, public
as $$
declare
  v_quote crm.quotations%rowtype;
  v_sales_order_id uuid;
begin
  select * into v_quote
  from crm.quotations
  where id = p_quotation_id;

  if v_quote.id is null then
    raise exception 'Quotation % not found', p_quotation_id;
  end if;

  select so.id into v_sales_order_id
  from crm.sales_orders so
  where so.quotation_id = v_quote.id
  order by so.created_at desc
  limit 1;

  if v_sales_order_id is not null then
    update crm.sales_orders
    set client_po_number = coalesce(nullif(trim(p_client_po_number), ''), client_po_number)
    where id = v_sales_order_id;

    return v_sales_order_id;
  end if;

  insert into crm.sales_orders (
    quotation_id,
    client_id,
    contact_id,
    document_number,
    status,
    currency,
    payment_terms,
    delivery_terms,
    delivery_time,
    terms_and_conditions,
    parts_origin,
    parts_quality,
    validity,
    customer_trn,
    company_trn,
    pic_details,
    additional_notes,
    company_letterhead_enabled,
    stamp_enabled,
    signature_enabled,
    client_reference_number,
    client_po_number,
    issuer,
    recipient,
    meta,
    tax_summary,
    subtotal,
    vat_amount,
    corporate_tax_amount,
    discount_total,
    total,
    document_snapshot,
    created_by
  )
  values (
    v_quote.id,
    v_quote.client_id,
    v_quote.contact_id,
    crm.next_document_number('sales_order', 'SO'),
    'confirmed',
    v_quote.currency,
    v_quote.payment_terms,
    v_quote.delivery_terms,
    v_quote.delivery_time,
    v_quote.terms_and_conditions,
    v_quote.parts_origin,
    v_quote.parts_quality,
    v_quote.validity,
    v_quote.customer_trn,
    v_quote.company_trn,
    v_quote.pic_details,
    v_quote.additional_notes,
    coalesce(v_quote.company_letterhead_enabled, false),
    coalesce(v_quote.stamp_enabled, true),
    coalesce(v_quote.signature_enabled, true),
    coalesce(v_quote.client_reference_number, v_quote.customer_reference),
    nullif(trim(p_client_po_number), ''),
    v_quote.issuer,
    v_quote.recipient,
    coalesce(v_quote.meta, '{}'::jsonb),
    coalesce(v_quote.tax_summary, '{}'::jsonb),
    v_quote.subtotal,
    v_quote.vat_amount,
    coalesce(v_quote.corporate_tax_amount, 0),
    coalesce(v_quote.discount_total, 0),
    v_quote.total,
    coalesce(v_quote.document_snapshot, '{}'::jsonb),
    auth.uid()
  )
  returning id into v_sales_order_id;

  insert into crm.sales_order_items (
    sales_order_id,
    description,
    quantity,
    supplier_cost,
    supplier_currency,
    exchange_rate,
    landed_aed_cost,
    margin_pct,
    unit_price,
    currency,
    discount_pct,
    vat_rate,
    is_zero_rated,
    is_exempt,
    discount,
    line_total,
    sort_order
  )
  select
    v_sales_order_id,
    i.description,
    i.quantity,
    i.supplier_cost,
    i.supplier_currency,
    i.exchange_rate,
    i.landed_aed_cost,
    i.margin_pct,
    i.unit_price,
    i.currency,
    i.discount_pct,
    i.vat_rate,
    i.is_zero_rated,
    i.is_exempt,
    i.discount,
    i.line_total,
    i.sort_order
  from crm.quotation_items i
  where i.quotation_id = v_quote.id;

  update crm.quotations
  set status = 'accepted'
  where id = v_quote.id
    and status <> 'accepted';

  if v_quote.enquiry_id is not null then
    update crm.enquiries
    set status = 'won'
    where id = v_quote.enquiry_id;
  end if;

  return v_sales_order_id;
end;
$$;

grant execute on function crm.crm_convert_quotation_to_sales_order(uuid, text) to authenticated;
