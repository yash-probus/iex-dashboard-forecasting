import { ParserResult } from '../upload-processing/upload-processing.types';
import { TransformerFactory } from './transformers/transformer.factory';
import { TransformationResult } from './transformation.types';
import { logger } from '../../logger';

export class TransformationService {
  public static transform(parserResult: ParserResult): TransformationResult {
    logger.info(`Starting TransformationService for market: ${parserResult.market}`);

    if (!parserResult.success || !parserResult.records) {
      logger.error('Transformation Failed: Invalid parser result or missing records array');
      return {
        market: parserResult.market,
        intervalCount: 0,
        records: [],
        warnings: ['Invalid parser result provided to transformation service'],
        isValid: false,
      };
    }

    try {
      const transformer = TransformerFactory.getTransformer(parserResult.market);
      const transformationResult = transformer.transform(parserResult.records);
      
      if (!transformationResult.isValid) {
        logger.warn(`Transformation Engine rejected data for ${parserResult.market}`);
      } else {
        logger.info(`Transformation Engine successfully transformed ${transformationResult.intervalCount} intervals`);
      }

      return transformationResult;
    } catch (error: any) {
      logger.error(`TransformationService critical error: ${error.message}`);
      return {
        market: parserResult.market,
        intervalCount: 0,
        records: [],
        warnings: [error.message],
        isValid: false,
      };
    }
  }
}
