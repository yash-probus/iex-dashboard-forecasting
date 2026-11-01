import { Router } from 'express';
import { TraderPerformanceDailyController, uploadDailyTradeReports } from './trader-performance-daily.controller';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

const uploadDir = path.join(__dirname, '../../../uploads/trader-performance-daily');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

// Upload trade report PDFs (extracts data, deletes files immediately)
router.post('/upload', upload.array('files', 200), uploadDailyTradeReports);

// Consumer management endpoints
router.get('/meters', TraderPerformanceDailyController.getAvailableMeters);
router.get('/consumers', TraderPerformanceDailyController.getConsumers);
router.post('/consumers', TraderPerformanceDailyController.saveConsumer);

// Daily & Month-to-date calculation analysis
router.get('/analysis', TraderPerformanceDailyController.getDailyAnalysis);
router.post('/analysis', TraderPerformanceDailyController.getDailyAnalysis);

export default router;
