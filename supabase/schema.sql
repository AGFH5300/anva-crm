-- CRM schema for Supabase (PostgreSQL)
-- Enables UAE-compliant commercial document storage across enquiries, quotations,
-- orders, invoices, and related payments.

create schema if not exists crm;

create extension if not exists "pgcrypto";

create or replace function crm.tg_set_timestamp()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

create table if not exists crm.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('client', 'vendor', 'both')),
  contact_email text,
  contact_phone text,
  status text not null default 'prospect' check (status in ('active', 'prospect', 'inactive')),
  trn text, -- UAE VAT Tax Registration Number
  tax_registration_number text,
  billing_address jsonb,
  shipping_address jsonb,
  notes text,
  last_interaction date,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger set_timestamp
before update on crm.clients
for each row execute procedure crm.tg_set_timestamp();

create index if not exists idx_clients_status on crm.clients (status);
create index if not exists idx_clients_type on crm.clients (type);

create table if not exists crm.enquiries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references crm.clients (id) on delete cascade,
  subject text not null,
  description text,
  status text not null default 'new' check (status in ('new', 'in-progress', 'quoted', 'won', 'lost')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  source text,
  owner_id uuid references auth.users (id),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default timezone('utc', now()),
  expected_close_date date,
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger set_timestamp
before update on crm.enquiries
for each row execute procedure crm.tg_set_timestamp();

create index if not exists idx_enquiries_client on crm.enquiries (client_id);
create index if not exists idx_enquiries_status on crm.enquiries (status);

create table if not exists crm.quotations (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid references crm.enquiries (id) on delete set null,
  client_id uuid not null references crm.clients (id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'sent', 'accepted', 'rejected')),
  document_number text not null unique,
  issue_date date not null default current_date,
  valid_until date,
  currency text not null default 'AED',
  payment_terms text,
  delivery_terms text,
  issuer jsonb not null,
  recipient jsonb not null,
  meta jsonb not null,
  tax_summary jsonb not null,
  subtotal numeric(14, 2) not null,
  vat_amount numeric(14, 2) not null,
  corporate_tax_amount numeric(14, 2) default 0,
  total numeric(14, 2) not null,
  document_snapshot jsonb not null,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger set_timestamp
before update on crm.quotations
for each row execute procedure crm.tg_set_timestamp();

create index if not exists idx_quotations_client on crm.quotations (client_id);
create index if not exists idx_quotations_status on crm.quotations (status);

create table if not exists crm.quotation_items (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references crm.quotations (id) on delete cascade,
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

create index if not exists idx_quotation_items_quotation on crm.quotation_items (quotation_id);

create table if not exists crm.orders (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid references crm.quotations (id) on delete set null,
  client_id uuid not null references crm.clients (id) on delete cascade,
  type text not null check (type in ('sales', 'purchase')),
  status text not null default 'draft' check (status in ('draft', 'confirmed', 'fulfilled', 'cancelled')),
  document_number text not null unique,
  issue_date date not null default current_date,
  currency text not null default 'AED',
  payment_terms text,
  delivery_terms text,
  issuer jsonb not null,
  recipient jsonb not null,
  meta jsonb not null,
  tax_summary jsonb not null,
  subtotal numeric(14, 2) not null,
  vat_amount numeric(14, 2) not null,
  corporate_tax_amount numeric(14, 2) default 0,
  total numeric(14, 2) not null,
  document_snapshot jsonb not null,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger set_timestamp
before update on crm.orders
for each row execute procedure crm.tg_set_timestamp();

create index if not exists idx_orders_client on crm.orders (client_id);
create index if not exists idx_orders_status on crm.orders (status);

create table if not exists crm.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references crm.orders (id) on delete cascade,
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

create index if not exists idx_order_items_order on crm.order_items (order_id);

create table if not exists crm.invoices (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references crm.orders (id) on delete set null,
  client_id uuid not null references crm.clients (id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'issued', 'paid', 'overdue')),
  document_number text not null unique,
  issue_date date not null default current_date,
  due_date date,
  currency text not null default 'AED',
  payment_terms text,
  issuer jsonb not null,
  recipient jsonb not null,
  meta jsonb not null,
  tax_summary jsonb not null,
  subtotal numeric(14, 2) not null,
  vat_amount numeric(14, 2) not null,
  corporate_tax_amount numeric(14, 2) default 0,
  total numeric(14, 2) not null,
  balance_due numeric(14, 2) not null default 0,
  document_snapshot jsonb not null,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger set_timestamp
before update on crm.invoices
for each row execute procedure crm.tg_set_timestamp();

create index if not exists idx_invoices_client on crm.invoices (client_id);
create index if not exists idx_invoices_status on crm.invoices (status);

create table if not exists crm.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references crm.invoices (id) on delete cascade,
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

create index if not exists idx_invoice_items_invoice on crm.invoice_items (invoice_id);

create table if not exists crm.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references crm.invoices (id) on delete cascade,
  received_on date not null default current_date,
  method text not null check (method in ('cash', 'bank-transfer', 'card', 'cheque', 'other')),
  amount numeric(14, 2) not null check (amount >= 0),
  reference text,
  notes text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_payments_invoice on crm.payments (invoice_id);

create table if not exists crm.delivery_notes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references crm.orders (id) on delete cascade,
  document_number text not null unique,
  delivery_date date not null default current_date,
  recipient jsonb not null,
  items jsonb not null,
  proof_of_delivery jsonb,
  status text not null default 'draft' check (status in ('draft', 'released', 'delivered')),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger set_timestamp
before update on crm.delivery_notes
for each row execute procedure crm.tg_set_timestamp();

create index if not exists idx_delivery_notes_order on crm.delivery_notes (order_id);

create table if not exists crm.shipments (
  id uuid primary key default gen_random_uuid(),
  delivery_note_id uuid references crm.delivery_notes (id) on delete cascade,
  carrier text,
  tracking_number text,
  status text not null default 'pending' check (status in ('pending', 'in-transit', 'delivered', 'exception')),
  estimated_arrival date,
  actual_arrival date,
  events jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_shipments_delivery_note on crm.shipments (delivery_note_id);

-- Row Level Security policies for Supabase (authenticated users full access)
alter table crm.clients enable row level security;
alter table crm.enquiries enable row level security;
alter table crm.quotations enable row level security;
alter table crm.quotation_items enable row level security;
alter table crm.orders enable row level security;
alter table crm.order_items enable row level security;
alter table crm.invoices enable row level security;
alter table crm.invoice_items enable row level security;
alter table crm.payments enable row level security;
alter table crm.delivery_notes enable row level security;
alter table crm.shipments enable row level security;

create policy "Allow authenticated read clients" on crm.clients
for select using (auth.uid() is not null);

create policy "Allow authenticated modify clients" on crm.clients
for all using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "Allow authenticated read enquiries" on crm.enquiries
for select using (auth.uid() is not null);

create policy "Allow authenticated modify enquiries" on crm.enquiries
for all using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "Allow authenticated read quotations" on crm.quotations
for select using (auth.uid() is not null);

create policy "Allow authenticated modify quotations" on crm.quotations
for all using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "Allow authenticated read quotation items" on crm.quotation_items
for select using (auth.uid() is not null);

create policy "Allow authenticated modify quotation items" on crm.quotation_items
for all using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "Allow authenticated read orders" on crm.orders
for select using (auth.uid() is not null);

create policy "Allow authenticated modify orders" on crm.orders
for all using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "Allow authenticated read order items" on crm.order_items
for select using (auth.uid() is not null);

create policy "Allow authenticated modify order items" on crm.order_items
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

create policy "Allow authenticated read delivery notes" on crm.delivery_notes
for select using (auth.uid() is not null);

create policy "Allow authenticated modify delivery notes" on crm.delivery_notes
for all using (auth.uid() is not null) with check (auth.uid() is not null);

create policy "Allow authenticated read shipments" on crm.shipments
for select using (auth.uid() is not null);

create policy "Allow authenticated modify shipments" on crm.shipments
for all using (auth.uid() is not null) with check (auth.uid() is not null);
