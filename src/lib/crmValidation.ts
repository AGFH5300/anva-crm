import { z } from 'zod';
import { SUPPORTED_CURRENCIES } from '@/types/crm';

export const enquirySchema = z.object({
  clientId: z.string().uuid(),
  contactId: z.string().uuid().optional(),
  subject: z.string().trim().min(3).max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  machineryFor: z.string().trim().max(200).optional(),
  machineryMake: z.string().trim().max(200).optional(),
  machineryType: z.string().trim().max(200).optional(),
  machinerySerialNo: z.string().trim().max(200).optional()
});

export const lineSchema = z.object({
  description: z.string().trim().min(2).max(500),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().nonnegative(),
  currency: z.enum(SUPPORTED_CURRENCIES),
  vatRate: z.coerce.number().min(0).max(100).default(5),
  isZeroRated: z.boolean().default(false),
  isExempt: z.boolean().default(false)
});

export const quotationLineSchema = lineSchema.extend({
  discount: z.coerce.number().nonnegative().default(0)
});

export type EnquiryInput = z.infer<typeof enquirySchema>;
export type LineInput = z.infer<typeof lineSchema>;
export type QuotationLineInput = z.infer<typeof quotationLineSchema>;
