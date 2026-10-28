import { Request, Response, NextFunction } from 'express';
import { accountService } from './account.service.js';

export class AccountController {
  async createAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name } = req.body;
      const account = await accountService.createAccount(name);
      res.status(201).json({
        success: true,
        data: account
      });
    } catch (error) {
      next(error);
    }
  }

  async getAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const account = await accountService.getAccountById(id);
      res.status(200).json({
        success: true,
        data: account
      });
    } catch (error) {
      next(error);
    }
  }

  async getAccountBalance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const balanceData = await accountService.getAccountBalance(id);
      res.status(200).json({
        success: true,
        data: balanceData
      });
    } catch (error) {
      next(error);
    }
  }
}

export const accountController = new AccountController();
