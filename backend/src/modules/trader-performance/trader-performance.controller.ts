import { Request, Response } from 'express';
import { spawn } from 'child_process';
import path from 'path';
import { TraderPerformanceService } from './trader-performance.service';

export const uploadTradeReports = async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const scriptPath = path.join(__dirname, '../../../scripts/parse_trade_report.py');
    const filePaths = files.map(f => f.path);
    const venvPythonPath = path.join(__dirname, '../../../venv/bin/python');
    const pythonExecutable = require('fs').existsSync(venvPythonPath) ? venvPythonPath : 'python3';

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
      filePaths.forEach(fp => {
        try { if (require('fs').existsSync(fp)) require('fs').unlinkSync(fp); } catch (e) {}
      });

      if (code !== 0) {
        return res.status(500).json({ success: false, message: errorString });
      }
      try {
        const result = JSON.parse(dataString);
        res.status(200).json(result);
      } catch (err) {
        res.status(500).json({ success: false, message: 'Invalid output from parser script' });
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export class TraderPerformanceController {
  static async getAll(req: Request, res: Response) {
    try {
      const entries = await TraderPerformanceService.getAll();
      return res.status(200).json({ success: true, data: entries });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const entry = await TraderPerformanceService.getById(req.params.id as string);
      if (!entry) return res.status(404).json({ success: false, message: 'Not found' });
      return res.status(200).json({ success: true, data: entry });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const entry = await TraderPerformanceService.create({ ...req.body, createdBy: req.user?.username });
      return res.status(201).json({ success: true, data: entry });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const entry = await TraderPerformanceService.update(req.params.id as string, { ...req.body, updatedBy: req.user?.username });
      return res.status(200).json({ success: true, data: entry });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      await TraderPerformanceService.delete(req.params.id as string);
      return res.status(200).json({ success: true, message: 'Deleted' });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getClientOverview(req: Request, res: Response) {
    try {
      const overview = await TraderPerformanceService.getClientOverview(req.params.id as string);
      return res.status(200).json({ success: true, data: overview });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async calculateSavings(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const targetMonth = req.query.month as string | undefined;
      const version = req.query.version ? parseInt(req.query.version as string, 10) : undefined;

      const result = await TraderPerformanceService.calculateSavings(id, targetMonth, version);
      return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async calculateMarketDecision(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const targetMonth = req.query.monthStr as string | undefined;
      const version = req.query.version ? parseInt(req.query.version as string, 10) : undefined;

      const result = await TraderPerformanceService.calculateMarketDecision(id, targetMonth, version);
      return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getHistory(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const history = await TraderPerformanceService.getHistory(id);
      return res.status(200).json({ success: true, data: history });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getDemandShiftInsights(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const targetMonth = req.query.targetMonth as string | undefined;
      const version = req.query.version ? parseInt(req.query.version as string, 10) : undefined;

      const result = await TraderPerformanceService.calculateDemandShiftInsights(id, targetMonth, version);
      return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async exportExcel(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const targetMonth = req.query.month as string | undefined;
      const version = req.query.version ? parseInt(req.query.version as string, 10) : undefined;
      
      const { TraderPerformanceExportService } = await import('./trader-performance.export');
      const buffer = await TraderPerformanceExportService.exportToExcel(id, targetMonth, version);
      
      const entry = await TraderPerformanceService.getEntryOrVersion(id, version);
      const safeName = (entry?.clientName || 'Client').replace(/[^a-zA-Z0-9_\-]/g, '_');
      const filename = `${safeName}_Trader_Performance${targetMonth ? `_${targetMonth}` : ''}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async exportActualTraderExcel(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const targetMonth = req.query.month as string | undefined;
      const version = req.query.version ? parseInt(req.query.version as string, 10) : undefined;
      
      const { TraderPerformanceExportService } = await import('./trader-performance.export');
      const buffer = await TraderPerformanceExportService.exportActualTraderToExcel(id, targetMonth, version);
      
      const entry = await TraderPerformanceService.getEntryOrVersion(id, version);
      const safeName = (entry?.clientName || 'Client').replace(/[^a-zA-Z0-9_\-]/g, '_');
      const filename = `${safeName}_Actual_Trader_Performance${targetMonth ? `_${targetMonth}` : ''}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async exportDemandShiftExcel(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const targetMonth = req.query.month as string | undefined;
      const version = req.query.version ? parseInt(req.query.version as string, 10) : undefined;
      
      const { TraderPerformanceExportService } = await import('./trader-performance.export');
      const buffer = await TraderPerformanceExportService.exportDemandShiftToExcel(id, targetMonth, version);
      
      const entry = await TraderPerformanceService.getEntryOrVersion(id, version);
      const safeName = (entry?.clientName || 'Client').replace(/[^a-zA-Z0-9_\-]/g, '_');
      const filename = `${safeName}_Demand_Shift${targetMonth ? `_${targetMonth}` : ''}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async getResourceDefaults(req: Request, res: Response) {
    try {
      const defaults = await TraderPerformanceService.getResourceDefaults(req.query as any);
      return res.status(200).json({ success: true, data: defaults });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}
