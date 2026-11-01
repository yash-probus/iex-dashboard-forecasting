import prisma from '../../config/prisma';

export class ApiLogService {
  static async createLog(apiName: string, endpoint: string | null, status: 'SUCCESS' | 'ERROR', message?: string) {
    try {
      return await prisma.apiLog.create({
        data: {
          apiName,
          endpoint: endpoint ? endpoint.slice(0, 255) : null,
          status,
          details: message,
        },
      });
    } catch (error) {
      console.error(`[ApiLogService] Failed to create log for ${apiName}:`, error);
    }
  }

  static async getLogs(
    page: number = 1,
    limit: number = 100,
    startDate?: string,
    endDate?: string,
    apiName?: string
  ) {
    const where: any = {};
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    if (apiName) {
      where.apiName = apiName;
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prisma.apiLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.apiLog.count({ where }),
    ]);

    return { data, total };
  }

  static async getUniqueApiNames() {
    const distinctLogs = await prisma.apiLog.findMany({
      distinct: ['apiName'],
      select: { apiName: true },
    });
    return distinctLogs.map(log => log.apiName).filter(Boolean);
  }

  static async getStats(
    startDate?: string,
    endDate?: string,
    apiName?: string
  ) {
    const where: any = {};
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    if (apiName) {
      where.apiName = apiName;
    }

    const [total, success] = await Promise.all([
      prisma.apiLog.count({ where }),
      prisma.apiLog.count({ where: { ...where, status: 'SUCCESS' } }),
    ]);

    const error = total - success;
    const accuracy = total > 0 ? (success / total) * 100 : 100;

    return { total, success, error, accuracy };
  }
}
