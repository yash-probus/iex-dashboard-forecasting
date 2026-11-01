import { Request, Response } from 'express';
import { logger } from '../../logger';
import { PersistenceService } from '../persistence/persistence.service';
import { DatasetService } from './dataset.service';
import { AppError } from '../../utils/AppError';

// existing deleteDataset
export const deleteDataset = async (req: Request, res: Response) => {
  const datasetId = req.params.datasetId as string;
  logger.info(`Received API request to delete dataset ${datasetId}`);
  await PersistenceService.deleteDataset(datasetId);
  logger.success(`Successfully processed deletion for dataset ${datasetId}`);
  res.status(200).json({ success: true, message: 'Dataset deleted successfully' });
};

export const getDatasets = async (req: Request, res: Response) => {
  const result = await DatasetService.getDatasets(req.query);
  res.status(200).json({ success: true, ...result });
};

export const getDatasetSummary = async (req: Request, res: Response) => {
  const data = await DatasetService.getSummary();
  res.status(200).json({ success: true, data });
};

export const getDatasetById = async (req: Request, res: Response) => {
  const datasetId = req.params.datasetId as string;
  const data = await DatasetService.getDatasetById(datasetId);
  if (!data) throw new AppError('Dataset not found', 404);
  res.status(200).json({ success: true, data });
};

export const getUploadHistory = async (req: Request, res: Response) => {
  const result = await DatasetService.getUploadHistory(req.query);
  res.status(200).json({ success: true, ...result });
};

export const getDatasetHistory = async (req: Request, res: Response) => {
  const datasetId = req.params.datasetId as string;
  const data = await DatasetService.getDatasetHistory(datasetId);
  res.status(200).json({ success: true, data });
};
