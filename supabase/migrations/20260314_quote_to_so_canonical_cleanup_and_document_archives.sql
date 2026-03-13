-- Enforce one canonical quote->sales order RPC signature and add deterministic archive registry views.

drop function if exists crm.crm_convert_quotation_to_sales_order(uuid);
drop function if exists crm.convert_quotation_to_sales_order(uuid, text);
drop function if exists crm.convert_quotation_to_sales_order(uuid);

create or replace function crm.crm_convert_quotation_to_sales_order(p_quotation_id uuid, p_client_po_number text default null)
returns uuid
language plpgsql
security definer
set search_path = crm, public
as $$
declare
  v_quote crm.quotations%rowtype;
  v_sales_order_id uuid;
  v_client_po_number text;
begin
  v_client_po_number := nullif(trim(coalesce(p_client_po_number, '')), '');

  select * into v_quote
  from crm.quotations
  where id = p_quotation_id;

  if v_quote.id is null then
    raise exception 'Quotation % not found in crm.quotations', p_quotation_id;
  end if;

  select so.id into v_sales_order_id
  from crm.sales_orders so
  where so.quotation_id = v_quote.id
  order by so.created_at desc
  limit 1;

  if v_sales_order_id is not null then
    update crm.sales_orders
    set client_po_number = coalesce(v_client_po_number, client_po_number)
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
    v_client_po_number,
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

create or replace view crm.v_enquiries_master_registry as
select e.id, e.job_number, e.enquiry_date, e.client_id, c.name as client_name, e.client_reference_number, e.status, e.created_at
from crm.enquiries e
left join crm.clients c on c.id = e.client_id;

create or replace view crm.v_quotations_master_registry as
select q.id, q.enquiry_id, q.document_number, q.client_id, c.name as client_name, q.client_reference_number,
       q.customer_reference, q.status, q.total, q.created_at
from crm.quotations q
left join crm.clients c on c.id = q.client_id;

create or replace view crm.v_sales_orders_master_registry as
select so.id, so.quotation_id, so.document_number, q.document_number as quotation_document_number,
       so.client_id, c.name as client_name, so.client_reference_number, so.client_po_number,
       so.status, so.total, so.issue_date, so.created_at
from crm.sales_orders so
left join crm.quotations q on q.id = so.quotation_id
left join crm.clients c on c.id = so.client_id;

create or replace view crm.v_invoices_master_registry as
select i.id, i.sales_order_id, i.document_number, i.client_id, c.name as client_name,
       i.client_po_number, i.status, i.total, i.issue_date, i.created_at
from crm.invoices i
left join crm.clients c on c.id = i.client_id;
