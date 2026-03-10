import { z } from 'zod';
import { SUPPORTED_CURRENCIES } from '@/types/crm';

export const enquirySchema = z.object({
  clientId: z.string().uuid(),
  contactId: z.string().uuid().optional(),
  jobTypeId: z.string().uuid({ message: 'Job Type is required.' }),
  salesPicUserId: z.string().uuid().optional(),
  picName: z.string().trim().max(200).optional(),
  picPhone: z.string().trim().max(100).optional(),
  picEmail: z.string().trim().email().max(320).optional(),
  vesselName: z.string().trim().min(1).max(200),
  vesselImoNumber: z.string().trim().max(100).optional(),
  shipyard: z.string().trim().max(200).optional(),
  hullNumber: z.string().trim().max(200).optional(),
  machineryFor: z.string().trim().max(200).optional(),
  machineryMake: z.string().trim().max(200).optional(),
  machineryType: z.string().trim().max(200).optional(),
  machinerySerialNo: z.string().trim().max(200).optional(),
  clientReferenceNumber: z.string().trim().max(300).optional()
});

export const lineSchema = z.object({
  itemSerialNo: z.string().trim().max(200).optional(),
  partNo: z.string().trim().max(200).optional(),
  description: z.string().trim().min(2).max(500),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().nonnegative(),
  currency: z.enum(SUPPORTED_CURRENCIES),
  vatRate: z.coerce.number().min(0).max(100).default(5),
  isZeroRated: z.boolean().default(false),
  isExempt: z.boolean().default(false)
});

export const quotationLineSchema = lineSchema.extend({
  supplierCost: z.coerce.number().nonnegative().default(0),
  supplierCurrency: z.enum(SUPPORTED_CURRENCIES).default('AED'),
  exchangeRate: z.coerce.number().positive().default(1),
  landedAedCost: z.coerce.number().nonnegative().default(0),
  marginPct: z.coerce.number().min(0).max(1000).default(0),
  discountPct: z.coerce.number().min(0).max(100).default(0),
  discount: z.coerce.number().nonnegative().default(0)
});

export const quotationCommercialTermsSchema = z.object({
  termsAndConditions: z.string().trim().max(5000).optional(),
  deliveryTerms: z.string().trim().max(300).optional(),
  deliveryTime: z.string().trim().max(300).optional(),
  paymentTerms: z.string().trim().max(300).optional(),
  partsOrigin: z.string().trim().max(300).optional(),
  partsQuality: z.string().trim().max(300).optional(),
  customerReference: z.string().trim().max(300).optional(),
  customerTrn: z.string().trim().max(100).optional(),
  companyTrn: z.string().trim().max(100).optional(),
  picDetails: z.string().trim().max(300).optional(),
  additionalNotes: z.string().trim().max(2000).optional(),
  companyLetterheadEnabled: z.boolean().default(false),
  stampEnabled: z.boolean().default(true),
  signatureEnabled: z.boolean().default(true),
  validity: z.string().trim().max(300).optional()
});

export type EnquiryInput = z.infer<typeof enquirySchema>;
export type LineInput = z.infer<typeof lineSchema>;
export type QuotationLineInput = z.infer<typeof quotationLineSchema>;
export type QuotationCommercialTermsInput = z.infer<typeof quotationCommercialTermsSchema>;
