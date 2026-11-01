import { PrismaClient } from '@prisma/client';
import prisma from '../config/prisma';

export class AuditLogService {
  static async logAction(
    tableName: string,
    recordId: string | number,
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    oldData?: any,
    newData?: any,
    userId?: string
  ) {
    try {
      await prisma.auditLog.create({
        data: {
          tableName,
          recordId: String(recordId),
          action,
          oldData: oldData ? JSON.parse(JSON.stringify(oldData)) : undefined,
          newData: newData ? JSON.parse(JSON.stringify(newData)) : undefined,
          userId,
        },
      });
    } catch (error) {
      console.error('[AuditLogService] Failed to write audit log:', error);
    }
  }
}
