export type DocumentKind = 'quotation' | 'enquiry' | 'supplier-enquiry' | 'proforma-invoice' | 'invoice' | 'purchase-order';

export type DocumentTemplateConfig = {
  title: string;
  visibleMetaFields: string[];
  visibleTableColumns: Array<'serial' | 'partNumber' | 'description' | 'quantity' | 'unitPrice' | 'discount' | 'netPrice' | 'vat' | 'totalPrice'>;
  showTotals: boolean;
  showCommercialTerms: boolean;
  showFooter: boolean;
  defaultLetterheadEnabled: boolean;
  defaultStampEnabled: boolean;
  defaultSignatureEnabled: boolean;
};

export type DocumentRenderInput = {
  kind: DocumentKind;
  config: DocumentTemplateConfig;
  title?: string;
  documentNumber: string;
  issueDate: string;
  recipientName?: string;
  recipientCompany?: string;
  recipientAddress?: string;
  recipientContact?: string;
  attention?: string;
  companyName?: string;
  companyAddress?: string;
  companyContact?: string;
  currency?: string;
  meta: Record<string, string | undefined | null>;
  rows: Array<{
    serial?: string;
    partNumber?: string;
    description: string;
    quantity?: string;
    unitPrice?: string;
    discount?: string;
    netPrice?: string;
    vat?: string;
    totalPrice?: string;
  }>;
  totals?: { subtotal?: string; vatAmount?: string; grandTotal?: string; amountInWords?: string };
  terms?: Record<string, string | undefined | null>;
  footerText?: string;
  signatureName?: string;
  letterheadEnabled?: boolean;
  stampEnabled?: boolean;
  signatureEnabled?: boolean;
  logoPath?: string;
  stampPath?: string;
};

const esc = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] ?? char));

const labelize = (key: string) => key.replace(/_/g, ' ').replace(/\b\w/g, (s) => s.toUpperCase());

export const renderAnvaDocumentHtml = (input: DocumentRenderInput) => {
  const columns = input.config.visibleTableColumns;
  const rows = input.rows
    .map((row) => `<tr>${columns.map((column) => `<td>${esc(String(row[column] ?? ''))}</td>`).join('')}</tr>`)
    .join('');

  const metaRows = Object.entries(input.meta)
    .filter(([key, value]) => input.config.visibleMetaFields.includes(key) && value)
    .map(([key, value]) => `<div><strong>${esc(labelize(key))}:</strong> ${esc(String(value))}</div>`)
    .join('');

  const termsRows = input.config.showCommercialTerms
    ? Object.entries(input.terms ?? {})
      .filter(([, value]) => Boolean(value))
      .map(([key, value]) => `<tr><td>${esc(labelize(key))}</td><td>${esc(String(value))}</td></tr>`)
      .join('')
    : '';

  const showLetterhead = input.letterheadEnabled ?? input.config.defaultLetterheadEnabled;
  const showStamp = input.stampEnabled ?? input.config.defaultStampEnabled;
  const showSignature = input.signatureEnabled ?? input.config.defaultSignatureEnabled;

  return `<!doctype html><html><head><meta charset="utf-8" /><style>
    body{font-family:Arial,sans-serif;color:#0f172a;padding:18px;font-size:12px}
    .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1e3a5f;padding-bottom:10px;margin-bottom:12px}
    .logo{height:56px}
    .block{border:1px solid #cbd5e1;padding:10px;border-radius:6px}
    .grid{display:grid;grid-template-columns:1.2fr 1fr;gap:10px;margin-bottom:10px}
    table{width:100%;border-collapse:collapse;margin-top:10px}
    th,td{border:1px solid #cbd5e1;padding:6px;text-align:left;vertical-align:top}
    th{background:#eff6ff}
    .totals{margin-top:8px;margin-left:auto;max-width:320px}
    .terms td:first-child{font-weight:bold;width:35%}
    .footer{margin-top:16px;border-top:1px solid #cbd5e1;padding-top:12px}
    .stamp{height:72px;opacity:.85}
  </style></head><body>
    ${showLetterhead ? `<div class="head"><div><img src="${input.logoPath ?? '/branding/anva-logo.svg'}" class="logo" /><div><strong>${esc(input.companyName ?? 'ANVA Marine & Industrial Supplies')}</strong></div><div>${esc(input.companyAddress ?? 'Dubai, UAE')}</div><div>${esc(input.companyContact ?? '')}</div></div><div><h2 style="margin:0;">${esc(input.title ?? input.config.title)}</h2><div>No: ${esc(input.documentNumber)}</div><div>Date: ${esc(input.issueDate)}</div></div></div>` : `<h2>${esc(input.title ?? input.config.title)}</h2>`}
    <div class="grid"><div class="block"><strong>Recipient</strong><div>${esc(input.recipientName ?? '')}</div><div>${esc(input.recipientCompany ?? '')}</div><div>${esc(input.recipientAddress ?? '')}</div><div>${esc(input.recipientContact ?? '')}</div>${input.attention ? `<div><strong>Attention:</strong> ${esc(input.attention)}</div>` : ''}</div><div class="block"><strong>Document Metadata</strong>${metaRows}</div></div>
    <table><thead><tr>${columns.map((column) => `<th>${esc(labelize(column))}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>
    ${input.config.showTotals && input.totals ? `<table class="totals"><tbody><tr><td>Subtotal</td><td>${esc(input.totals.subtotal ?? '')}</td></tr><tr><td>VAT</td><td>${esc(input.totals.vatAmount ?? '')}</td></tr><tr><td><strong>Grand Total</strong></td><td><strong>${esc(input.totals.grandTotal ?? '')}</strong></td></tr><tr><td>Amount In Words</td><td>${esc(input.totals.amountInWords ?? '')}</td></tr></tbody></table>` : ''}
    ${termsRows ? `<h3>Commercial Terms</h3><table class="terms"><tbody>${termsRows}</tbody></table>` : ''}
    ${input.config.showFooter ? `<div class="footer"><div>${esc(input.footerText ?? 'Thank you for your business.')}</div>${showSignature ? `<div style="margin-top:24px">Authorized Signatory: ${esc(input.signatureName ?? 'ANVA Authorized Signatory')}</div>` : ''}${showStamp ? `<div style="margin-top:12px"><img src="${input.stampPath ?? '/branding/anva-stamp.svg'}" class="stamp" /></div>` : ''}</div>` : ''}
  </body></html>`;
};
