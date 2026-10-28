import { z } from 'zod';

export const createTransactionSchema = z.object({
  type: z.enum(['credit', 'debit'], {
    errorMap: () => ({ message: "Transaction type must be either 'credit' or 'debit'" })
  }),
  amount: z
    .number({ required_error: 'Amount is required' })
    .positive('Amount must be greater than 0')
    .max(1000000000, 'Amount exceeds maximum allowable limit')
    .refine((val) => Number(val.toFixed(2)) === val, {
      message: 'Amount cannot have more than 2 decimal places'
    }),
  description: z
    .string({ required_error: 'Description is required' })
    .trim()
    .min(1, 'Description cannot be empty')
    .max(255, 'Description cannot exceed 255 characters'),
  reference_id: z
    .string({ required_error: 'reference_id is required' })
    .trim()
    .min(1, 'reference_id cannot be empty')
    .max(100, 'reference_id cannot exceed 100 characters')
}).strict();

export const getTransactionsQuerySchema = z.object({
  type: z.enum(['credit', 'debit']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10)
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type GetTransactionsQueryInput = z.infer<typeof getTransactionsQuerySchema>;
