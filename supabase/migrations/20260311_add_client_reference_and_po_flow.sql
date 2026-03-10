alter table crm.enquiries
  add column if not exists client_reference_number text;

alter table crm.quotations
  add column if not exists client_reference_number text;

alter table crm.sales_orders
  add column if not exists client_reference_number text,
  add column if not exists client_po_number text;

alter table crm.invoices
  add column if not exists client_po_number text;

update crm.quotations
set client_reference_number = coalesce(client_reference_number, customer_reference)
where client_reference_number is null;

update crm.quotations q
set client_reference_number = coalesce(q.client_reference_number, e.client_reference_number)
from crm.enquiries e
where q.enquiry_id = e.id;

update crm.sales_orders so
set client_reference_number = coalesce(so.client_reference_number, q.client_reference_number)
from crm.quotations q
where so.quotation_id = q.id;

update crm.invoices i
set client_po_number = coalesce(i.client_po_number, so.client_po_number)
from crm.sales_orders so
where i.sales_order_id = so.id;

create or replace function crm.crm_convert_enquiry_to_quotation_draft(p_enquiry_id uuid)
returns uuid
language plpgsql
security definer
set search_path = crm, public
as $$
declare
  v_enquiry crm.enquiries%rowtype;
  v_quotation_id uuid;
begin
  select * into v_enquiry from crm.enquiries where id = p_enquiry_id;

  if v_enquiry.id is null then
    raise exception 'Enquiry % not found', p_enquiry_id;
  end if;

  insert into crm.quotations (
    enquiry_id, job_number, client_id, contact_id, document_number, status, currency,
    payment_terms, delivery_terms, customer_reference, client_reference_number,
    issuer, recipient, meta, tax_summary, subtotal, vat_amount, total, document_snapshot, created_by
  )
  values (
    v_enquiry.id, v_enquiry.job_number, v_enquiry.client_id, v_enquiry.contact_id,
    crm.next_document_number('quotation', 'QUO'), 'draft', 'AED',
    null, null, v_enquiry.client_reference_number, v_enquiry.client_reference_number,
    '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 0, 0, 0, '{}'::jsonb, auth.uid()
  )
  returning id into v_quotation_id;

  insert into crm.quotation_items (
    quotation_id, description, quantity, unit_price, currency, vat_rate, is_zero_rated, is_exempt, line_total, sort_order
  )
  select v_quotation_id, i.description, i.quantity, i.unit_price, i.currency, i.vat_rate, i.is_zero_rated, i.is_exempt, i.line_total, i.sort_order
  from crm.enquiry_items i
  where i.enquiry_id = v_enquiry.id;

  update crm.enquiries
  set status = 'proposal'
  where id = v_enquiry.id
    and status in ('new', 'qualified', 'negotiation');

  return v_quotation_id;
end;
$$;

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
  select * into v_quote from crm.quotations where id = p_quotation_id;

  if v_quote.id is null then
    raise exception 'Quotation % not found', p_quotation_id;
  end if;

  insert into crm.sales_orders (
    quotation_id, client_id, contact_id, document_number, status, currency,
    payment_terms, delivery_terms, client_reference_number, client_po_number,
    issuer, recipient, meta, tax_summary, subtotal, vat_amount, total, document_snapshot, created_by
  )
  values (
    v_quote.id, v_quote.client_id, v_quote.contact_id,
    crm.next_document_number('sales_order', 'SO'), 'confirmed', v_quote.currency,
    v_quote.payment_terms, v_quote.delivery_terms,
    coalesce(v_quote.client_reference_number, v_quote.customer_reference), nullif(trim(p_client_po_number), ''),
    v_quote.issuer, v_quote.recipient, coalesce(v_quote.meta, '{}'::jsonb), coalesce(v_quote.tax_summary, '{}'::jsonb),
    v_quote.subtotal, v_quote.vat_amount, v_quote.total, coalesce(v_quote.document_snapshot, '{}'::jsonb), auth.uid()
  )
  returning id into v_sales_order_id;

  insert into crm.sales_order_items (
    sales_order_id, description, quantity, unit_price, currency, vat_rate, is_zero_rated, is_exempt, discount, line_total, sort_order
  )
  select v_sales_order_id, i.description, i.quantity, i.unit_price, i.currency, i.vat_rate, i.is_zero_rated, i.is_exempt, i.discount, i.line_total, i.sort_order
  from crm.quotation_items i
  where i.quotation_id = v_quote.id;

  update crm.quotations set status = 'accepted' where id = v_quote.id;

  if v_quote.enquiry_id is not null then
    update crm.enquiries set status = 'won' where id = v_quote.enquiry_id;
  end if;

  return v_sales_order_id;
end;
$$;

create or replace function crm.convert_quotation_to_sales_order(p_quotation_id uuid, p_client_po_number text default null)
returns uuid
language sql
security definer
set search_path = crm, public
as $$
  select crm.crm_convert_quotation_to_sales_order(p_quotation_id, p_client_po_number);
$$;

create or replace function crm.crm_convert_sales_order_to_invoice(p_sales_order_id uuid)
returns uuid
language plpgsql
security definer
set search_path = crm, public
as $$
declare
  v_order crm.sales_orders%rowtype;
  v_invoice_id uuid;
begin
  select * into v_order from crm.sales_orders where id = p_sales_order_id;

  if v_order.id is null then
    raise exception 'Sales order % not found', p_sales_order_id;
  end if;

  insert into crm.invoices (
    sales_order_id, client_id, contact_id, document_number, status, issue_date, due_date,
    currency, payment_terms, client_po_number,
    issuer, recipient, meta, tax_summary, subtotal, vat_amount, total, balance_due, document_snapshot, created_by
  )
  values (
    v_order.id, v_order.client_id, v_order.contact_id,
    crm.next_document_number('invoice', 'INV'), 'issued', current_date, null,
    v_order.currency, v_order.payment_terms, v_order.client_po_number,
    v_order.issuer, v_order.recipient, coalesce(v_order.meta, '{}'::jsonb), coalesce(v_order.tax_summary, '{}'::jsonb),
    v_order.subtotal, v_order.vat_amount, v_order.total, v_order.total, coalesce(v_order.document_snapshot, '{}'::jsonb), auth.uid()
  )
  returning id into v_invoice_id;

  insert into crm.invoice_items (
    invoice_id, description, quantity, unit_price, currency, vat_rate, is_zero_rated, is_exempt, discount, line_total, sort_order
  )
  select v_invoice_id, i.description, i.quantity, i.unit_price, i.currency, i.vat_rate, i.is_zero_rated, i.is_exempt, i.discount, i.line_total, i.sort_order
  from crm.sales_order_items i
  where i.sales_order_id = v_order.id;

  update crm.sales_orders
  set status = 'fulfilled'
  where id = v_order.id;

  return v_invoice_id;
end;
$$;

grant execute on function crm.crm_convert_quotation_to_sales_order(uuid, text) to authenticated;
grant execute on function crm.convert_quotation_to_sales_order(uuid, text) to authenticated;
