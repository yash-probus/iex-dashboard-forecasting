import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { AppError } from '../utils/AppError';

// 1. Ensure directories exist on startup
const uploadBasePath = path.join(__dirname, '../../uploads');
const directories = ['dam', 'gdam', 'rtm', 'rec', 'holidays', 'unknown'];

directories.forEach((dir) => {
  const dirPath = path.join(uploadBasePath, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// 2. Configure Storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // We expect the market to be validated and attached to req.body by validation middleware before this
    const market = req.body.market?.toLowerCase().trim() || 'unknown';
    const destPath = path.join(uploadBasePath, market);
    cb(null, destPath);
  },
  filename: (req, file, cb) => {
    const market = req.body.market?.toLowerCase().trim() || 'unknown';
    // Example: dam_2026-06-22_1719031123.csv
    const deliveryDate = (req.body.date || req.body.deliveryDate || 'unknown-date').trim();
    const timestamp = Date.now();
    const ext = path.extname(file.originalname).toLowerCase();
    
    const newFilename = `${market}_${deliveryDate}_${timestamp}${ext}`;
    cb(null, newFilename);
  },
});

// 3. Configure Filter
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedExtensions = ['.csv', '.xlsx', '.xls', '.xlxs'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new AppError(`Unsupported file extension: ${ext}. Only .csv, .xlsx, .xls are allowed.`, 400));
  }
};

// 4. Export Multer instance
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB limit
  },
});
