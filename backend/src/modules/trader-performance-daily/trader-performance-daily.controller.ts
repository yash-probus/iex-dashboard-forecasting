import { Request, Response } from 'express';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { TraderPerformanceDailyService } from './trader-performance-daily.service';

export const uploadDailyTradeReports = async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const scriptPath = path.join(__dirname, '../../../scripts/parse_trade_report.py');
    const filePaths = files.map(f => f.path);
    const venvPythonPath = path.join(__dirname, '../../../venv/bin/python');
    const pythonExecutable = fs.existsSync(venvPythonPath) ? venvPythonPath : 'python3';

    const pythonProcess = spawn(pythonExecutable, [scriptPath, ...filePaths]);

    let dataString = '';
    let errorString = '';

    pythonProcess.stdout.on('data', (data) => {
      dataString += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorString += data.toString();
    });

    pythonProcess.on('close', (code) => {
      // Clean up uploaded physical files immediately - do not store raw PDFs
      filePaths.forEach(fp => {
        try {
          if (fs.existsSync(fp)) fs.unlinkSync(fp);
        } catch (e) {
          console.warn('Failed to delete temp PDF:', fp, e);
        }
      });

      if (code !== 0) {
        return res.status(500).json({ success: false, message: errorString || 'PDF parsing failed' });
      }

      try {
        const result = JSON.parse(dataString);
        return res.status(200).json({ success: true, data: result });
      } catch (err) {
        return res.status(500).json({ success: false, message: 'Invalid JSON response from parser script' });
      }
    });
  } catch (error: any) {
    console.error('Error in uploadDailyTradeReports:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
};

export class TraderPerformanceDailyController {
  static async getAvailableMeters(req: Request, res: Response) {
    try {
      const meters = await TraderPerformanceDailyService.getAvailableMeters();
      return res.status(200).json({ success: true, data: meters });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getConsumers(req: Request, res: Response) {
    try {
      const consumers = await TraderPerformanceDailyService.getConsumers();
      return res.status(200).json({ success: true, data: consumers });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async saveConsumer(req: Request, res: Response) {
    try {
      const consumer = await TraderPerformanceDailyService.saveConsumer(req.body);
      return res.status(200).json({ success: true, data: consumer });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getDailyAnalysis(req: Request, res: Response) {
    try {
      const { consumerId, monthStr, targetDate } = req.query;
      const analysis = await TraderPerformanceDailyService.calculateDailyAnalysis({
        consumerId: consumerId ? String(consumerId) : 'poorvanchal-default',
        monthStr: monthStr ? String(monthStr) : undefined,
        targetDate: targetDate ? String(targetDate) : undefined,
        uploadedReports: req.body?.tradeReports
      });
      return res.status(200).json({ success: true, data: analysis });
    } catch (error: any) {
      console.error('Error in getDailyAnalysis:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}
