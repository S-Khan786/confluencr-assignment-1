import { z } from 'zod';

export const createTransferSchema = z
  .object({
    source_account_id: z.string({ required_error: 'source_account_id is required' }).trim().min(1),
    destination_account_id: z.string({ required_error: 'destination_account_id is required' }).trim().min(1),
    amount: z
      .number({ required_error: 'amount is required' })
      .positive('Transfer amount must be greater than 0')
      .max(1000000000, 'Amount exceeds maximum allowable limit')
      .refine((val) => Number(val.toFixed(2)) === val, {
        message: 'Amount cannot have more than 2 decimal places'
      }),
    reference_id: z
      .string({ required_error: 'reference_id is required' })
      .trim()
      .min(1, 'reference_id cannot be empty')
      .max(100, 'reference_id cannot exceed 100 characters'),
    description: z
      .string()
      .trim()
      .max(255, 'Description cannot exceed 255 characters')
      .optional()
  })
  .refine((data) => data.source_account_id !== data.destination_account_id, {
    message: 'Source and destination accounts must be different',
    path: ['destination_account_id']
  });

export type CreateTransferInput = z.infer<typeof createTransferSchema>;
