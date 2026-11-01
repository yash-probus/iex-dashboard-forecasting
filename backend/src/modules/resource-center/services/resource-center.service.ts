import { Prisma } from '@prisma/client';
import { ResourceType } from '../types/resource-center.types';
import { RESOURCE_REGISTRY } from '../constants/resource-center.constants';
import prisma from '../../../config/prisma';
import { AppError } from '../../../utils/AppError';
import { AuditLogService } from '../../../services/audit-log.service';

/**
 * Service mapping for Resource Center DB operations.
 */

export const getResourceData = async (resourceType: ResourceType) => {
  const tableInfo = RESOURCE_REGISTRY[resourceType];
  if (!tableInfo || !tableInfo.modelName) {
    throw new Error(`Model mapping not found for resource type: ${resourceType}`);
  }
  
  // @ts-ignore - dynamic prisma model access
  const delegate = prisma[tableInfo.modelName];
  if (!delegate) {
    throw new Error(`Prisma delegate not found for model: ${tableInfo.modelName}`);
  }

  const data = await (delegate as any).findMany({
    orderBy: { id: 'asc' }
  });

  // Convert Prisma.Decimal to native JS numbers for frontend serialization
  const serializeDecimals = (obj: any): any => {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'object') {
      if (Prisma.Decimal.isDecimal(obj)) {
        return obj.toNumber();
      }
      if (Array.isArray(obj)) {
        return obj.map(serializeDecimals);
      }
      if (obj instanceof Date) {
        return obj.toISOString();
      }
      const newObj: any = {};
      for (const key in obj) {
        newObj[key] = serializeDecimals(obj[key]);
      }
      return newObj;
    }
    return obj;
  };

  return serializeDecimals(data);
};

// Helper to strip state brackets from Discoms (e.g. "NPCL (Uttar Pradesh)" -> "NPCL")
const sanitizePayload = (payload: any) => {
  if (payload && typeof payload.discom === 'string') {
    payload = {
      ...payload,
      discom: payload.discom.replace(/\s*\(.*\)\s*/g, '').trim(),
    };
  }
  return payload;
};

// Check for date overlaps in state-charges and ists-charges
const checkDateOverlaps = async (resourceType: ResourceType, delegate: any, payloads: any[]) => {
  if (resourceType !== 'state-charges' && resourceType !== 'ists-charges') return;

  const isStateCharges = resourceType === 'state-charges';
  const startField = isStateCharges ? 'fromDate' : 'startDate';
  const endField = isStateCharges ? 'toDate' : 'endDate';

  const getGroupKey = (p: any) => {
    if (isStateCharges) {
      return `${p.state || ''}_${p.discom || ''}_${p.category || ''}_${p.subCategory || ''}_${p.supplyVoltageCategory || ''}_${p.voltageLevel || ''}`;
    }
    return 'global';
  };

  // 1. Check overlaps within payloads
  for (let i = 0; i < payloads.length; i++) {
    const p1 = payloads[i];
    const s1 = p1[startField] ? new Date(p1[startField]).getTime() : 0;
    const e1 = p1[endField] ? new Date(p1[endField]).getTime() : 0;
    if (!s1 || !e1) continue;

    for (let j = i + 1; j < payloads.length; j++) {
      const p2 = payloads[j];
      if (getGroupKey(p1) !== getGroupKey(p2)) continue;
      
      const s2 = p2[startField] ? new Date(p2[startField]).getTime() : 0;
      const e2 = p2[endField] ? new Date(p2[endField]).getTime() : 0;
      if (!s2 || !e2) continue;

      if (s1 <= e2 && s2 <= e1) {
        throw new AppError(`Overlap detected within upload data for dates`, 400);
      }
    }
  }

  // 2. Check overlaps against DB
  const existingRecords = await delegate.findMany();
  
  for (const p1 of payloads) {
    const s1 = p1[startField] ? new Date(p1[startField]).getTime() : 0;
    const e1 = p1[endField] ? new Date(p1[endField]).getTime() : 0;
    if (!s1 || !e1) continue;

    for (const p2 of existingRecords) {
      if (p1.id && p1.id === p2.id) continue;
      if (getGroupKey(p1) !== getGroupKey(p2)) continue;

      const s2 = p2[startField] ? new Date(p2[startField]).getTime() : 0;
      const e2 = p2[endField] ? new Date(p2[endField]).getTime() : 0;
      if (!s2 || !e2) continue;

      if (s1 <= e2 && s2 <= e1) {
        throw new AppError(`Overlap detected with existing record for dates`, 400);
      }
    }
  }
};

