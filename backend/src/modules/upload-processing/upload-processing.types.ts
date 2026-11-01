import { MarketType } from '../upload/upload.types';

export interface ParserResult {
  success: boolean;
  rowCount: number; // Number of valid parsed data rows
  headers: string[]; // Normalized headers
  market: MarketType;
  records?: Record<string, string>[]; // Raw validated rows
  error?: string; // Metadata explaining why parsing failed
}

export interface IParser {
  parse(filePath: string): Promise<ParserResult>;
}

// Utility to normalize header strings
export const normalizeHeader = (header: any): string => {
  if (header === undefined || header === null) return '';
  
  // Safely convert any type (numbers, booleans, objects) to string
  const strHeader = String(header);
  
  return strHeader
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove hidden zero-width unicode characters
    .replace(/\*/g, '') // Remove trailing/leading asterisks common in IEX exports
    .trim()
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .toLowerCase();
};
