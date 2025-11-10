import { calculateVat } from '@/config/uaeTax';
import type { CommercialDocument, LineItem, TaxSummary } from '@/types/documents';

export interface DocumentBuilderInput {
  issuer: CommercialDocument['issuer'];
  recipient: CommercialDocument['recipient'];
  items: LineItem[];
  meta: CommercialDocument['meta'];
  paymentTerms?: string;
  deliveryTerms?: string;
}

const calculateTaxSummary = (items: LineItem[]): TaxSummary => {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const vatAmount = items.reduce(
    (sum, item) =>
      sum +
      calculateVat({
        taxableAmount: item.quantity * item.unitPrice,
        isZeroRated: item.isZeroRated,
        isExempt: item.isExempt
      }),
    0
  );

  return {
    subtotal: Number(subtotal.toFixed(2)),
    vatAmount: Number(vatAmount.toFixed(2)),
    total: Number((subtotal + vatAmount).toFixed(2))
  };
};

export const buildCommercialDocument = ({
  issuer,
  recipient,
  items,
  meta,
  paymentTerms,
  deliveryTerms
}: DocumentBuilderInput): CommercialDocument => {
  const taxSummary = calculateTaxSummary(items);

  return {
    issuer,
    recipient,
    items,
    meta,
    taxSummary,
    paymentTerms,
    deliveryTerms
  };
};
