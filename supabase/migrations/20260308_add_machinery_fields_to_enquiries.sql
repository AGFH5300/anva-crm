alter table crm.enquiries
  add column if not exists machinery_for text,
  add column if not exists machinery_make text,
  add column if not exists machinery_type text,
  add column if not exists machinery_serial_no text;
