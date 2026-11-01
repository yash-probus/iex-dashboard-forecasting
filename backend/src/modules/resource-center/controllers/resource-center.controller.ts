import { Request, Response } from 'express';
import { asyncHandler } from '../../../middleware/asyncHandler';
import { isValidResourceType, ResourceType } from '../types/resource-center.types';
import { AppError } from '../../../utils/AppError';
import * as resourceCenterService from '../services/resource-center.service';
import { validatePayload } from '../validators/resource-center.validator';

/**
 * Controller for Resource Center endpoints.
 * POST, PUT, DELETE strictly return 501 Not Implemented during Phase 2.
 */

export const getResourceData = asyncHandler(async (req: Request, res: Response) => {
  const { resourceType } = req.params;
  
  if (!isValidResourceType(resourceType)) {
    throw new AppError('Unsupported resource type', 400);
  }

  const data = await resourceCenterService.getResourceData(resourceType as ResourceType);
  
  res.status(200).json({
    success: true,
    data
  });
});

export const createResourceRecord = asyncHandler(async (req: Request, res: Response) => {
  const { resourceType } = req.params;
  
  if (!isValidResourceType(resourceType)) {
    throw new AppError('Unsupported resource type', 400);
  }

  const validData = validatePayload(resourceType as ResourceType, req.body);
  if (!validData) {
    throw new AppError('Payload cannot be empty', 400);
  }
  const data = await resourceCenterService.createResourceRecord(resourceType as ResourceType, validData);

  res.status(201).json({
    success: true,
    message: 'Record created successfully',
    data
  });
});
export const createBulkResourceRecords = asyncHandler(async (req: Request, res: Response) => {
  const { resourceType } = req.params;
  
  if (!isValidResourceType(resourceType)) {
    throw new AppError('Unsupported resource type', 400);
  }

  if (!Array.isArray(req.body)) {
    throw new AppError('Payload must be an array of records', 400);
  }

  const validDataArray = req.body
    .map(record => validatePayload(resourceType as ResourceType, record))
    .filter(record => record !== null);
  
  const result = await resourceCenterService.createBulkResourceRecords(resourceType as ResourceType, validDataArray);

  res.status(201).json({
    success: true,
    message: `Bulk uploaded ${validDataArray.length} records successfully`,
    data: result
  });
});

export const updateResourceRecord = asyncHandler(async (req: Request, res: Response) => {
  const { resourceType, id } = req.params;
  
  if (!isValidResourceType(resourceType)) {
    throw new AppError('Unsupported resource type', 400);
  }

  const numId = parseInt(id as string, 10);
  if (isNaN(numId) || numId <= 0) {
    throw new AppError('Invalid ID format', 400);
  }

  // Option A chosen from plan: allow update even if no changes
  const validData = validatePayload(resourceType as ResourceType, req.body);
  if (!validData) {
    throw new AppError('Payload cannot be empty', 400);
  }
  const data = await resourceCenterService.updateResourceRecord(resourceType as ResourceType, numId, validData);

  res.status(200).json({
    success: true,
    message: 'Record updated successfully',
    data
  });
});

export const deleteResourceRecord = asyncHandler(async (req: Request, res: Response) => {
  const { resourceType, id } = req.params;
  
  if (!isValidResourceType(resourceType)) {
    throw new AppError('Unsupported resource type', 400);
  }

  const numId = parseInt(id as string, 10);
  if (isNaN(numId) || numId <= 0) {
    throw new AppError('Invalid ID format', 400);
  }

  await resourceCenterService.deleteResourceRecord(resourceType as ResourceType, numId);

  res.status(200).json({
    success: true,
    message: 'Record deleted successfully'
  });
});
