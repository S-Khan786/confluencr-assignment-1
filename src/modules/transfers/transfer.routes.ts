import { Router } from 'express';
import { transferController } from './transfer.controller.js';
import { validate } from '../../middleware/validate.middleware.js';
import { createTransferSchema } from './transfer.validation.js';

const router = Router();

router.post(
  '/',
  validate({ body: createTransferSchema }),
  (req, res, next) => transferController.transferFunds(req, res, next)
);

export const transferRoutes = router;
