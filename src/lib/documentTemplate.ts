import type { QuotationLine } from '@/types/crm';

export type SupportedDocumentType = 'quotation' | 'enquiry-rfq' | 'proforma-invoice' | 'invoice' | 'purchase-order' | 'supplier-enquiry';

export type DocumentBrandingSettings = {
  companyName: string;
  companyAddress: string;
  companyEmail: string;
  companyPhone: string;
  companyTrn?: string;
  logoUrl: string;
  stampUrl: string;
  footerText: string;
  termsAndConditions: string;
  defaultPaymentTerms: string;
  defaultDeliveryTerms: string;
  defaultValidity: string;
  letterheadEnabled: boolean;
  stampEnabled: boolean;
  signatureEnabled: boolean;
};

export type TemplateLineItem = {
  serialNumber?: string | number;
  partNumber?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPct?: number;
  discountAmount?: number;
  vatRate: number;
};

export type RenderCommercialDocument = {
  documentType: SupportedDocumentType;
  title: string;
  documentNumber: string;
  date: string;
  recipientName: string;
  recipientAddress?: string;
  customerReference?: string;
  validity?: string;
  customerTrn?: string;
  companyTrn?: string;
  picDetails?: string;
  currency: string;
  lines: TemplateLineItem[];
  paymentTerms?: string;
  deliveryTerms?: string;
  deliveryTime?: string;
  deliveryCharges?: string;
  taxesAndDuties?: string;
  vatNote?: string;
  termsAndConditions?: string;
  partsOrigin?: string;
  partsQuality?: string;
  additionalNotes?: string;
  amountInWords?: string;
  letterheadEnabled?: boolean;
  stampEnabled?: boolean;
  signatureEnabled?: boolean;
};

export const DEFAULT_BRANDING: DocumentBrandingSettings = {
  companyName: 'ANVA Marine & Industrial Supplies LLC',
  companyAddress: 'Dubai, United Arab Emirates',
  companyEmail: 'sales@anva.ae',
  companyPhone: '+971-00-000-0000',
  companyTrn: '100292939000003',
  logoUrl: '/branding/anva-logo.svg',
  stampUrl: '/branding/anva-stamp.svg',
  footerText: 'Thank you for your business.',
  termsAndConditions: 'All prices are in AED and subject to VAT as applicable.',
  defaultPaymentTerms: 'Net 30',
  defaultDeliveryTerms: 'Ex-Works (EXW)',
  defaultValidity: '30 days',
  letterheadEnabled: true,
  stampEnabled: true,
  signatureEnabled: true
};

const formatMoney = (value: number, currency: string) => `${currency} ${value.toFixed(2)}`;

export const mapQuotationLinesToTemplate = (lines: QuotationLine[]): TemplateLineItem[] =>
  lines.map((line, index) => ({
    serialNumber: index + 1,
    partNumber: '-',
    description: line.description,
    quantity: Number(line.quantity),
    unitPrice: Number(line.unit_price),
    discountPct: Number(line.discount_pct ?? 0),
    discountAmount: Number(line.discount ?? 0),
    vatRate: Number(line.vat_rate ?? 0)
  }));

