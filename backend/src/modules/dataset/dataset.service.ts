import prisma from '../../config/prisma';
import { Prisma } from '@prisma/client';

export class DatasetService {
  /**
   * Fetch paginated and filtered datasets
   */
  public static async getDatasets(query: any) {
    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.DatasetWhereInput = {};

    if (query.market) where.market = query.market as any;
    if (query.status) where.status = query.status as any;
    if (query.fileName) where.fileName = { contains: query.fileName as string, mode: 'insensitive' };
    
    // Simple exact date filter if provided
    if (query.deliveryDate) {
      where.deliveryDate = new Date(query.deliveryDate as string);
    }

    const orderBy: Prisma.DatasetOrderByWithRelationInput = {};
    const sortBy = query.sortBy as string || 'deliveryDate';
    const sortOrder = query.sortOrder as string === 'asc' ? 'asc' : 'desc';
    
    // Map sortBy safely
    if (['deliveryDate', 'uploadedAt', 'createdAt', 'status', 'market'].includes(sortBy)) {
      (orderBy as any)[sortBy] = sortOrder;
    } else {
      orderBy.deliveryDate = 'desc';
    }

    const [datasets, total] = await Promise.all([
      prisma.dataset.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          market: true,
          deliveryDate: true,
          status: true,
          fileName: true,
          uploadedAt: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      prisma.dataset.count({ where })
    ]);

    return {
      data: datasets,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get specific dataset by ID with basic stats
   */
  public static async getDatasetById(id: string) {
    const dataset = await prisma.dataset.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            damRecords: true,
            gdamRecords: true,
            gdamNewRecords: true,
            rtmRecords: true,
            uploadHistory: true
          }
        }
      }
    });
    return dataset;
  }

  /**
   * Dataset Summary Analytics (Deliverable 2A)
   */
  public static async getSummary() {
    const [total, active, replaced, deleted, historyTotal, latestUpload] = await Promise.all([
      prisma.dataset.count(),
      prisma.dataset.count({ where: { status: 'ACTIVE' } }),
      prisma.dataset.count({ where: { status: 'REPLACED' } }),
      prisma.dataset.count({ where: { status: 'DELETED' } }),
      prisma.uploadHistory.count(),
      prisma.uploadHistory.findFirst({
        orderBy: { timestamp: 'desc' },
        select: { timestamp: true }
      })
    ]);

    return {
      totalDatasets: total,
      activeDatasets: active,
      replacedDatasets: replaced,
      deletedDatasets: deleted,
      totalUploadHistoryRecords: historyTotal,
      latestUploadTimestamp: latestUpload?.timestamp || null
    };
  }

  /**
   * Get paginated Upload History
   */
  public static async getUploadHistory(query: any) {
    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.UploadHistoryWhereInput = {};

    if (query.market) where.market = query.market as any;
    if (query.action) where.action = query.action as any;
    if (query.datasetId) where.datasetId = query.datasetId as string;
    if (query.deliveryDate) where.deliveryDate = new Date(query.deliveryDate as string);

    const orderBy: Prisma.UploadHistoryOrderByWithRelationInput = {};
    const sortBy = query.sortBy as string || 'timestamp';
    const sortOrder = query.sortOrder as string === 'asc' ? 'asc' : 'desc';
    
    if (['timestamp', 'deliveryDate', 'market', 'action'].includes(sortBy)) {
      (orderBy as any)[sortBy] = sortOrder;
    } else {
      orderBy.timestamp = 'desc';
    }

    const [history, total] = await Promise.all([
      prisma.uploadHistory.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      prisma.uploadHistory.count({ where })
    ]);

    return {
      data: history,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get upload history for a specific dataset
   */
  public static async getDatasetHistory(datasetId: string) {
    return prisma.uploadHistory.findMany({
      where: { datasetId },
      orderBy: { timestamp: 'asc' }
    });
  }
}
