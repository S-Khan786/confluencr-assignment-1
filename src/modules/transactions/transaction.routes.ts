import { Router, Request, Response, NextFunction } from 'express';
import { transactionController } from './transaction.controller.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  createTransactionSchema,
  getTransactionsQuerySchema
} from './transaction.validation.js';
import { accountParamsSchema } from '../accounts/account.validation.js';
import { z } from 'zod';

const router = Router({ mergeParams: true });

// Schema for standalone POST /transactions where account_id is in body
const rootCreateTransactionSchema = createTransactionSchema.extend({
  account_id: z.string().trim().min(1, 'account_id is required')
});

// Middleware for root POST /transactions to inject account_id into params
const adaptRootTransaction = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (req.body.account_id && !req.params.id) {
    req.params.id = req.body.account_id;
  }
  next();
};

// 1. Nested under accounts: POST /accounts/:id/transactions
router.post(
  '/',
  validate({
    params: accountParamsSchema,
    body: createTransactionSchema
  }),
  (req, res, next) => transactionController.createTransaction(req, res, next)
);

// 2. Nested under accounts: GET /accounts/:id/transactions
router.get(
  '/',
  validate({
    params: accountParamsSchema,
    query: getTransactionsQuerySchema
  }),
  (req, res, next) => transactionController.getTransactionHistory(req, res, next)
);

export const transactionRoutes = router;

// Root router for /transactions
const rootRouter = Router();

rootRouter.post(
  '/',
  validate({ body: rootCreateTransactionSchema }),
  adaptRootTransaction,
  (req, res, next) => transactionController.createTransaction(req, res, next)
);

rootRouter.get(
  '/',
  validate({
    query: getTransactionsQuerySchema.extend({
      account_id: z.string().trim().min(1, 'account_id query parameter is required')
    })
  }),
  (req, _res, next) => {
    req.params.id = req.query.account_id as string;
    next();
  },
  (req, res, next) => transactionController.getTransactionHistory(req, res, next)
);

export const rootTransactionRoutes = rootRouter;
