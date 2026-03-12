-- Stabilize canonical CRM data flow fields and SO->Invoice carry-forward behavior.

alter table crm.invoices
  add column if not exists client_po_number text;

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
    sales_order_id,
    client_id,
    contact_id,
    document_number,
    status,
    issue_date,
    due_date,
    currency,
    payment_terms,
    client_po_number,
    issuer,
    recipient,
    meta,
    tax_summary,
    subtotal,
    vat_amount,
    total,
    balance_due,
    document_snapshot,
    created_by
  )
  values (
    v_order.id,
    v_order.client_id,
    v_order.contact_id,
    crm.next_document_number('invoice', 'INV'),
    'issued',
    current_date,
    null,
    v_order.currency,
    v_order.payment_terms,
    v_order.client_po_number,
    v_order.issuer,
    v_order.recipient,
    coalesce(v_order.meta, '{}'::jsonb),
    coalesce(v_order.tax_summary, '{}'::jsonb),
    v_order.subtotal,
    v_order.vat_amount,
    v_order.total,
    v_order.total,
    coalesce(v_order.document_snapshot, '{}'::jsonb),
    auth.uid()
  )
  returning id into v_invoice_id;

  insert into crm.invoice_items (
    invoice_id,
    description,
    quantity,
    unit_price,
    currency,
    vat_rate,
    is_zero_rated,
    is_exempt,
    discount,
    line_total,
    sort_order
  )
  select
    v_invoice_id,
    i.description,
    i.quantity,
    i.unit_price,
    i.currency,
    i.vat_rate,
    i.is_zero_rated,
    i.is_exempt,
    i.discount,
    i.line_total,
    i.sort_order
  from crm.sales_order_items i
  where i.sales_order_id = v_order.id;

  update crm.sales_orders
  set status = 'fulfilled'
  where id = v_order.id;

  return v_invoice_id;
end;
$$;

grant execute on function crm.crm_convert_sales_order_to_invoice(uuid) to authenticated;
