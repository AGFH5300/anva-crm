alter table crm.quotations
  add column if not exists customer_reference text,
  add column if not exists customer_trn text,
  add column if not exists company_trn text,
  add column if not exists pic_details text,
  add column if not exists additional_notes text,
  add column if not exists stamp_enabled boolean not null default true,
  add column if not exists signature_enabled boolean not null default true;

create table if not exists crm.company_document_settings (
  id uuid primary key default gen_random_uuid(),
  company_name text not null default 'ANVA Marine & Industrial Supplies LLC',
  company_trn text,
  default_payment_terms text,
  default_delivery_terms text,
  default_validity text,
  default_footer_text text,
  default_terms_and_conditions text,
  default_letterhead_enabled boolean not null default true,
  default_stamp_enabled boolean not null default true,
  default_signature_enabled boolean not null default true,
  logo_url text,
  stamp_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists set_timestamp on crm.company_document_settings;
create trigger set_timestamp before update on crm.company_document_settings
for each row execute procedure crm.tg_set_timestamp();

insert into crm.company_document_settings (
  company_name,
  company_trn,
  default_payment_terms,
  default_delivery_terms,
  default_validity,
  default_footer_text,
  default_terms_and_conditions,
  logo_url,
  stamp_url
)
select
  'ANVA Marine & Industrial Supplies LLC',
  '100292939000003',
  'Net 30',
  'EXW',
  '30 days',
  'Thank you for your business.',
  'All prices are subject to VAT as applicable.',
  '/branding/anva-logo.svg',
  '/branding/anva-stamp.svg'
where not exists (select 1 from crm.company_document_settings);
