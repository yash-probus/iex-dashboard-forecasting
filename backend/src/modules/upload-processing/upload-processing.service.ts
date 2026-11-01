import path from 'path';
import { MarketType } from '../upload/upload.types';
import { ParserFactory } from './parsers/parser.factory';
import { TransformationService } from '../transformation/transformation.service';
import { PersistenceService } from '../persistence/persistence.service';
import { AppError } from '../../utils/AppError';
import { logger } from '../../logger';

interface ProcessUploadParams {
  market: MarketType;
  deliveryDate: Date;
  filePath: string;
  fileName: string;
  action?: string;
}

export class UploadProcessingService {
  public static async processUpload(params: ProcessUploadParams) {
    const { market, deliveryDate, filePath, fileName, action } = params;

    // 1. Obtain correct parser and parse file
    logger.info(`Parser Selected: ${market}`);
    const parser = ParserFactory.getParser(market);
    
    // We expect parse to throw or return error objects if validation fails
    logger.info(`Upload Started: parsing ${fileName}...`);
    const parserResult = await parser.parse(filePath);

    if (!parserResult.success) {
      logger.warn(`Upload Failed during parsing: ${parserResult.error}`);
      throw new AppError(parserResult.error || 'Parsing failed', 400);
    }

    logger.info(`Headers Validated Successfully`);
    logger.info(`Rows Validated: ${parserResult.rowCount} rows parsed`);

    // 2. Transform the parsed data into strongly-typed interval records
    const transformationResult = TransformationService.transform(parserResult);

    if (!transformationResult.isValid) {
      logger.warn(`Transformation Failed: ${transformationResult.warnings.join(', ')}`);
      throw new AppError(`Data transformation failed: ${transformationResult.warnings[0]}`, 400);
    }

    // 3. Delegate to PersistenceService (Owns the Database Transaction)
    // The PersistenceService performs the active dataset duplicate check, replacement workflow, and creates records.
    const dataset = await PersistenceService.persistDataset({
      market,
      deliveryDate,
      fileName,
      records: transformationResult.records,
      action
    });

    return {
      datasetId: dataset.id,
      rowCount: transformationResult.intervalCount,
      parsed: true,
    };
  }
}

