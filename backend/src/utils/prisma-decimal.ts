import { Prisma } from '@prisma/client';

/**
 * Utility to safely convert a number or string into a Prisma.Decimal.
 * Keeps transformation engine typed to primitives and centralizes database conversions.
 */
export const toDecimal = (val: number | string): Prisma.Decimal => {
  return new Prisma.Decimal(val);
};
