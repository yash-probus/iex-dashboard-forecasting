import { Prisma } from '@prisma/client';

export type DamDbPayload = Prisma.DamRecordCreateManyInput;
export type GdamDbPayload = Prisma.GdamRecordCreateManyInput;
export type GdamNewDbPayload = Prisma.GdamNewRecordCreateManyInput;
export type RtmDbPayload = Prisma.RtmRecordCreateManyInput;
export type RecDbPayload = Prisma.RecRecordCreateManyInput;

export interface PersistDatasetParams {
  market: 'DAM' | 'GDAM' | 'RTM' | 'REC';
  deliveryDate: Date;
  fileName: string;
  records: unknown[]; // Raw interval objects mapped from the transformation engine
  action?: string;
  isWebhookImport?: boolean;
}
