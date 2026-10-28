import { prisma } from '../../db/prisma.js';
import { NotFoundError } from '../../errors/app-error.js';

export class AccountService {
  async createAccount(name: string) {
    const account = await prisma.account.create({
      data: {
        name,
        balance: 0.0 // Always initialized to 0
      }
    });

    return {
      id: account.id,
      name: account.name,
      balance: account.balance,
      created_at: account.createdAt
    };
  }

  async getAccountById(id: string) {
    const account = await prisma.account.findUnique({
      where: { id }
    });

    if (!account) {
      throw new NotFoundError(`Account with ID '${id}' was not found`);
    }

    return {
      id: account.id,
      name: account.name,
      balance: account.balance,
      created_at: account.createdAt
    };
  }

  async getAccountBalance(id: string) {
    const account = await this.getAccountById(id);
    return {
      account_id: account.id,
      balance: account.balance
    };
  }
}

export const accountService = new AccountService();
