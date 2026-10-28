import { prisma } from '../../db/prisma.js';
import {
  ConflictError,
  InsufficientFundsError,
  NotFoundError
} from '../../errors/app-error.js';
import {
  CreateTransactionInput,
  GetTransactionsQueryInput
} from './transaction.validation.js';

export class TransactionService {
  /**
   * Performs an atomic credit or debit transaction on an account.
   * Ensures idempotency (unique reference_id per account) and sufficient balance.
   */
  async createTransaction(accountId: string, input: CreateTransactionInput) {
    return await prisma.$transaction(async (tx) => {
      // 1. Verify that the target account exists
      const account = await tx.account.findUnique({
        where: { id: accountId }
      });

      if (!account) {
        throw new NotFoundError(`Account with ID '${accountId}' does not exist.`);
      }

      // 2. Check for duplicate reference_id within this specific account
      const existingTx = await tx.transaction.findUnique({
        where: {
          account_reference_unique: {
            accountId,
            referenceId: input.reference_id
          }
        }
      });

      if (existingTx) {
        throw new ConflictError(
          `Transaction with reference_id '${input.reference_id}' already exists for this account.`
        );
      }

      // 3. For debit, verify sufficient balance
      if (input.type === 'debit') {
        if (account.balance < input.amount) {
          throw new InsufficientFundsError(
            `Transaction rejected: Insufficient balance. Available: ${account.balance.toFixed(2)}, Required: ${input.amount.toFixed(2)}.`
          );
        }
      }

      // 4. Compute new balance with precision rounding
      const balanceChange = input.type === 'credit' ? input.amount : -input.amount;
      const updatedBalance = Number((account.balance + balanceChange).toFixed(2));

      // 5. Atomic balance update
      await tx.account.update({
        where: { id: accountId },
        data: { balance: updatedBalance }
      });

      // 6. Record transaction
      const record = await tx.transaction.create({
        data: {
          accountId,
          type: input.type,
          amount: input.amount,
          description: input.description,
          referenceId: input.reference_id
        }
      });

      return {
        id: record.id,
        account_id: record.accountId,
        type: record.type,
        amount: record.amount,
        description: record.description,
        reference_id: record.referenceId,
        created_at: record.createdAt,
        current_balance: updatedBalance
      };
    });
  }

  /**
   * Fetches paginated, filtered, and sorted transaction history for an account.
   */
  async getTransactionHistory(
    accountId: string,
    query: GetTransactionsQueryInput
  ) {
    // Verify account exists first
    const account = await prisma.account.findUnique({
      where: { id: accountId }
    });

    if (!account) {
      throw new NotFoundError(`Account with ID '${accountId}' does not exist.`);
    }

    const { type, page, limit } = query;
    const skip = (page - 1) * limit;

    const whereClause: { accountId: string; type?: string } = {
      accountId
    };

    if (type) {
      whereClause.type = type;
    }

    const [totalRecords, transactions] = await prisma.$transaction([
      prisma.transaction.count({ where: whereClause }),
      prisma.transaction.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' }, // Latest-first order
        skip,
        take: limit
      })
    ]);

    const totalPages = Math.ceil(totalRecords / limit) || 1;

    return {
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalRecords,
        totalPages
      },
      transactions: transactions.map((tx) => ({
        id: tx.id,
        account_id: tx.accountId,
        type: tx.type,
        amount: tx.amount,
        description: tx.description,
        reference_id: tx.referenceId,
        created_at: tx.createdAt
      }))
    };
  }
}

export const transactionService = new TransactionService();
