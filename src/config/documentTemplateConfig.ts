import type { DocumentKind, DocumentTemplateConfig } from '@/services/documents/anvaDocumentTemplate';

export const DOCUMENT_TEMPLATE_CONFIG: Record<DocumentKind, DocumentTemplateConfig> = {
  quotation: {
    title: 'Quotation',
    visibleMetaFields: ['customer_reference', 'validity', 'customer_trn', 'company_trn', 'pic_details'],
    visibleTableColumns: ['serial', 'partNumber', 'description', 'quantity', 'unitPrice', 'discount', 'netPrice', 'vat', 'totalPrice'],
    showTotals: true,
    showCommercialTerms: true,
    showFooter: true,
    defaultLetterheadEnabled: true,
    defaultStampEnabled: true,
    defaultSignatureEnabled: false
  },
  enquiry: {
    title: 'Enquiry / RFQ',
    visibleMetaFields: ['customer_reference', 'pic_details'],
    visibleTableColumns: ['serial', 'partNumber', 'description', 'quantity'],
    showTotals: false,
    showCommercialTerms: true,
    showFooter: true,
    defaultLetterheadEnabled: true,
    defaultStampEnabled: false,
    defaultSignatureEnabled: false
  },
  'supplier-enquiry': {
    title: 'Supplier Enquiry',
    visibleMetaFields: ['customer_reference'],
    visibleTableColumns: ['serial', 'partNumber', 'description', 'quantity'],
    showTotals: false,
    showCommercialTerms: true,
    showFooter: true,
    defaultLetterheadEnabled: true,
    defaultStampEnabled: false,
    defaultSignatureEnabled: false
  },
  'proforma-invoice': {
    title: 'Proforma Invoice',
    visibleMetaFields: ['customer_reference', 'customer_trn', 'company_trn'],
    visibleTableColumns: ['serial', 'description', 'quantity', 'unitPrice', 'vat', 'totalPrice'],
    showTotals: true,
    showCommercialTerms: true,
    showFooter: true,
    defaultLetterheadEnabled: true,
    defaultStampEnabled: true,
    defaultSignatureEnabled: true
  },
  invoice: {
    title: 'Invoice',
    visibleMetaFields: ['customer_reference', 'customer_trn', 'company_trn'],
    visibleTableColumns: ['serial', 'description', 'quantity', 'unitPrice', 'vat', 'totalPrice'],
    showTotals: true,
    showCommercialTerms: true,
    showFooter: true,
    defaultLetterheadEnabled: true,
    defaultStampEnabled: true,
    defaultSignatureEnabled: true
  },
  'purchase-order': {
    title: 'Purchase Order',
    visibleMetaFields: ['customer_reference', 'pic_details'],
    visibleTableColumns: ['serial', 'partNumber', 'description', 'quantity', 'unitPrice', 'totalPrice'],
    showTotals: true,
    showCommercialTerms: true,
    showFooter: true,
    defaultLetterheadEnabled: true,
    defaultStampEnabled: true,
    defaultSignatureEnabled: true
  }
};
