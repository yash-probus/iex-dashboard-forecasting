import { Request, Response } from 'express';
import { ForecastService } from './forecast.service';

export class ForecastController {
  public static async getPriceForecast(req: Request, res: Response) {
    try {
      const market = (req.query.market as string) || 'dam';
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const interval = (req.query.interval as string) || '15min';
      const model = (req.query.model as string) || 'Model1';

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Both startDate and endDate are required parameters.'
        });
      }

      const result = await ForecastService.getPriceForecast(market, startDate, endDate, interval, model);
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error('[ForecastController] Error in getPriceForecast:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch price forecast.'
      });
    }
  }

  public static async getDemandForecast(req: Request, res: Response) {
    try {
      const type = (req.query.type as string) || 'all-india';
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const interval = (req.query.interval as string) || '15min';
      const meterNo = req.query.meterNo as string | undefined;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Both startDate and endDate are required parameters.'
        });
      }

      const result = await ForecastService.getDemandForecast(type, startDate, endDate, interval, meterNo);
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error('[ForecastController] Error in getDemandForecast:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch demand forecast.'
      });
    }
  }

  public static async getGenerationForecast(req: Request, res: Response) {
    try {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const interval = (req.query.interval as string) || '15min';
      const model = (req.query.model as string) || 'Model1';

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Both startDate and endDate are required parameters.'
        });
      }

      const result = await ForecastService.getGenerationForecast(startDate, endDate, interval, model);
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error('[ForecastController] Error in getGenerationForecast:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch generation forecast.'
      });
    }
  }

  public static async getForecastDates(req: Request, res: Response) {
    try {
      const market = (req.query.market as string) || 'dam';
      const result = await ForecastService.getForecastDates(market);
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error('[ForecastController] Error in getForecastDates:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch available forecast dates.'
      });
    }
  }

  public static async getMeters(req: Request, res: Response) {
    try {
      const result = await ForecastService.getMeters();
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error('[ForecastController] Error in getMeters:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch meters.'
      });
    }
  }

  public static async getMarketSelectionForecast(req: Request, res: Response) {
    try {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Both startDate and endDate are required parameters.'
        });
      }

      const result = await ForecastService.getMarketSelectionForecast(startDate, endDate);
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error('[ForecastController] Error in getMarketSelectionForecast:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch market selection forecast.'
      });
    }
  }
}
