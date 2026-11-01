import { PrismaClient } from '@prisma/client';
import * as xlsx from 'xlsx';
import path from 'path';
import { AppError } from '../../utils/AppError';
import { logger } from '../../logger';

const prisma = new PrismaClient();

interface RawMarketOpRow {
  Date?: string | Date;
  date?: string | Date;
  Timeblock?: string | number;
  timeblock?: string | number;
  'DAM MCP'?: string | number;
  dam_mcp?: string | number;
  'RTM MCP'?: string | number;
  rtm_mcp?: string | number;
  'GDAM MCP'?: string | number;
  gdam_mcp?: string | number;
  [key: string]: any;
}

export class MarketOperationsService {
  async getRecords(startDate?: string, endDate?: string) {
    try {
      // Build date filters for subqueries
      let dateFilterDam = '';
      let dateFilterRtm = '';
      let dateFilterGdam = '';
      
      if (startDate || endDate) {
        if (startDate && endDate) {
          dateFilterDam = `AND d."deliveryDate" >= '${new Date(startDate).toISOString()}'::date AND d."deliveryDate" <= '${new Date(endDate).toISOString()}'::date`;
          dateFilterRtm = `AND d."deliveryDate" >= '${new Date(startDate).toISOString()}'::date AND d."deliveryDate" <= '${new Date(endDate).toISOString()}'::date`;
          dateFilterGdam = `AND d."deliveryDate" >= '${new Date(startDate).toISOString()}'::date AND d."deliveryDate" <= '${new Date(endDate).toISOString()}'::date`;
        } else if (startDate) {
          dateFilterDam = `AND d."deliveryDate" >= '${new Date(startDate).toISOString()}'::date`;
          dateFilterRtm = `AND d."deliveryDate" >= '${new Date(startDate).toISOString()}'::date`;
          dateFilterGdam = `AND d."deliveryDate" >= '${new Date(startDate).toISOString()}'::date`;
        } else if (endDate) {
          dateFilterDam = `AND d."deliveryDate" <= '${new Date(endDate).toISOString()}'::date`;
          dateFilterRtm = `AND d."deliveryDate" <= '${new Date(endDate).toISOString()}'::date`;
          dateFilterGdam = `AND d."deliveryDate" <= '${new Date(endDate).toISOString()}'::date`;
        }
      }

      // We use Prisma.$queryRawUnsafe to inject dynamic strings for the date filters securely,
      // as they are parsed Dates converted to ISO strings.
      const query = `
        SELECT
            COALESCE(dam.date, rtm.date, gdam.date) AS date,
            COALESCE(dam.timeblock, rtm.timeblock, gdam.timeblock) AS timeblock,
            dam.mcp AS damMcp,
            rtm.mcp AS rtmMcp,
            gdam.mcp AS gdamMcp
        FROM
            (SELECT d."deliveryDate" as date, dr."intervalNumber" as timeblock, dr.mcp 
             FROM "DamRecord" dr 
             JOIN "Dataset" d ON dr."datasetId" = d.id 
             WHERE d.market = 'DAM' AND d.status = 'ACTIVE' ${dateFilterDam}) dam
        FULL OUTER JOIN
            (SELECT d."deliveryDate" as date, rr."intervalNumber" as timeblock, rr.mcp 
             FROM "RtmRecord" rr 
             JOIN "Dataset" d ON rr."datasetId" = d.id 
             WHERE d.market = 'RTM' AND d.status = 'ACTIVE' ${dateFilterRtm}) rtm
            ON dam.date = rtm.date AND dam.timeblock = rtm.timeblock
        FULL OUTER JOIN
            (SELECT d."deliveryDate" as date, gr."intervalNumber" as timeblock, gr.mcp 
             FROM "GdamRecord" gr 
             JOIN "Dataset" d ON gr."datasetId" = d.id 
             WHERE d.market = 'GDAM' AND d.status = 'ACTIVE' ${dateFilterGdam}
             UNION ALL
             SELECT d."deliveryDate" as date, gnr."intervalNumber" as timeblock, gnr.mcp 
             FROM "GdamNewRecord" gnr 
             JOIN "Dataset" d ON gnr."datasetId" = d.id 
             WHERE d.market = 'GDAM' AND d.status = 'ACTIVE' ${dateFilterGdam}) gdam
            ON COALESCE(dam.date, rtm.date) = gdam.date AND COALESCE(dam.timeblock, rtm.timeblock) = gdam.timeblock
        ORDER BY date DESC, timeblock ASC
        LIMIT 1000;
      `;

      const result: any[] = await prisma.$queryRawUnsafe(query);

      // Prisma raw query returns fields exactly as they are named in SELECT (damMcp, rtmMcp, etc.)
      return result.map((r, index) => ({
        id: `virtual-${index}`,
        date: r.date,
        timeblock: r.timeblock,
        damMcp: r.dammcp || 0,
        rtmMcp: r.rtmmcp || 0,
        gdamMcp: r.gdammcp || 0
      }));

    } catch (error) {
      logger.error('Error fetching dynamic market operations:', error);
      throw error;
    }
  }
}


