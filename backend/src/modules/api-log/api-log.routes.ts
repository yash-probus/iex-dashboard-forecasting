import { Router } from 'express';
import { ApiLogController } from './api-log.controller';

const router = Router();

router.get('/api-names', ApiLogController.getUniqueApiNames);
router.get('/stats', ApiLogController.getStats);
router.get('/', ApiLogController.getLogs);

export default router;
