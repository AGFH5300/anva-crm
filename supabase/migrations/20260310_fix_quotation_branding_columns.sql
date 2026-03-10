-- Ensure quotation branding toggle fields queried by quotation detail flow exist.
alter table crm.quotations
  add column if not exists company_letterhead_enabled boolean not null default false,
  add column if not exists stamp_enabled boolean not null default true,
  add column if not exists signature_enabled boolean not null default true;
