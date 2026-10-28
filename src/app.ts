import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { accountRoutes } from './modules/accounts/account.routes.js';
import {
  transactionRoutes,
  rootTransactionRoutes
} from './modules/transactions/transaction.routes.js';
import { transferRoutes } from './modules/transfers/transfer.routes.js';
import { errorHandler } from './middleware/error.middleware.js';
import { NotFoundError } from './errors/app-error.js';

export const createApp = (): Application => {
  const app = express();

  // Global Middlewares
  app.use(cors());
  app.use(express.json());

  // Root and Health check endpoints
  const healthResponse = (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'UP',
      message: 'Transaction Ledger API is running successfully',
      timestamp: new Date().toISOString(),
      service: 'Transaction Ledger API'
    });
  };

  app.get('/', healthResponse);
  app.get('/health', healthResponse);

  // API Routes
  app.use('/accounts', accountRoutes);
  app.use('/accounts/:id/transactions', transactionRoutes);
  app.use('/transactions', rootTransactionRoutes);
  app.use('/transfers', transferRoutes);

  // Catch-all 404 for unhandled routes
  app.use((req: Request, _res: Response, next: NextFunction) => {
    next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`));
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
};
