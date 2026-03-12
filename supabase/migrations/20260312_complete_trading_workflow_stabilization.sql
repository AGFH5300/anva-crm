-- Complete and stabilize ANVA trading CRM workflow
-- - canonical numbering for ENQ/QUO/SO/SPO/INV
-- - ensure supplier master table exists
-- - keep supplier PO flow operational against purchase_orders

create table if not exists crm.suppliers (
  id uuid primary key default gen_random_uuid(),
  supplier_code text,
  company_name text not null,
  contact_person text,
  email text,
  phone text,
  mobile text,
  website text,
  address_line_1 text,
  address_line_2 text,
  city text,
  state text,
  country text,
  postal_code text,
  tax_registration_no text,
  payment_terms text,
  currency text not null default 'AED',
  vendor_type text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists idx_suppliers_company_name_ci on crm.suppliers (lower(company_name));
create index if not exists idx_suppliers_email_ci on crm.suppliers (lower(email));

drop trigger if exists set_timestamp on crm.suppliers;
create trigger set_timestamp before update on crm.suppliers
for each row execute procedure crm.tg_set_timestamp();

alter table if exists crm.suppliers enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'crm'
      and tablename = 'suppliers'
      and policyname = 'Allow authenticated read suppliers'
  ) then
    create policy "Allow authenticated read suppliers" on crm.suppliers
    for select using (auth.uid() is not null);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'crm'
      and tablename = 'suppliers'
      and policyname = 'Allow authenticated modify suppliers'
  ) then
    create policy "Allow authenticated modify suppliers" on crm.suppliers
    for all using (auth.uid() is not null) with check (auth.uid() is not null);
  end if;
end $$;

insert into crm.document_sequences (code, prefix, last_value)
values
  ('enquiry', 'ENQ', 0),
  ('quotation', 'QUO', 0),
  ('sales_order', 'SO', 0),
  ('supplier_purchase_order', 'SPO', 0),
  ('invoice', 'INV', 0)
on conflict (code) do nothing;

create or replace function crm.tg_set_enquiry_job_number()
returns trigger as $$
begin
  if new.job_number is null or btrim(new.job_number) = '' then
    new.job_number := crm.next_document_number('enquiry', 'ENQ');
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_set_enquiry_job_number on crm.enquiries;
create trigger trg_set_enquiry_job_number before insert on crm.enquiries
for each row execute procedure crm.tg_set_enquiry_job_number();

update crm.enquiries
set job_number = crm.next_document_number('enquiry', 'ENQ')
where job_number is null or btrim(job_number) = '';

update crm.document_sequences ds
set last_value = greatest(ds.last_value, coalesce(max_seed.seed, ds.last_value))
from (
  select 'enquiry'::text as code, coalesce(max((regexp_replace(job_number, '^ENQ-', ''))::bigint), 0) as seed
  from crm.enquiries
  where job_number ~ '^ENQ-[0-9]+$'
  union all
  select 'quotation'::text as code, coalesce(max((regexp_replace(document_number, '^QUO-', ''))::bigint), 0) as seed
  from crm.quotations
  where document_number ~ '^QUO-[0-9]+$'
  union all
  select 'sales_order'::text as code, coalesce(max((regexp_replace(document_number, '^SO-', ''))::bigint), 0) as seed
  from crm.sales_orders
  where document_number ~ '^SO-[0-9]+$'
  union all
  select 'supplier_purchase_order'::text as code, coalesce(max((regexp_replace(document_number, '^SPO-', ''))::bigint), 0) as seed
  from crm.purchase_orders
  where document_number ~ '^SPO-[0-9]+$'
  union all
  select 'invoice'::text as code, coalesce(max((regexp_replace(document_number, '^INV-', ''))::bigint), 0) as seed
  from crm.invoices
  where document_number ~ '^INV-[0-9]+$'
) as max_seed
where ds.code = max_seed.code;
