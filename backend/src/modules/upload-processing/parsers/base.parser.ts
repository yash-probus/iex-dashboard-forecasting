import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import * as xlsx from 'xlsx';
import { MarketType } from '../../upload/upload.types';
import { IParser, ParserResult, normalizeHeader } from '../upload-processing.types';

export abstract class BaseParser implements IParser {
  protected abstract market: MarketType;
  protected abstract requiredHeaders: string[];
  protected maxRows: number = 200; // Default limit for daily files (DAM, RTM)

  // Subclasses must implement this to validate numeric rules on a row
  protected abstract validateRow(row: any): boolean;

  public async parse(filePath: string): Promise<ParserResult> {
    const ext = path.extname(filePath).toLowerCase();

    try {
      if (ext === '.csv') {
        return await this.parseCSV(filePath);
      } else if (ext === '.xlsx' || ext === '.xls' || ext === '.xlxs') {
        return this.parseXLSX(filePath);
      } else {
        return {
          success: false,
          rowCount: 0,
          headers: [],
          market: this.market,
          error: `Unsupported file extension: ${ext}`,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        rowCount: 0,
        headers: [],
        market: this.market,
        error: `Parsing failed: ${error.message}`,
      };
    }
  }

  private parseCSV(filePath: string): Promise<ParserResult> {
    return new Promise((resolve) => {
      let rowCount = 0;
      let headers: string[] = [];
      let headersValid = false;
      const records: Record<string, string>[] = [];
      
      const stream = fs.createReadStream(filePath);
      const csvStream = csv({ mapHeaders: ({ header }) => normalizeHeader(header) });

      stream
        .pipe(csvStream)
        .on('headers', (h: string[]) => {
          headers = h;
          // Validate headers immediately
          const missingHeaders = this.requiredHeaders.filter(
            (reqHeader) => !headers.includes(normalizeHeader(reqHeader))
          );

          if (missingHeaders.length > 0) {
            stream.destroy();
            resolve({
              success: false,
              rowCount: 0,
              headers,
              market: this.market,
              error: `Invalid market file structure. Missing headers: ${missingHeaders.join(', ')}`,
            });
            return;
          }
          headersValid = true;
        })
        .on('data', (data) => {
          if (!headersValid) return; // Ignore data if headers are bad

          if (rowCount > this.maxRows) {
            stream.destroy();
            resolve({
              success: false,
              rowCount,
              headers,
              market: this.market,
              error: `File is too large (found > ${this.maxRows} rows). Are you trying to upload a bulk/monthly archive? Please upload files within the row limit.`,
            });
            return;
          }

          // Check if row is completely empty
          const isEmpty = Object.values(data).every(
            (val) => val === undefined || val === null || String(val).trim() === ''
          );

          if (!isEmpty) {
            if (this.validateRow(data)) {
              rowCount++;
              records.push(data as Record<string, string>);
            } else {
              stream.destroy();
              resolve({
                success: false,
                rowCount,
                headers,
                market: this.market,
                error: `Corrupt or invalid data found at row ${rowCount + 1}`,
              });
            }
          }
        })
        .on('end', () => {
          if (headersValid) {
            if (rowCount > 0) {
              resolve({
                success: true,
                rowCount,
                headers,
                market: this.market,
                records
              });
            } else {
              resolve({
                success: false,
                rowCount: 0,
                headers,
                market: this.market,
                error: 'File contains no valid data rows.',
              });
            }
          }
        })
        .on('error', (err: any) => {
          resolve({
            success: false,
            rowCount: 0,
            headers: [],
            market: this.market,
            error: `CSV Stream Error: ${err.message}`,
          });
        });
    });
  }

  private parseXLSX(filePath: string): ParserResult {
    const workbook = xlsx.readFile(filePath);

    // Pick first non-empty worksheet
    let sheetName = workbook.SheetNames[0];
    for (const name of workbook.SheetNames) {
      if (workbook.Sheets[name]['!ref']) {
        sheetName = name;
        break;
      }
    }

    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet || !worksheet['!ref']) {
      return {
        success: false,
        rowCount: 0,
        headers: [],
        market: this.market,
        error: 'File contains no valid data sheets or is completely empty.',
      };
    }

    // Convert sheet to JSON array
    const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (rawData.length === 0) {
      return {
        success: false,
        rowCount: 0,
        headers: [],
        market: this.market,
        error: 'File contains no data rows.',
      };
    }

    if (rawData.length > this.maxRows) {
      return {
        success: false,
        rowCount: rawData.length,
        headers: [],
        market: this.market,
        error: `File is too large (expected within ${this.maxRows} rows, but found ${rawData.length}). Please upload a valid file.`,
      };
    }

    // Generic Header Discovery Algorithm
    let headerRowIndex = -1;
    let discoveredHeaders: string[] = [];

    // Scan up to the first 20 rows
    const scanLimit = Math.min(20, rawData.length);
    for (let r = 0; r < scanLimit; r++) {
      const candidateRow = rawData[r] as any[];
      if (!candidateRow || candidateRow.length === 0) continue;

      // Extract and normalize candidate cells resiliently
      const candidateHeaders = candidateRow.map((cell) => normalizeHeader(cell));

      // Check if this row contains ALL required headers for this market
      const missingHeaders = this.requiredHeaders.filter(
        (reqHeader) => !candidateHeaders.includes(normalizeHeader(reqHeader))
      );

      if (missingHeaders.length === 0) {
        headerRowIndex = r;
        discoveredHeaders = candidateHeaders;
        console.log(`[BaseParser] Detected Header Row at Index: ${r}`);
        console.log(`[BaseParser] Normalized Headers: ${JSON.stringify(discoveredHeaders)}`);
        break; // Found the header row!
      }
    }

    if (headerRowIndex === -1) {
      // Fallback for debugging, map the first non-empty row to show what was missing
      const firstRow = (rawData.find((r: any) => r && r.length > 0) || []) as any[];
      const missing = this.requiredHeaders.filter(
        (req) => !firstRow.map(h => normalizeHeader(h)).includes(normalizeHeader(req))
      );
      return {
        success: false,
        rowCount: 0,
        headers: [],
        market: this.market,
        error: `Invalid market file structure. Missing headers: ${missing.join(', ')}`,
      };
    }

    const headers = discoveredHeaders;

    // Process Rows
    let rowCount = 0;
    const records: Record<string, string>[] = [];
    
    // Create an array of normalized objects mimicking csv-parser's output to share validation logic
    for (let i = headerRowIndex + 1; i < rawData.length; i++) {
      const rowArr = rawData[i] as any[];
      
      // Ignore fully blank rows
      const isEmpty = rowArr.every(
        (val) => val === undefined || val === null || String(val).trim() === ''
      );

      if (isEmpty) continue;

      // Construct object mapping normalized header to string value
      const rowObj: any = {};
      headers.forEach((header, index) => {
        rowObj[header] = String(rowArr[index] !== undefined ? rowArr[index] : '').trim();
      });

      // Detect Summary section to stop parsing
      // IEX files append summary stats at the bottom. If we hit them, parsing is complete.
      const isSummaryRow = rowArr.some((val) => {
        const strVal = String(val !== undefined ? val : '').trim().toLowerCase();
        return strVal === 'summary' || strVal === 'total (mwh)' || strVal === 'max (mw)' || strVal === 'min (mw)' || strVal === 'avg (mw)';
      });

      if (isSummaryRow) {
        console.log(`[BaseParser] Detected Summary section at row ${i + 1}. Stopping parsing.`);
        break;
      }

      if (this.validateRow(rowObj)) {
        rowCount++;
        records.push(rowObj);
      } else {
        return {
          success: false,
          rowCount,
          headers,
          market: this.market,
          error: `Corrupt or invalid data found at row ${i + 1}`,
        };
      }
    }

    if (rowCount === 0) {
      return {
        success: false,
        rowCount: 0,
        headers,
        market: this.market,
        error: 'File contains no valid data rows.',
      };
    }

    return {
      success: true,
      rowCount,
      headers,
      market: this.market,
      records
    };
  }

  // Utility to parse numbers safely
  protected parseNumberField(val: string): boolean {
    if (!val) return false;
    const num = Number(val);
    return !isNaN(num);
  }
}
