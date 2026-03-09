create table if not exists crm.company_profile (
  id uuid primary key default gen_random_uuid(),
  company_name text not null default 'ANVA Marine & Industrial Supplies',
  company_trn text,
  default_payment_terms text,
  default_delivery_terms text,
  default_validity text,
  default_terms_and_conditions text,
  default_footer_text text,
  default_letterhead_enabled boolean not null default true,
  default_stamp_enabled boolean not null default true,
  default_signature_enabled boolean not null default false,
  logo_asset_path text not null default '/branding/anva-logo.svg',
  stamp_asset_path text not null default '/branding/anva-stamp.svg',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger set_timestamp before update on crm.company_profile
for each row execute procedure crm.tg_set_timestamp();

alter table crm.quotations
  add column if not exists customer_reference text,
  add column if not exists customer_trn text,
  add column if not exists company_trn text,
  add column if not exists pic_details text,
  add column if not exists additional_notes text,
  add column if not exists letterhead_enabled boolean not null default true,
  add column if not exists stamp_enabled boolean not null default true,
  add column if not exists signature_enabled boolean not null default false;

update crm.quotations
set letterhead_enabled = coalesce(company_letterhead_enabled, true)
where letterhead_enabled is distinct from coalesce(company_letterhead_enabled, true);

alter table crm.sales_orders
  add column if not exists terms_and_conditions text,
  add column if not exists delivery_time text,
  add column if not exists parts_origin text,
  add column if not exists parts_quality text,
  add column if not exists validity text,
  add column if not exists customer_reference text,
  add column if not exists customer_trn text,
  add column if not exists company_trn text,
  add column if not exists pic_details text,
  add column if not exists additional_notes text,
  add column if not exists letterhead_enabled boolean not null default true,
  add column if not exists stamp_enabled boolean not null default true,
  add column if not exists signature_enabled boolean not null default false;

alter table crm.purchase_orders
  add column if not exists terms_and_conditions text,
  add column if not exists delivery_time text,
  add column if not exists parts_origin text,
  add column if not exists parts_quality text,
  add column if not exists validity text,
  add column if not exists customer_reference text,
  add column if not exists customer_trn text,
  add column if not exists company_trn text,
  add column if not exists pic_details text,
  add column if not exists additional_notes text,
  add column if not exists letterhead_enabled boolean not null default true,
  add column if not exists stamp_enabled boolean not null default true,
  add column if not exists signature_enabled boolean not null default false;

alter table crm.invoices
  add column if not exists terms_and_conditions text,
  add column if not exists delivery_time text,
  add column if not exists parts_origin text,
  add column if not exists parts_quality text,
  add column if not exists validity text,
  add column if not exists customer_reference text,
  add column if not exists customer_trn text,
  add column if not exists company_trn text,
  add column if not exists pic_details text,
  add column if not exists additional_notes text,
  add column if not exists letterhead_enabled boolean not null default true,
  add column if not exists stamp_enabled boolean not null default true,
  add column if not exists signature_enabled boolean not null default false;
