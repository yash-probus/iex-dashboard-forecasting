import { Request, Response } from 'express';
import { UpMarketService } from './up-market.service';

const upMarketService = new UpMarketService();

export class UpMarketController {
  async getMarketData(req: Request, res: Response) {
    try {
      const { market } = req.params; // 'dam' or 'rtm'
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ success: false, message: 'startDate and endDate are required' });
      }

      const marketStr = market as string;
      const marketLower = marketStr.toLowerCase();
      if (marketLower !== 'dam' && marketLower !== 'rtm' && marketLower !== 'gdam') {
        return res.status(400).json({ success: false, message: 'Invalid market type' });
      }

      const state = req.query.state as string | undefined;
      const marketType = marketStr.toUpperCase() as 'DAM' | 'RTM' | 'GDAM';
      const data = await upMarketService.getMarketData(marketType, startDate, endDate, state);
      
      if (data.intervals.length === 0) {
        return res.status(404).json({ success: false, message: 'No data found' });
      }
      
      res.status(200).json({
        success: true,
        data
      });
    } catch (error) {
      console.error('Error fetching UP Market data:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch UP Market data' });
    }
  }
}
