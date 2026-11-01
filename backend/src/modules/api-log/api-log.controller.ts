import { Request, Response } from 'express';
import { ApiLogService } from './api-log.service';

export class ApiLogController {
  static async getLogs(req: Request, res: Response) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      const apiName = req.query.apiName as string | undefined;

      const result = await ApiLogService.getLogs(page, limit, startDate, endDate, apiName);
      res.json(result);
    } catch (error) {
      console.error('[ApiLogController] Failed to fetch logs:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async getUniqueApiNames(req: Request, res: Response) {
    try {
      const names = await ApiLogService.getUniqueApiNames();
      res.json(names);
    } catch (error) {
      console.error('[ApiLogController] Failed to fetch unique API names:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  static async getStats(req: Request, res: Response) {
    try {
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      const apiName = req.query.apiName as string | undefined;

      const result = await ApiLogService.getStats(startDate, endDate, apiName);
      res.json(result);
    } catch (error) {
      console.error('[ApiLogController] Failed to fetch stats:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}
