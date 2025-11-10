-- CRM schema for Supabase (PostgreSQL)
-- Provides UAE-compliant commercial document storage across enquiries,
-- quotations, orders, invoicing, logistics, and supporting master data.

create schema if not exists crm;

create extension if not exists "pgcrypto";

create or replace function crm.tg_set_timestamp()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

create table if not exists crm.document_sequences (
  code text primary key,
  prefix text not null,
  last_value bigint not null default 0,
  step integer not null default 1,
  last_reset_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger set_timestamp before update on crm.document_sequences
for each row execute procedure crm.tg_set_timestamp();

create table if not exists crm.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  account_code text unique,
  type text not null default 'client' check (type in ('client', 'vendor', 'both')),
  status text not null default 'prospect' check (status in ('active', 'prospect', 'inactive')),
  industry text,
  website text,
  contact_email text,
  contact_phone text,
  contact_mobile text,
  owner_id uuid references auth.users (id),
  trn text, -- UAE VAT Tax Registration Number
  tax_registration_number text,
  corporate_tax_profile jsonb not null default '{}'::jsonb,
  billing_address jsonb,
  shipping_address jsonb,
  payment_terms text,
  notes text,
  last_interaction date,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger set_timestamp before update on crm.clients
for each row execute procedure crm.tg_set_timestamp();

create index if not exists idx_clients_type on crm.clients (type);
create index if not exists idx_clients_status on crm.clients (status);
create index if not exists idx_clients_owner on crm.clients (owner_id);

create table if not exists crm.contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references crm.clients (id) on delete cascade,
  salutation text,
  first_name text not null,
  last_name text,
  email text,
  phone text,
  mobile text,
  position text,
  department text,
  is_primary boolean not null default false,
  notes text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger set_timestamp before update on crm.contacts
for each row execute procedure crm.tg_set_timestamp();

create index if not exists idx_contacts_client on crm.contacts (client_id);
create index if not exists idx_contacts_email on crm.contacts (lower(email));

create table if not exists crm.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists crm.client_tags (
  client_id uuid not null references crm.clients (id) on delete cascade,
  tag_id uuid not null references crm.tags (id) on delete cascade,
  tagged_at timestamptz not null default timezone('utc', now()),
  primary key (client_id, tag_id)
);

create table if not exists crm.product_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists crm.products (
  id uuid primary key default gen_random_uuid(),
  sku text unique,
  name text not null,
  description text,
  category_id uuid references crm.product_categories (id) on delete set null,
  unit text not null default 'each',
  currency text not null default 'AED',
  unit_price numeric(14, 2) not null default 0,
  cost_price numeric(14, 2),
  vat_rate numeric(5, 2) not null default 5.00,
  is_zero_rated boolean not null default false,
  is_exempt boolean not null default false,
  is_service boolean not null default false,
  lead_time_days integer,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger set_timestamp before update on crm.products
for each row execute procedure crm.tg_set_timestamp();

create index if not exists idx_products_category on crm.products (category_id);
create index if not exists idx_products_name on crm.products using gin (to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(description, '')));

create table if not exists crm.enquiries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references crm.clients (id) on delete cascade,
  contact_id uuid references crm.contacts (id) on delete set null,
  subject text not null,
  description text,
  status text not null default 'new' check (status in ('new', 'qualified', 'proposal', 'negotiation', 'won', 'lost')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  source text,
  pipeline_stage text,
  expected_value numeric(14, 2),
  probability numeric(5, 2) check (probability between 0 and 100),
  expected_close_date date,
  actual_close_date date,
  loss_reason text,
  owner_id uuid references auth.users (id),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger set_timestamp before update on crm.enquiries
for each row execute procedure crm.tg_set_timestamp();

create index if not exists idx_enquiries_client on crm.enquiries (client_id);
create index if not exists idx_enquiries_status on crm.enquiries (status);
create index if not exists idx_enquiries_owner on crm.enquiries (owner_id);

create table if not exists crm.enquiry_items (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references crm.enquiries (id) on delete cascade,
  product_id uuid references crm.products (id) on delete set null,
  description text not null,
  quantity numeric(14, 3) not null check (quantity >= 0),
  unit_price numeric(14, 2) not null check (unit_price >= 0),
  currency text not null default 'AED',
  vat_rate numeric(5, 2) not null default 5.00,
  is_zero_rated boolean not null default false,
  is_exempt boolean not null default false,
  line_total numeric(14, 2) not null,
  sort_order integer not null default 1,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_enquiry_items_enquiry on crm.enquiry_items (enquiry_id);

create table if not exists crm.interactions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references crm.clients (id) on delete cascade,
  contact_id uuid references crm.contacts (id) on delete set null,
  enquiry_id uuid,
  interaction_type text not null check (interaction_type in ('call', 'meeting', 'email', 'note', 'task', 'other')),
  occurred_at timestamptz not null default timezone('utc', now()),
  subject text,
  summary text,
  next_steps text,
  follow_up_on date,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger set_timestamp before update on crm.interactions
for each row execute procedure crm.tg_set_timestamp();

create index if not exists idx_interactions_client on crm.interactions (client_id);
create index if not exists idx_interactions_contact on crm.interactions (contact_id);
create index if not exists idx_interactions_enquiry on crm.interactions (enquiry_id);

create table if not exists crm.quotations (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid references crm.enquiries (id) on delete set null,
  client_id uuid not null references crm.clients (id) on delete cascade,
  contact_id uuid references crm.contacts (id) on delete set null,
  document_number text not null unique,
  revision integer not null default 1,
  status text not null default 'draft' check (status in ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  issue_date date not null default current_date,
  valid_until date,
  currency text not null default 'AED',
  payment_terms text,
  delivery_terms text,
  issuer jsonb not null,
  recipient jsonb not null,
  meta jsonb not null default '{}'::jsonb,
  tax_summary jsonb not null,
  subtotal numeric(14, 2) not null,
  vat_amount numeric(14, 2) not null,
  corporate_tax_amount numeric(14, 2) not null default 0,
  discount_total numeric(14, 2) not null default 0,
  total numeric(14, 2) not null,
  document_snapshot jsonb not null,
  approved_at timestamptz,
  approved_by uuid references auth.users (id),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger set_timestamp before update on crm.quotations
for each row execute procedure crm.tg_set_timestamp();

create index if not exists idx_quotations_client on crm.quotations (client_id);
create index if not exists idx_quotations_status on crm.quotations (status);
create index if not exists idx_quotations_enquiry on crm.quotations (enquiry_id);

create table if not exists crm.quotation_items (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references crm.quotations (id) on delete cascade,
  product_id uuid references crm.products (id) on delete set null,
  description text not null,
  quantity numeric(14, 3) not null check (quantity >= 0),
  unit_price numeric(14, 2) not null check (unit_price >= 0),
  currency text not null default 'AED',
  vat_rate numeric(5, 2) not null default 5.00,
  is_zero_rated boolean not null default false,
  is_exempt boolean not null default false,
  discount numeric(14, 2) not null default 0,
  line_total numeric(14, 2) not null,
  sort_order integer not null default 1
);

create index if not exists idx_quotation_items_quotation on crm.quotation_items (quotation_id);

create table if not exists crm.sales_orders (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid references crm.quotations (id) on delete set null,
  client_id uuid not null references crm.clients (id) on delete cascade,
  contact_id uuid references crm.contacts (id) on delete set null,
  document_number text not null unique,
  status text not null default 'draft' check (status in ('draft', 'confirmed', 'in-progress', 'fulfilled', 'cancelled')),
  issue_date date not null default current_date,
  currency text not null default 'AED',
  payment_terms text,
  delivery_terms text,
  issuer jsonb not null,
  recipient jsonb not null,
  meta jsonb not null default '{}'::jsonb,
  tax_summary jsonb not null,
  subtotal numeric(14, 2) not null,
  vat_amount numeric(14, 2) not null,
  corporate_tax_amount numeric(14, 2) not null default 0,
  discount_total numeric(14, 2) not null default 0,
  total numeric(14, 2) not null,
  document_snapshot jsonb not null,
  fulfillment_status text not null default 'pending',
  created_by uuid references auth.users (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger set_timestamp before update on crm.sales_orders
for each row execute procedure crm.tg_set_timestamp();

create index if not exists idx_sales_orders_client on crm.sales_orders (client_id);
create index if not exists idx_sales_orders_status on crm.sales_orders (status);

create table if not exists crm.sales_order_items (
  id uuid primary key default gen_random_uuid(),
  sales_order_id uuid not null references crm.sales_orders (id) on delete cascade,
  product_id uuid references crm.products (id) on delete set null,
  description text not null,
  quantity numeric(14, 3) not null check (quantity >= 0),
  unit_price numeric(14, 2) not null check (unit_price >= 0),
  currency text not null default 'AED',
  vat_rate numeric(5, 2) not null default 5.00,
  is_zero_rated boolean not null default false,
  is_exempt boolean not null default false,
  discount numeric(14, 2) not null default 0,
  line_total numeric(14, 2) not null,
  sort_order integer not null default 1
);

create index if not exists idx_sales_order_items_order on crm.sales_order_items (sales_order_id);

create table if not exists crm.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  related_sales_order_id uuid references crm.sales_orders (id) on delete set null,
  supplier_id uuid not null references crm.clients (id) on delete cascade,
  document_number text not null unique,
  status text not null default 'draft' check (status in ('draft', 'issued', 'received', 'closed', 'cancelled')),
  issue_date date not null default current_date,
  expected_delivery date,
  currency text not null default 'AED',
  payment_terms text,
  issuer jsonb not null,
  supplier jsonb not null,
  meta jsonb not null default '{}'::jsonb,
  tax_summary jsonb not null,
  subtotal numeric(14, 2) not null,
  vat_amount numeric(14, 2) not null,
  total numeric(14, 2) not null,
  document_snapshot jsonb not null,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger set_timestamp before update on crm.purchase_orders
for each row execute procedure crm.tg_set_timestamp();

create index if not exists idx_purchase_orders_supplier on crm.purchase_orders (supplier_id);
create index if not exists idx_purchase_orders_status on crm.purchase_orders (status);

create table if not exists crm.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references crm.purchase_orders (id) on delete cascade,
  product_id uuid references crm.products (id) on delete set null,
  description text not null,
  quantity numeric(14, 3) not null check (quantity >= 0),
  unit_price numeric(14, 2) not null check (unit_price >= 0),
  currency text not null default 'AED',
  vat_rate numeric(5, 2) not null default 5.00,
  is_zero_rated boolean not null default false,
  is_exempt boolean not null default false,
  line_total numeric(14, 2) not null,
  sort_order integer not null default 1
);

create index if not exists idx_purchase_order_items_order on crm.purchase_order_items (purchase_order_id);

create table if not exists crm.invoices (
  id uuid primary key default gen_random_uuid(),
  sales_order_id uuid references crm.sales_orders (id) on delete set null,
  client_id uuid not null references crm.clients (id) on delete cascade,
  contact_id uuid references crm.contacts (id) on delete set null,
  document_number text not null unique,
  status text not null default 'draft' check (status in ('draft', 'issued', 'paid', 'overdue', 'cancelled')),
  issue_date date not null default current_date,
  due_date date,
  currency text not null default 'AED',
  payment_terms text,
  issuer jsonb not null,
  recipient jsonb not null,
  meta jsonb not null default '{}'::jsonb,
  tax_summary jsonb not null,
  subtotal numeric(14, 2) not null,
  vat_amount numeric(14, 2) not null,
  corporate_tax_amount numeric(14, 2) not null default 0,
  discount_total numeric(14, 2) not null default 0,
  total numeric(14, 2) not null,
  balance_due numeric(14, 2) not null default 0,
  document_snapshot jsonb not null,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger set_timestamp before update on crm.invoices
for each row execute procedure crm.tg_set_timestamp();

create index if not exists idx_invoices_client on crm.invoices (client_id);
create index if not exists idx_invoices_status on crm.invoices (status);
create index if not exists idx_invoices_sales_order on crm.invoices (sales_order_id);

create table if not exists crm.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references crm.invoices (id) on delete cascade,
  product_id uuid references crm.products (id) on delete set null,
  description text not null,
  quantity numeric(14, 3) not null check (quantity >= 0),
  unit_price numeric(14, 2) not null check (unit_price >= 0),
  currency text not null default 'AED',
  vat_rate numeric(5, 2) not null default 5.00,
  is_zero_rated boolean not null default false,
  is_exempt boolean not null default false,
  discount numeric(14, 2) not null default 0,
  line_total numeric(14, 2) not null,
  sort_order integer not null default 1
);

create index if not exists idx_invoice_items_invoice on crm.invoice_items (invoice_id);

create table if not exists crm.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references crm.invoices (id) on delete cascade,
  received_on date not null default current_date,
  method text not null check (method in ('cash', 'bank-transfer', 'card', 'cheque', 'other')),
  reference text,
  amount numeric(14, 2) not null check (amount >= 0),
  notes text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_payments_invoice on crm.payments (invoice_id);

create table if not exists crm.credit_notes (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references crm.invoices (id) on delete set null,
  client_id uuid not null references crm.clients (id) on delete cascade,
  document_number text not null unique,
  status text not null default 'draft' check (status in ('draft', 'issued', 'applied', 'cancelled')),
  issue_date date not null default current_date,
  currency text not null default 'AED',
  issuer jsonb not null,
  recipient jsonb not null,
  meta jsonb not null default '{}'::jsonb,
  tax_summary jsonb not null,
  subtotal numeric(14, 2) not null,
  vat_amount numeric(14, 2) not null,
  total numeric(14, 2) not null,
  document_snapshot jsonb not null,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger set_timestamp before update on crm.credit_notes
for each row execute procedure crm.tg_set_timestamp();

create index if not exists idx_credit_notes_client on crm.credit_notes (client_id);

create table if not exists crm.credit_note_items (
  id uuid primary key default gen_random_uuid(),
  credit_note_id uuid not null references crm.credit_notes (id) on delete cascade,
  product_id uuid references crm.products (id) on delete set null,
  description text not null,
  quantity numeric(14, 3) not null check (quantity >= 0),
  unit_price numeric(14, 2) not null check (unit_price >= 0),
  currency text not null default 'AED',
  vat_rate numeric(5, 2) not null default 5.00,
  is_zero_rated boolean not null default false,
  is_exempt boolean not null default false,
  line_total numeric(14, 2) not null,
  sort_order integer not null default 1
);

create index if not exists idx_credit_note_items_note on crm.credit_note_items (credit_note_id);

create table if not exists crm.delivery_notes (
  id uuid primary key default gen_random_uuid(),
  sales_order_id uuid references crm.sales_orders (id) on delete cascade,
  document_number text not null unique,
  delivery_date date not null default current_date,
  recipient jsonb not null,
  items jsonb,
  status text not null default 'draft' check (status in ('draft', 'ready', 'released', 'delivered')),
  proof_of_delivery jsonb,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger set_timestamp before update on crm.delivery_notes
for each row execute procedure crm.tg_set_timestamp();

create index if not exists idx_delivery_notes_order on crm.delivery_notes (sales_order_id);

create table if not exists crm.delivery_note_items (
  id uuid primary key default gen_random_uuid(),
  delivery_note_id uuid not null references crm.delivery_notes (id) on delete cascade,
  product_id uuid references crm.products (id) on delete set null,
  description text not null,
  quantity numeric(14, 3) not null check (quantity >= 0),
  unit text not null default 'each',
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_delivery_note_items_note on crm.delivery_note_items (delivery_note_id);

create table if not exists crm.shipments (
  id uuid primary key default gen_random_uuid(),
  delivery_note_id uuid references crm.delivery_notes (id) on delete cascade,
  carrier text,
  tracking_number text,
  status text not null default 'pending' check (status in ('pending', 'in-transit', 'delivered', 'exception')),
  shipped_at timestamptz,
  estimated_arrival timestamptz,
  actual_arrival timestamptz,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_shipments_delivery_note on crm.shipments (delivery_note_id);
create index if not exists idx_shipments_tracking on crm.shipments (tracking_number);

create table if not exists crm.shipment_events (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references crm.shipments (id) on delete cascade,
  status text not null,
  description text,
  event_at timestamptz not null default timezone('utc', now()),
  location text,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists idx_shipment_events_shipment on crm.shipment_events (shipment_id);

create table if not exists crm.attachments (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  file_name text not null,
  file_type text,
  file_size integer,
  storage_path text not null,
  uploaded_by uuid references auth.users (id),
  uploaded_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_attachments_entity on crm.attachments (entity_type, entity_id);

create table if not exists crm.workflow_events (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  from_status text,
  to_status text not null,
  description text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_workflow_events_entity on crm.workflow_events (entity_type, entity_id);

create table if not exists crm.tasks (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  description text,
  related_entity_type text,
  related_entity_id uuid,
  due_date date,
  status text not null default 'open' check (status in ('open', 'in-progress', 'completed', 'cancelled')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger set_timestamp before update on crm.tasks
for each row execute procedure crm.tg_set_timestamp();

create index if not exists idx_tasks_status on crm.tasks (status);
create index if not exists idx_tasks_due_date on crm.tasks (due_date);

create table if not exists crm.task_assignments (
  task_id uuid not null references crm.tasks (id) on delete cascade,
  user_id uuid not null references auth.users (id),
  assigned_at timestamptz not null default timezone('utc', now()),
  primary key (task_id, user_id)
);

create table if not exists crm.analytics_daily_pipeline (
  day date primary key,
  new_enquiries integer not null default 0,
  quotations_sent integer not null default 0,
  orders_confirmed integer not null default 0,
  invoices_issued integer not null default 0,
  revenue_total numeric(14, 2) not null default 0,
  receivables_outstanding numeric(14, 2) not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

-- enforce referential integrity on interactions now that enquiries exists
do $$
begin
  if not exists (select 1 from pg_constraint
                where conname = 'interactions_enquiry_fk'
                  and conrelid = 'crm.interactions'::regclass) then
    alter table crm.interactions
      add constraint interactions_enquiry_fk foreign key (enquiry_id)
      references crm.enquiries (id) on delete set null;
  end if;
end;
$$;

-- Row Level Security policies for Supabase (authenticated users full access)
alter table crm.document_sequences enable row level security;
alter table crm.clients enable row level security;
alter table crm.contacts enable row level security;
alter table crm.tags enable row level security;
alter table crm.client_tags enable row level security;
alter table crm.interactions enable row level security;
alter table crm.product_categories enable row level security;
alter table crm.products enable row level security;
alter table crm.enquiries enable row level security;
alter table crm.enquiry_items enable row level security;
alter table crm.quotations enable row level security;
alter table crm.quotation_items enable row level security;
alter table crm.sales_orders enable row level security;
alter table crm.sales_order_items enable row level security;
alter table crm.purchase_orders enable row level security;
alter table crm.purchase_order_items enable row level security;
alter table crm.invoices enable row level security;
alter table crm.invoice_items enable row level security;
alter table crm.payments enable row level security;
alter table crm.credit_notes enable row level security;
alter table crm.credit_note_items enable row level security;
alter table crm.delivery_notes enable row level security;
alter table crm.delivery_note_items enable row level security;
alter table crm.shipments enable row level security;
alter table crm.shipment_events enable row level security;
alter table crm.attachments enable row level security;
alter table crm.workflow_events enable row level security;
alter table crm.tasks enable row level security;
alter table crm.task_assignments enable row level security;
alter table crm.analytics_daily_pipeline enable row level security;

create policy "Allow authenticated read document_sequences" on crm.document_sequences
for select using (auth.uid() is not null);

create policy "Allow authenticated modify document_sequences" on crm.document_sequences
for all using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "Allow authenticated read clients" on crm.clients
for select using (auth.uid() is not null);

create policy "Allow authenticated modify clients" on crm.clients
for all using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "Allow authenticated read contacts" on crm.contacts
for select using (auth.uid() is not null);

create policy "Allow authenticated modify contacts" on crm.contacts
for all using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "Allow authenticated read tags" on crm.tags
for select using (auth.uid() is not null);

create policy "Allow authenticated modify tags" on crm.tags
for all using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "Allow authenticated read client tags" on crm.client_tags
for select using (auth.uid() is not null);

create policy "Allow authenticated modify client tags" on crm.client_tags
for all using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "Allow authenticated read interactions" on crm.interactions
for select using (auth.uid() is not null);

create policy "Allow authenticated modify interactions" on crm.interactions
for all using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "Allow authenticated read product categories" on crm.product_categories
for select using (auth.uid() is not null);

create policy "Allow authenticated modify product categories" on crm.product_categories
for all using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "Allow authenticated read products" on crm.products
for select using (auth.uid() is not null);

create policy "Allow authenticated modify products" on crm.products
for all using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "Allow authenticated read enquiries" on crm.enquiries
for select using (auth.uid() is not null);

create policy "Allow authenticated modify enquiries" on crm.enquiries
for all using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "Allow authenticated read enquiry items" on crm.enquiry_items
for select using (auth.uid() is not null);

create policy "Allow authenticated modify enquiry items" on crm.enquiry_items
for all using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "Allow authenticated read quotations" on crm.quotations
for select using (auth.uid() is not null);

create policy "Allow authenticated modify quotations" on crm.quotations
for all using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "Allow authenticated read quotation items" on crm.quotation_items
for select using (auth.uid() is not null);

create policy "Allow authenticated modify quotation items" on crm.quotation_items
for all using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "Allow authenticated read sales orders" on crm.sales_orders
for select using (auth.uid() is not null);

create policy "Allow authenticated modify sales orders" on crm.sales_orders
for all using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "Allow authenticated read sales order items" on crm.sales_order_items
for select using (auth.uid() is not null);

create policy "Allow authenticated modify sales order items" on crm.sales_order_items
for all using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "Allow authenticated read purchase orders" on crm.purchase_orders
for select using (auth.uid() is not null);

create policy "Allow authenticated modify purchase orders" on crm.purchase_orders
for all using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "Allow authenticated read purchase order items" on crm.purchase_order_items
for select using (auth.uid() is not null);

create policy "Allow authenticated modify purchase order items" on crm.purchase_order_items
for all using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "Allow authenticated read invoices" on crm.invoices
for select using (auth.uid() is not null);

create policy "Allow authenticated modify invoices" on crm.invoices
for all using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "Allow authenticated read invoice items" on crm.invoice_items
for select using (auth.uid() is not null);

create policy "Allow authenticated modify invoice items" on crm.invoice_items
for all using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "Allow authenticated read payments" on crm.payments
for select using (auth.uid() is not null);

create policy "Allow authenticated modify payments" on crm.payments
for all using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "Allow authenticated read credit notes" on crm.credit_notes
for select using (auth.uid() is not null);

create policy "Allow authenticated modify credit notes" on crm.credit_notes
for all using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "Allow authenticated read credit note items" on crm.credit_note_items
for select using (auth.uid() is not null);

create policy "Allow authenticated modify credit note items" on crm.credit_note_items
for all using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "Allow authenticated read delivery notes" on crm.delivery_notes
for select using (auth.uid() is not null);

create policy "Allow authenticated modify delivery notes" on crm.delivery_notes
for all using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "Allow authenticated read delivery note items" on crm.delivery_note_items
for select using (auth.uid() is not null);

create policy "Allow authenticated modify delivery note items" on crm.delivery_note_items
for all using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "Allow authenticated read shipments" on crm.shipments
for select using (auth.uid() is not null);

create policy "Allow authenticated modify shipments" on crm.shipments
for all using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "Allow authenticated read shipment events" on crm.shipment_events
for select using (auth.uid() is not null);

create policy "Allow authenticated modify shipment events" on crm.shipment_events
for all using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "Allow authenticated read attachments" on crm.attachments
for select using (auth.uid() is not null);

create policy "Allow authenticated modify attachments" on crm.attachments
for all using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "Allow authenticated read workflow events" on crm.workflow_events
for select using (auth.uid() is not null);

create policy "Allow authenticated modify workflow events" on crm.workflow_events
for all using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "Allow authenticated read tasks" on crm.tasks
for select using (auth.uid() is not null);

create policy "Allow authenticated modify tasks" on crm.tasks
for all using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "Allow authenticated read task assignments" on crm.task_assignments
for select using (auth.uid() is not null);

create policy "Allow authenticated modify task assignments" on crm.task_assignments
for all using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "Allow authenticated read analytics" on crm.analytics_daily_pipeline
for select using (auth.uid() is not null);

create policy "Allow authenticated modify analytics" on crm.analytics_daily_pipeline
for all using (auth.uid() is not null) with check (auth.uid() is not null);