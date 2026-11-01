import { Router } from 'express';
import multer from 'multer';
import { MarketOperationsController } from './market-operations.controller';

const router = Router();
const controller = new MarketOperationsController();
router.get('/', controller.getRecords.bind(controller));

export default router;
