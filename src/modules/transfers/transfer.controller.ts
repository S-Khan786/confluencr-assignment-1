import { Request, Response, NextFunction } from 'express';
import { transferService } from './transfer.service.js';
import { CreateTransferInput } from './transfer.validation.js';

export class TransferController {
  async transferFunds(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const body = req.body as CreateTransferInput;
      const result = await transferService.transferFunds(body);

      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

export const transferController = new TransferController();
