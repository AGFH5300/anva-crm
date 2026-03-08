alter table crm.enquiry_items
  add column if not exists item_serial_no text,
  add column if not exists part_no text;
