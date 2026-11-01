import { Request, Response } from 'express';
import { logger } from '../../logger';
import { ScraperService } from './scraper.service';
import { PersistenceService } from '../persistence/persistence.service';
import { AppError } from '../../utils/AppError';
import prisma from '../../config/prisma';
import { ApiLogService } from '../api-log/api-log.service';

export const triggerScraper = async (req: Request, res: Response) => {
  try {
    const { market } = req.body;
    
    if (!market || !['DAM', 'GDAM', 'RTM', 'REC'].includes(market)) {
      throw new AppError('Invalid market specified. Must be DAM, GDAM, RTM, or REC.', 400);
    }

    logger.info(`Manual scraper triggered for market: ${market}`);
    
    // Scrape Data
    let records: any[] = [];
    if (market === 'DAM') {
      records = await ScraperService.scrapeDam();
    } else if (market === 'GDAM') {
      records = await ScraperService.scrapeGdam();
    } else if (market === 'RTM') {
      records = await ScraperService.scrapeRtm();
    } else if (market === 'REC') {
      records = await ScraperService.scrapeRec();
    }
    
    if (records.length === 0) {
      throw new AppError('Scraper returned 0 records', 500);
    }

    // Persist Data using the existing PersistenceService
    // We'll use the current date as the delivery date for the scraped data
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const dateStr = formatter.format(new Date());
    const [year, month, day] = dateStr.split('-').map(Number);
    const deliveryDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

    const existing = await prisma.dataset.findFirst({
      where: { market: market, deliveryDate, status: 'ACTIVE' }
    });

    const dataset = await PersistenceService.persistDataset({
      market: market,
      deliveryDate,
      fileName: `scraped_${market.toLowerCase()}_${dateStr}.csv`,
      records,
      action: existing ? 'replace' : undefined // Auto-replace if it already exists for today, else insert
    });

    await ApiLogService.createLog(`IEX ${market} Scraper`, `https://www.iexindia.com/market-data/${market.toLowerCase()}`, 'SUCCESS', `Successfully scraped and saved ${records.length} records for ${market} (manual trigger)`);

    res.status(200).json({
      success: true,
      message: `Successfully scraped and saved ${records.length} records for ${market}`,
      datasetId: dataset.id
    });
    
  } catch (error: any) {
    logger.error(`Scraper Controller Error: ${error.message}`);
    const marketStr = req.body?.market || 'Unknown';
    await ApiLogService.createLog(`IEX ${marketStr} Scraper`, 'manual-trigger', 'ERROR', error.message || String(error));
    throw error;
  }
};

export const importScrapedData = async (req: Request, res: Response) => {
  const config = require('../../config').default;
  const token = req.headers['x-webhook-token'];
  if (!token || token !== config.webhookSecret) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const { type, payload } = req.body;
  if (!type || !payload) {
    return res.status(400).json({ success: false, message: 'Missing type or payload' });
  }

  logger.info(`[Webhook Import] Received event: ${type}`);

  try {
    if (type === 'dataset') {
      const { market, deliveryDate, fileName, records, action } = payload;
      const parsedDeliveryDate = new Date(deliveryDate);
      
      const existing = await prisma.dataset.findFirst({
        where: { market, deliveryDate: parsedDeliveryDate, status: 'ACTIVE' }
      });

      const dataset = await PersistenceService.persistDataset({
        market,
        deliveryDate: parsedDeliveryDate,
        fileName,
        records,
        action: existing ? 'replace' : action,
        isWebhookImport: true
      });

      logger.success(`[Webhook Import] Successfully imported dataset for ${market} on ${deliveryDate}`);
      return res.status(200).json({ success: true, datasetId: dataset.id });
    }
    
    if (type === 'state-demand') {
      const { records } = payload;
      if (records && records.length > 0) {
        await prisma.stateDemandData.createMany({
          data: records,
          skipDuplicates: true
        });
        logger.success(`[Webhook Import] Successfully imported ${records.length} state-demand records`);
        return res.status(200).json({ success: true, count: records.length });
      }
      return res.status(200).json({ success: true, count: 0 });
    }

    if (type === 'state-market-records') {
      const { market, area, deliveryDate, records } = payload;
      const parsedDeliveryDate = new Date(deliveryDate);
      
      let successCount = 0;
      for (let i = 0; i < records.length; i++) {
        const row = records[i];
        if (!row) continue;

        await prisma.stateMarketRecord.upsert({
          where: {
            market_area_deliveryDate_intervalNumber: {
              market,
              area,
              deliveryDate: parsedDeliveryDate,
              intervalNumber: i + 1
            }
          },
          update: {
            purchaseBid: row.purchaseBid,
            sellBid: row.sellBid,
            clearedVolume: row.mcv,
            price: row.mcp,
            intervalTime: row.timePeriod?.split(' - ')[0]?.trim() || row.timePeriod?.split('-')[0]?.trim() || row.timePeriod || row.intervalTime
          },
          create: {
            market,
            area,
            deliveryDate: parsedDeliveryDate,
            intervalNumber: i + 1,
            intervalTime: row.timePeriod?.split(' - ')[0]?.trim() || row.timePeriod?.split('-')[0]?.trim() || row.timePeriod || row.intervalTime,
            purchaseBid: row.purchaseBid,
            sellBid: row.sellBid,
            clearedVolume: row.mcv,
            price: row.mcp
          }
        });
        successCount++;
      }
      logger.success(`[Webhook Import] Successfully imported ${successCount} state-market-records for ${area} (${market})`);
      return res.status(200).json({ success: true, count: successCount });
    }

    return res.status(400).json({ success: false, message: `Unknown import event type: ${type}` });
  } catch (error: any) {
    logger.error(`[Webhook Import Error]: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
};
