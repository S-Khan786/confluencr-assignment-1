import { z } from 'zod';

export const createAccountSchema = z.object({
  name: z.string({
    required_error: 'Account holder name is required'
  }).trim().min(1, 'Account holder name cannot be empty').max(100, 'Account holder name is too long')
}).strict({
  message: 'Unexpected fields provided. Client is not allowed to set balance or initial attributes.'
});

export const accountParamsSchema = z.object({
  id: z.string().trim().min(1, 'Account ID must not be empty')
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type AccountParamsInput = z.infer<typeof accountParamsSchema>;
