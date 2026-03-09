alter table crm.quotations
  add column if not exists terms_and_conditions text,
  add column if not exists delivery_terms text,
  add column if not exists delivery_time text,
  add column if not exists payment_terms text,
  add column if not exists parts_origin text,
  add column if not exists parts_quality text,
  add column if not exists company_letterhead_enabled boolean not null default false,
  add column if not exists validity text;
