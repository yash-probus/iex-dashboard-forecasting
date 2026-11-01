import { Router, Request, Response } from 'express';
import { DatabaseController } from './database.controller';
import { handleUpload, uploadCleanupOnError } from '../../middleware/upload.middleware';

const router = Router();
const databaseController = new DatabaseController();

router.get('/demand', (req, res) => databaseController.getDemandData(req, res));
router.get('/generation', (req, res) => databaseController.getGenerationData(req, res));
router.get('/weather', (req, res) => databaseController.getWeatherData(req, res));
router.get('/export/csv', (req, res) => databaseController.exportCSV(req, res));

router.get('/holidays', (req: Request, res: Response) => databaseController.getHolidays(req, res));
router.post('/holidays', (req: Request, res: Response) => databaseController.createHoliday(req, res));
router.post('/holidays/upload', handleUpload, (req: Request, res: Response) => databaseController.uploadHolidays(req, res), uploadCleanupOnError);
router.put('/holidays/:id', (req: Request, res: Response) => databaseController.updateHoliday(req, res));
router.patch('/holidays/:id/toggle', (req: Request, res: Response) => databaseController.toggleHoliday(req, res));
router.get('/city-state', (req: Request, res: Response) => databaseController.getCityStateData(req, res));
router.post('/city-state', (req: Request, res: Response) => databaseController.createCityStateData(req, res));

export default router;
