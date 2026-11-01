import { Request, Response } from 'express';
import { MarketOperationsService } from './market-operations.service';

const marketOpsService = new MarketOperationsService();

export class MarketOperationsController {
  async getRecords(req: Request, res: Response) {
    try {
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      
      const data = await marketOpsService.getRecords(startDate, endDate);
      
      res.status(200).json({
        success: true,
        data
      });
    } catch (error) {
      console.error('Error fetching market operations data:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch market operations data' });
    }
  }
}
