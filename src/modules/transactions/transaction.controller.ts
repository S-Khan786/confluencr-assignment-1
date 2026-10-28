import { Request, Response, NextFunction } from 'express';
import { transactionService } from './transaction.service.js';
import {
  CreateTransactionInput,
  GetTransactionsQueryInput
} from './transaction.validation.js';

export class TransactionController {
  async createTransaction(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id: accountId } = req.params;
      const body = req.body as CreateTransactionInput;

      const result = await transactionService.createTransaction(accountId, body);

      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async getTransactionHistory(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id: accountId } = req.params;
      const query = req.query as unknown as GetTransactionsQueryInput;

      const result = await transactionService.getTransactionHistory(
        accountId,
        query
      );

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

export const transactionController = new TransactionController();
