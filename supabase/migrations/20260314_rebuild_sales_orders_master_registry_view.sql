create or replace view crm.v_sales_orders_master_registry as
select
  so.id,
  so.quotation_id,
  so.document_number,
  q.document_number as quotation_document_number,
  so.issue_date,
  so.client_id,
  c.name as client_name,
  so.client_reference_number,
  so.client_po_number,
  so.status,
  so.total,
  so.created_at
from crm.sales_orders so
left join crm.quotations q
  on so.quotation_id = q.id
left join crm.clients c
  on so.client_id = c.id
order by so.created_at desc;
