-- Ensure quotation commercial and branding fields exist for quotation detail + save flows.
alter table crm.quotations
  add column if not exists terms_and_conditions text,
  add column if not exists delivery_terms text,
  add column if not exists delivery_time text,
  add column if not exists payment_terms text,
  add column if not exists parts_origin text,
  add column if not exists parts_quality text,
  add column if not exists customer_reference text,
  add column if not exists customer_trn text,
  add column if not exists company_trn text,
  add column if not exists pic_details text,
  add column if not exists additional_notes text,
  add column if not exists company_letterhead_enabled boolean not null default false,
  add column if not exists stamp_enabled boolean not null default true,
  add column if not exists signature_enabled boolean not null default true,
  add column if not exists validity text;
