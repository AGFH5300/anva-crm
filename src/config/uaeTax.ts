export const UAE_VAT_RATE = 0.05; // 5% standard VAT
export const UAE_CORPORATE_TAX_RATE = 0.09; // 9% corporate tax rate on taxable profits
export const UAE_CORPORATE_TAX_THRESHOLD_AED = 375000; // Profits up to this amount taxed at 0%

export interface VatCalculationInput {
  taxableAmount: number;
  isZeroRated?: boolean;
  isExempt?: boolean;
}

export const calculateVat = ({ taxableAmount, isZeroRated, isExempt }: VatCalculationInput) => {
  if (isZeroRated || isExempt) {
    return 0;
  }

  return Number((taxableAmount * UAE_VAT_RATE).toFixed(2));
};

export interface CorporateTaxInput {
  netProfit: number;
}

export const calculateCorporateTax = ({ netProfit }: CorporateTaxInput) => {
  if (netProfit <= UAE_CORPORATE_TAX_THRESHOLD_AED) {
    return 0;
  }

  const taxableProfit = netProfit - UAE_CORPORATE_TAX_THRESHOLD_AED;
  return Number((taxableProfit * UAE_CORPORATE_TAX_RATE).toFixed(2));
};

export const formatCurrencyAED = (value: number) =>
  new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(value);
