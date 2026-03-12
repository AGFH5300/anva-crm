alter table crm.purchase_order_items
  add column if not exists source_sales_order_item_id uuid references crm.sales_order_items(id) on delete set null;

create index if not exists idx_purchase_order_items_source_sales_order_item
  on crm.purchase_order_items (source_sales_order_item_id);

alter table crm.purchase_orders
  drop constraint if exists purchase_orders_status_check;

alter table crm.purchase_orders
  add constraint purchase_orders_status_check
  check (status in ('draft', 'sent', 'confirmed', 'partially_received', 'received', 'cancelled'));
