alter table crm.enquiries
  add column if not exists pic_name text,
  add column if not exists pic_phone text,
  add column if not exists pic_email text,
  add column if not exists vessel_name text,
  add column if not exists vessel_imo_number text,
  add column if not exists shipyard text,
  add column if not exists hull_number text;

alter table crm.enquiries
  alter column subject drop not null,
  alter column priority drop not null;
