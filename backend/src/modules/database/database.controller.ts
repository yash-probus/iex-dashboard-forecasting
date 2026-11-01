import { Request, Response } from 'express';
import { DatabaseService } from './database.service';
import { HolidayService } from './holiday.service';

const databaseService = new DatabaseService();
const holidayService = new HolidayService();

export class DatabaseController {
  async getDemandData(req: Request, res: Response) {
    try {
      const date = req.query.date as string;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const time = req.query.time as string;
      
      const [allIndiaDemand, stateWiseDemand] = await Promise.all([
        databaseService.getAllIndiaDemand(startDate || date, endDate || date),
        databaseService.getStateWiseDemand(date, time)
      ]);

      res.status(200).json({
        success: true,
        data: {
          allIndiaDemand,
          stateWiseDemand
        }
      });
    } catch (error) {
      console.error('Error fetching demand data:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch demand data' });
    }
  }

  async getGenerationData(req: Request, res: Response) {
    try {
      const date = req.query.date as string;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      
      const generationData = await databaseService.getGenerationData(startDate || date, endDate || date);

      res.status(200).json({
        success: true,
        data: generationData
      });
    } catch (error) {
      console.error('Error fetching generation data:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch generation data' });
    }
  }

  async getWeatherData(req: Request, res: Response) {
    try {
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      const type = req.query.type as string | undefined;
      const latitude = req.query.latitude as string | undefined;
      const longitude = req.query.longitude as string | undefined;
      const weatherData = await databaseService.getWeatherData(startDate, endDate, type, latitude, longitude);
      res.status(200).json({
        success: true,
        data: weatherData
      });
    } catch (error) {
      console.error('Error fetching weather data:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch weather data' });
    }
  }

  async exportCSV(req: Request, res: Response) {
    try {
      const { dataset, startDate, endDate } = req.query as { dataset: string, startDate: string, endDate: string };
      
      if (!dataset) {
        return res.status(400).json({ success: false, message: 'Missing dataset parameter' });
      }

      if (dataset === 'city_state') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="state_and_city_export.csv"`);
        await databaseService.exportCityStateAsCsvStream(res);
        res.end();
        return;
      }

      if (!startDate || !endDate) {
        return res.status(400).json({ success: false, message: 'Missing startDate or endDate' });
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${dataset}_export_${startDate}_to_${endDate}.csv"`);

      await databaseService.exportDataAsCsvStream(dataset, startDate, endDate, res);
      
      res.end();
    } catch (error) {
      console.error('Error exporting CSV:', error);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Failed to export data' });
      } else {
        res.end();
      }
    }
  }

  async getHolidays(req: Request, res: Response) {
    try {
      const holidays = await holidayService.getHolidays();
      res.status(200).json({ success: true, data: holidays });
    } catch (error) {
      console.error('Error fetching holidays:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch holiday calendar' });
    }
  }

  async createHoliday(req: Request, res: Response) {
    try {
      const data = req.body;
      const holiday = await holidayService.createHoliday(data);
      res.status(201).json({ success: true, data: holiday });
    } catch (error) {
      console.error('Error creating holiday:', error);
      res.status(500).json({ success: false, message: 'Failed to create holiday' });
    }
  }

  async uploadHolidays(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }
      const result = await holidayService.uploadHolidays(req.file.path, req.file.originalname);
      res.status(200).json(result);
    } catch (error: any) {
      console.error('Error uploading holidays:', error);
      res.status(error.statusCode || 500).json({ 
        success: false, 
        message: error.message || 'Failed to upload holiday calendar' 
      });
    }
  }

  async getCityStateData(req: Request, res: Response) {
    try {
      const data = await databaseService.getCityStateData();
      res.status(200).json({ success: true, data });
    } catch (error) {
      console.error('Error fetching city state data:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch city state data' });
    }
  }

  async createCityStateData(req: Request, res: Response) {
    try {
      const { cityName, stateName, population, latitude, longitude } = req.body;
      if (!cityName || !stateName || population == null || latitude == null || longitude == null) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
      }
      const data = await databaseService.createCityStateData({
        cityName: String(cityName).trim(),
        stateName: String(stateName).trim(),
        population: parseInt(population, 10),
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      });
      res.status(201).json({ success: true, data });
    } catch (error: any) {
      console.error('Error creating city state data:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to create city state data' });
    }
  }

  async updateHoliday(req: Request, res: Response) {
    try {
      const { id } = req.params as { id: string };
      const { month, holidayDate, holidayName, holidayType, state, isActive } = req.body;
      const updated = await holidayService.updateHoliday(id, { month, holidayDate, holidayName, holidayType, state, isActive });
      res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
      console.error('Error updating holiday:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to update holiday' });
    }
  }

  async toggleHoliday(req: Request, res: Response) {
    try {
      const { id } = req.params as { id: string };
      const updated = await holidayService.toggleHoliday(id);
      res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
      console.error('Error toggling holiday:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to toggle holiday' });
    }
  }
}
