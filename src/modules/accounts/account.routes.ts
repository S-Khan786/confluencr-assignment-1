import { Router } from 'express';
import { accountController } from './account.controller.js';
import { validate } from '../../middleware/validate.middleware.js';
import { createAccountSchema, accountParamsSchema } from './account.validation.js';

const router = Router();

router.post(
  '/',
  validate({ body: createAccountSchema }),
  (req, res, next) => accountController.createAccount(req, res, next)
);

router.get(
  '/:id',
  validate({ params: accountParamsSchema }),
  (req, res, next) => accountController.getAccount(req, res, next)
);

router.get(
  '/:id/balance',
  validate({ params: accountParamsSchema }),
  (req, res, next) => accountController.getAccountBalance(req, res, next)
);

export const accountRoutes = router;
