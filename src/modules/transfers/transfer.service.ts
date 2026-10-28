import { prisma } from '../../db/prisma.js';
import {
  ConflictError,
  InsufficientFundsError,
  NotFoundError
} from '../../errors/app-error.js';
import { CreateTransferInput } from './transfer.validation.js';

export class TransferService {
  /**
   * Executes an atomic fund transfer between two distinct accounts.
   * Ensures all-or-nothing execution, idempotency, and ledger balance consistency.
   */
  async transferFunds(input: CreateTransferInput) {
    return await prisma.$transaction(async (tx) => {
      // 1. Verify idempotency - reject duplicate transfer reference IDs
      const existingTransfer = await tx.transfer.findUnique({
        where: { referenceId: input.reference_id }
      });

      if (existingTransfer) {
        throw new ConflictError(
          `Transfer with reference_id '${input.reference_id}' already exists.`
        );
      }

      // 2. Fetch both source and destination accounts
      const sourceAccount = await tx.account.findUnique({
        where: { id: input.source_account_id }
      });
      if (!sourceAccount) {
        throw new NotFoundError(
          `Source account with ID '${input.source_account_id}' does not exist.`
        );
      }

      const destinationAccount = await tx.account.findUnique({
        where: { id: input.destination_account_id }
      });
      if (!destinationAccount) {
        throw new NotFoundError(
          `Destination account with ID '${input.destination_account_id}' does not exist.`
        );
      }

      // 3. Verify that source account has sufficient funds
      if (sourceAccount.balance < input.amount) {
        throw new InsufficientFundsError(
          `Transfer rejected: Insufficient funds in source account. Available: ${sourceAccount.balance.toFixed(2)}, Requested: ${input.amount.toFixed(2)}.`
        );
      }

      // 4. Calculate updated balances
      const newSourceBalance = Number((sourceAccount.balance - input.amount).toFixed(2));
      const newDestBalance = Number((destinationAccount.balance + input.amount).toFixed(2));

      // 5. Atomically update balances
      await tx.account.update({
        where: { id: sourceAccount.id },
        data: { balance: newSourceBalance }
      });

      await tx.account.update({
        where: { id: destinationAccount.id },
        data: { balance: newDestBalance }
      });

      // 6. Record matching audit ledger transactions
      const desc = input.description ? ` - ${input.description}` : '';

      await tx.transaction.create({
        data: {
          accountId: sourceAccount.id,
          type: 'debit',
          amount: input.amount,
          description: `Transfer to ${destinationAccount.name} (${destinationAccount.id})${desc}`,
          referenceId: `TR-OUT-${input.reference_id}`
        }
      });

      await tx.transaction.create({
        data: {
          accountId: destinationAccount.id,
          type: 'credit',
          amount: input.amount,
          description: `Transfer from ${sourceAccount.name} (${sourceAccount.id})${desc}`,
          referenceId: `TR-IN-${input.reference_id}`
        }
      });

      // 7. Persist transfer log
      const transferRecord = await tx.transfer.create({
        data: {
          sourceAccountId: sourceAccount.id,
          destinationAccountId: destinationAccount.id,
          amount: input.amount,
          referenceId: input.reference_id
        }
      });

      return {
        id: transferRecord.id,
        source_account_id: sourceAccount.id,
        destination_account_id: destinationAccount.id,
        amount: input.amount,
        reference_id: transferRecord.referenceId,
        source_balance: newSourceBalance,
        destination_balance: newDestBalance,
        created_at: transferRecord.createdAt
      };
    });
  }
}

export const transferService = new TransferService();
