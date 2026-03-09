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

create table if not exists crm.enquiry_suppliers (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references crm.enquiries(id) on delete cascade,
  supplier_id uuid not null references crm.suppliers(id) on delete cascade,
  supplier_name_snapshot text not null,
  contact_person_snapshot text,
  email_snapshot text,
  phone_snapshot text,
  status text not null default 'draft' check (status in ('draft', 'generated', 'sent', 'quote_received', 'regretted', 'closed')),
  sent_at timestamptz,
  quoted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  unique (enquiry_id, supplier_id)
);

create index if not exists idx_enquiry_suppliers_enquiry on crm.enquiry_suppliers(enquiry_id);
create index if not exists idx_enquiry_suppliers_supplier on crm.enquiry_suppliers(supplier_id);

create table if not exists crm.supplier_rfq_documents (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references crm.enquiries(id) on delete cascade,
  supplier_id uuid not null references crm.suppliers(id) on delete cascade,
  document_type text not null default 'supplier_rfq_pdf',
  document_number text not null,
  include_serial_number boolean not null default false,
  selected_line_ids uuid[] not null default '{}',
  file_path text not null,
  generated_by uuid references auth.users(id),
  generated_at timestamptz not null default timezone('utc', now()),
  notes text
);

create unique index if not exists idx_supplier_rfq_documents_doc_no on crm.supplier_rfq_documents(document_number);
create index if not exists idx_supplier_rfq_documents_enquiry on crm.supplier_rfq_documents(enquiry_id);

alter table crm.enquiry_items
  add column if not exists unit text,
  add column if not exists drawing_reference text,
  add column if not exists supplier_remarks text,
  add column if not exists supplier_description_override text,
  add column if not exists is_hidden_from_supplier_pdf boolean not null default false;

insert into storage.buckets (id, name, public)
select 'crm-documents', 'crm-documents', false
where not exists (select 1 from storage.buckets where id = 'crm-documents');
