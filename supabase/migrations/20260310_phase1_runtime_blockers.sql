-- Phase 1 runtime blocker fixes: missing columns, sales user source, and conversion RPCs.

create table if not exists crm.job_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text unique,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_timestamp'
      and tgrelid = 'crm.job_types'::regclass
  ) then
    create trigger set_timestamp before update on crm.job_types
    for each row execute procedure crm.tg_set_timestamp();
  end if;
end
$$;

insert into crm.job_types (name, code, sort_order)
values
  ('Marine Spares', 'MARINE_SPARES', 10),
  ('Hydraulic', 'HYDRAULIC', 20),
  ('Electrical', 'ELECTRICAL', 30),
  ('Navigation', 'NAVIGATION', 40),
  ('Automation', 'AUTOMATION', 50),
  ('Service / Repair', 'SERVICE_REPAIR', 60),
  ('Drydock Supply', 'DRYDOCK_SUPPLY', 70),
  ('Projects', 'PROJECTS', 80)
on conflict (name) do nothing;

alter table crm.enquiries
  add column if not exists job_type_id uuid references crm.job_types (id),
  add column if not exists sales_pic_user_id uuid references auth.users (id),
  add column if not exists job_number text,
  add column if not exists enquiry_date date default current_date;

alter table crm.quotations
  add column if not exists job_number text;

create index if not exists idx_enquiries_job_type on crm.enquiries (job_type_id);
create index if not exists idx_enquiries_sales_pic_user on crm.enquiries (sales_pic_user_id);
create index if not exists idx_enquiries_job_number on crm.enquiries (job_number);
create index if not exists idx_quotations_job_number on crm.quotations (job_number);

update crm.enquiries
set enquiry_date = coalesce(enquiry_date, created_at::date)
where enquiry_date is null;

update crm.enquiries
set job_number = coalesce(job_number, 'ENQ-' || upper(substr(replace(id::text, '-', ''), 1, 8)))
where job_number is null;

update crm.quotations q
set job_number = e.job_number
from crm.enquiries e
where q.enquiry_id = e.id
  and q.job_number is null;

create or replace function crm.list_active_sales_users()
returns table (
  id uuid,
  display_name text,
  email text
)
language sql
security definer
set search_path = crm, auth, public
as $$
  select
    u.id,
    coalesce(
      nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
      nullif(trim(split_part(u.email, '@', 1)), ''),
      u.email
    ) as display_name,
    u.email
  from auth.users u
  where u.deleted_at is null
  order by display_name;
$$;

grant execute on function crm.list_active_sales_users() to authenticated;

create or replace function crm.next_document_number(p_code text, p_prefix text)
returns text
language plpgsql
security definer
set search_path = crm, public
as $$
declare
  v_next bigint;
begin
  insert into crm.document_sequences (code, prefix, last_value)
  values (p_code, p_prefix, 0)
  on conflict (code) do nothing;

  update crm.document_sequences
  set last_value = last_value + step
  where code = p_code
  returning last_value into v_next;

  return p_prefix || '-' || lpad(v_next::text, 5, '0');
end;
$$;

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
    enquiry_id,
    job_number,
    client_id,
    contact_id,
    document_number,
    status,
    currency,
    payment_terms,
    delivery_terms,
    issuer,
    recipient,
    meta,
    tax_summary,
    subtotal,
    vat_amount,
    total,
    document_snapshot,
    created_by
  )
  values (
    v_enquiry.id,
    v_enquiry.job_number,
    v_enquiry.client_id,
    v_enquiry.contact_id,
    crm.next_document_number('quotation', 'QUO'),
    'draft',
    'AED',
    null,
    null,
    '{}'::jsonb,
    '{}'::jsonb,
    '{}'::jsonb,
    '{}'::jsonb,
    0,
    0,
    0,
    '{}'::jsonb,
    auth.uid()
  )
  returning id into v_quotation_id;

  insert into crm.quotation_items (
    quotation_id,
    description,
    quantity,
    unit_price,
    currency,
    vat_rate,
    is_zero_rated,
    is_exempt,
    line_total,
    sort_order
  )
  select
    v_quotation_id,
    i.description,
    i.quantity,
    i.unit_price,
    i.currency,
    i.vat_rate,
    i.is_zero_rated,
    i.is_exempt,
    i.line_total,
    i.sort_order
  from crm.enquiry_items i
  where i.enquiry_id = v_enquiry.id;

  update crm.enquiries
  set status = 'proposal'
  where id = v_enquiry.id
    and status in ('new', 'qualified', 'negotiation');

  return v_quotation_id;
end;
$$;

create or replace function crm.crm_convert_quotation_to_sales_order(p_quotation_id uuid)
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
    quotation_id,
    client_id,
    contact_id,
    document_number,
    status,
    currency,
    payment_terms,
    delivery_terms,
    issuer,
    recipient,
    meta,
    tax_summary,
    subtotal,
    vat_amount,
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
    v_quote.issuer,
    v_quote.recipient,
    coalesce(v_quote.meta, '{}'::jsonb),
    coalesce(v_quote.tax_summary, '{}'::jsonb),
    v_quote.subtotal,
    v_quote.vat_amount,
    v_quote.total,
    coalesce(v_quote.document_snapshot, '{}'::jsonb),
    auth.uid()
  )
  returning id into v_sales_order_id;

  insert into crm.sales_order_items (
    sales_order_id,
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
    v_sales_order_id,
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
  from crm.quotation_items i
  where i.quotation_id = v_quote.id;

  update crm.quotations
  set status = 'accepted'
  where id = v_quote.id;

  if v_quote.enquiry_id is not null then
    update crm.enquiries
    set status = 'won'
    where id = v_quote.enquiry_id;
  end if;

  return v_sales_order_id;
end;
$$;

create or replace function crm.convert_quotation_to_sales_order(p_quotation_id uuid)
returns uuid
language sql
security definer
set search_path = crm, public
as $$
  select crm.crm_convert_quotation_to_sales_order(p_quotation_id);
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
    sales_order_id,
    client_id,
    contact_id,
    document_number,
    status,
    issue_date,
    due_date,
    currency,
    payment_terms,
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

create or replace function crm.convert_sales_order_to_invoice(p_sales_order_id uuid)
returns uuid
language sql
security definer
set search_path = crm, public
as $$
  select crm.crm_convert_sales_order_to_invoice(p_sales_order_id);
$$;

grant execute on function crm.next_document_number(text, text) to authenticated;
grant execute on function crm.crm_convert_enquiry_to_quotation_draft(uuid) to authenticated;
grant execute on function crm.crm_convert_quotation_to_sales_order(uuid) to authenticated;
grant execute on function crm.convert_quotation_to_sales_order(uuid) to authenticated;
grant execute on function crm.crm_convert_sales_order_to_invoice(uuid) to authenticated;
grant execute on function crm.convert_sales_order_to_invoice(uuid) to authenticated;
