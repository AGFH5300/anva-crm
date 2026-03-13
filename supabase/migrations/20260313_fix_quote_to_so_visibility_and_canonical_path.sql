-- Canonical and stable quotation -> sales order conversion path.
-- Keeps a single implementation (crm.crm_convert_quotation_to_sales_order(uuid,text))
-- and compatibility wrappers delegated to it.

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

create or replace function crm.crm_convert_quotation_to_sales_order(p_quotation_id uuid)
returns uuid
language sql
security definer
set search_path = crm, public
as $$
  select crm.crm_convert_quotation_to_sales_order(p_quotation_id, null);
$$;

create or replace function crm.convert_quotation_to_sales_order(p_quotation_id uuid, p_client_po_number text default null)
returns uuid
language sql
security definer
set search_path = crm, public
as $$
  select crm.crm_convert_quotation_to_sales_order(p_quotation_id, p_client_po_number);
$$;

create or replace function crm.convert_quotation_to_sales_order(p_quotation_id uuid)
returns uuid
language sql
security definer
set search_path = crm, public
as $$
  select crm.crm_convert_quotation_to_sales_order(p_quotation_id, null);
$$;

grant execute on function crm.crm_convert_quotation_to_sales_order(uuid, text) to authenticated;
grant execute on function crm.crm_convert_quotation_to_sales_order(uuid) to authenticated;
grant execute on function crm.convert_quotation_to_sales_order(uuid, text) to authenticated;
grant execute on function crm.convert_quotation_to_sales_order(uuid) to authenticated;