export const renderDocumentHtml = (doc: RenderCommercialDocument, branding = DEFAULT_BRANDING) => {
  const lineRows = doc.lines
    .map((line) => {
      const base = line.quantity * line.unitPrice;
      const discount = line.discountAmount && line.discountAmount > 0 ? line.discountAmount : base * ((line.discountPct ?? 0) / 100);
      const net = Math.max(0, base - discount);
      const vat = net * (line.vatRate / 100);
      const total = net + vat;
      return `<tr>
<td>${line.serialNumber ?? ''}</td>
<td>${line.partNumber ?? '-'}</td>
<td>${line.description}</td>
<td class="num">${line.quantity}</td>
<td class="num">${line.unitPrice.toFixed(2)}</td>
<td class="num">${discount.toFixed(2)}</td>
<td class="num">${net.toFixed(2)}</td>
<td class="num">${vat.toFixed(2)}</td>
<td class="num">${total.toFixed(2)}</td>
</tr>`;
    })
    .join('');

  const totals = doc.lines.reduce(
    (acc, line) => {
      const base = line.quantity * line.unitPrice;
      const discount = line.discountAmount && line.discountAmount > 0 ? line.discountAmount : base * ((line.discountPct ?? 0) / 100);
      const net = Math.max(0, base - discount);
      const vat = net * (line.vatRate / 100);
      return { subtotal: acc.subtotal + net, vat: acc.vat + vat, grand: acc.grand + net + vat };
    },
    { subtotal: 0, vat: 0, grand: 0 }
  );

  const letterhead = doc.letterheadEnabled ?? branding.letterheadEnabled;
  const stampEnabled = doc.stampEnabled ?? branding.stampEnabled;
  const signatureEnabled = doc.signatureEnabled ?? branding.signatureEnabled;

  return `<!DOCTYPE html><html><head><style>
body{font-family:Arial,sans-serif;color:#0f172a;padding:24px;font-size:12px}
.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0f172a;padding-bottom:12px;margin-bottom:14px}
.logo{height:62px;max-width:220px;object-fit:contain}
.meta td{padding:3px 6px;vertical-align:top}
.tbl{width:100%;border-collapse:collapse;margin-top:10px}
.tbl th,.tbl td{border:1px solid #cbd5e1;padding:6px;font-size:11px}
.tbl th{background:#e2e8f0;text-align:left}
.num{text-align:right}
.section{margin-top:14px}
.footer{margin-top:18px;border-top:1px solid #cbd5e1;padding-top:12px;display:flex;justify-content:space-between}
.letterhead{font-size:11px;margin-bottom:8px}
</style></head><body>
${letterhead ? `<div class="letterhead"><strong>${branding.companyName}</strong><br/>${branding.companyAddress}<br/>${branding.companyEmail} · ${branding.companyPhone}</div>` : ''}
<div class="header">
<div><img src="${branding.logoUrl}" class="logo" alt="ANVA logo"/></div>
<div><h2 style="margin:0">${doc.title}</h2><table class="meta">
<tr><td><strong>No:</strong></td><td>${doc.documentNumber}</td></tr>
<tr><td><strong>Date:</strong></td><td>${doc.date}</td></tr>
<tr><td><strong>Customer Ref:</strong></td><td>${doc.customerReference ?? '-'}</td></tr>
<tr><td><strong>Validity:</strong></td><td>${doc.validity ?? branding.defaultValidity}</td></tr>
<tr><td><strong>Customer TRN:</strong></td><td>${doc.customerTrn ?? '-'}</td></tr>
<tr><td><strong>ANVA TRN:</strong></td><td>${doc.companyTrn ?? branding.companyTrn ?? '-'}</td></tr>
<tr><td><strong>PIC:</strong></td><td>${doc.picDetails ?? '-'}</td></tr>
</table></div></div>
<div><strong>To:</strong> ${doc.recipientName}<br/>${doc.recipientAddress ?? ''}</div>
<table class="tbl"><thead><tr><th>S/N</th><th>Part No</th><th>Description</th><th>Qty</th><th>Unit Price</th><th>Discount</th><th>Net Price</th><th>VAT</th><th>Total</th></tr></thead>
<tbody>${lineRows}</tbody></table>
<div class="section" style="text-align:right"><div>Subtotal: ${formatMoney(totals.subtotal, doc.currency)}</div><div>VAT: ${formatMoney(totals.vat, doc.currency)}</div><div><strong>Grand Total: ${formatMoney(totals.grand, doc.currency)}</strong></div><div>Amount in words: ${doc.amountInWords ?? '-'}</div></div>
<div class="section"><h4 style="margin:0 0 6px 0">Commercial Terms</h4>
<table class="tbl"><tbody>
<tr><td><strong>Payment Terms</strong></td><td>${doc.paymentTerms ?? branding.defaultPaymentTerms}</td></tr>
<tr><td><strong>Delivery Terms</strong></td><td>${doc.deliveryTerms ?? branding.defaultDeliveryTerms}</td></tr>
<tr><td><strong>Delivery Time</strong></td><td>${doc.deliveryTime ?? '-'}</td></tr>
<tr><td><strong>Delivery Charges</strong></td><td>${doc.deliveryCharges ?? '-'}</td></tr>
<tr><td><strong>Taxes & Duties</strong></td><td>${doc.taxesAndDuties ?? '-'}</td></tr>
<tr><td><strong>VAT Note</strong></td><td>${doc.vatNote ?? 'VAT applied as per UAE law.'}</td></tr>
<tr><td><strong>Parts Origin</strong></td><td>${doc.partsOrigin ?? '-'}</td></tr>
<tr><td><strong>Parts Quality</strong></td><td>${doc.partsQuality ?? '-'}</td></tr>
<tr><td><strong>Additional Notes</strong></td><td>${doc.additionalNotes ?? '-'}</td></tr>
<tr><td><strong>T&C</strong></td><td>${doc.termsAndConditions ?? branding.termsAndConditions}</td></tr>
</tbody></table></div>
<div class="footer"><div>${branding.footerText}</div><div><div>Authorized Signatory</div>${signatureEnabled ? '<div style="height:40px"></div>' : ''}${stampEnabled ? `<img src="${branding.stampUrl}" alt="ANVA stamp" style="height:72px;object-fit:contain"/>` : ''}</div></div>
</body></html>`;
};
