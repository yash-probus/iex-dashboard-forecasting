import { Router } from 'express';
import { 
  getResourceData, 
  createResourceRecord,
  createBulkResourceRecords,
  updateResourceRecord, 
  deleteResourceRecord 
} from '../controllers/resource-center.controller';

const router = Router();

// Resource Center Master API Definitions
router.get('/:resourceType', getResourceData);
router.post('/:resourceType/bulk', createBulkResourceRecords);
router.post('/:resourceType', createResourceRecord);
router.put('/:resourceType/:id', updateResourceRecord);
router.delete('/:resourceType/:id', deleteResourceRecord);

export { router as resourceCenterRouter };