export const createResourceRecord = async (resourceType: ResourceType, payload: any) => {
  payload = sanitizePayload(payload);
  const tableInfo = RESOURCE_REGISTRY[resourceType];
  const delegate = prisma[tableInfo.modelName as keyof typeof prisma];

  await checkDateOverlaps(resourceType, delegate, [payload]);

  try {
    const created = await (delegate as any).create({
      data: payload
    });
    await AuditLogService.logAction(tableInfo.modelName, created.id, 'CREATE', null, created);
    return created;
  } catch (error: any) {
    if (error.code === 'P2002') {
      throw new AppError('Record already exists (Duplicate Conflict)', 409);
    }
    throw error;
  }
};
export const createBulkResourceRecords = async (resourceType: ResourceType, payloadArray: any[]) => {
  const tableInfo = RESOURCE_REGISTRY[resourceType];
  const delegate = prisma[tableInfo.modelName as keyof typeof prisma];

  const sanitizedPayloads = payloadArray.map(sanitizePayload);
  await checkDateOverlaps(resourceType, delegate, sanitizedPayloads);

  try {
    const operations = sanitizedPayloads.map((payload) => {
      if (payload.id) {
        const { id, ...dataToUpdate } = payload;
        return (delegate as any).upsert({
          where: { id: Number(id) },
          update: dataToUpdate,
          create: payload,
        });
      } else {
        return (delegate as any).create({
          data: payload,
        });
      }
    });

    const created = await prisma.$transaction(operations);
    return created;
  } catch (error: any) {
    if (error.code === 'P2002') {
      throw new AppError('Record already exists (Duplicate Conflict)', 409);
    }
    throw error;
  }
};

export const updateResourceRecord = async (resourceType: ResourceType, id: number, payload: any) => {
  payload = sanitizePayload(payload);
  const tableInfo = RESOURCE_REGISTRY[resourceType];
  const delegate = prisma[tableInfo.modelName as keyof typeof prisma];

  // 1. Verify record exists
  const existing = await (delegate as any).findUnique({ where: { id } });

  if (!existing) {
    throw new AppError('Record not found', 404);
  }

  const mergedPayload = { ...existing, ...payload };
  await checkDateOverlaps(resourceType, delegate, [mergedPayload]);

  // 2. Update
  try {
    const updated = await (delegate as any).update({
      where: { id },
      data: payload
    });
    await AuditLogService.logAction(tableInfo.modelName, id, 'UPDATE', existing, updated);
    return updated;
  } catch (error: any) {
    if (error.code === 'P2002') {
      throw new AppError('Record already exists (Duplicate Conflict)', 409);
    }
    throw error;
  }
};

export const deleteResourceRecord = async (resourceType: ResourceType, id: number) => {
  const tableInfo = RESOURCE_REGISTRY[resourceType];
  const delegate = prisma[tableInfo.modelName as keyof typeof prisma];

  // 1. Verify record exists
  const existing = await (delegate as any).findUnique({ where: { id } });

  if (!existing) {
    throw new AppError('Record not found', 404);
  }

  // 2. Hard delete
  await (delegate as any).delete({ where: { id } });
  await AuditLogService.logAction(tableInfo.modelName, id, 'DELETE', existing, null);
  return true;
};
