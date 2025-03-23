import logger from '../../utils/logger';
import { DetailedElection, TransformedData } from '../../models/types';
import { TransformedDataSchema, DetailedElectionSchema } from './schema';
import { ZodError } from 'zod';

/**
 * Validates election data against the defined schema
 * @param data - The transformed data object to validate
 * @returns Validated election data or throws an error
 */
export function validateElectionData(data: TransformedData): TransformedData {
  try {
    logger.info('Validating election data against schema');
    
    // Validate the entire data structure
    const validationResult = TransformedDataSchema.safeParse(data);
    
    if (!validationResult.success) {
      const errors = formatZodErrors(validationResult.error);
      logger.error('Validation failed for election data', { errors });
      throw new Error(`Election data validation failed: ${errors}`);
    }
    
    logger.info('Election data successfully validated');
    return validationResult.data;
  } catch (error) {
    if (error instanceof ZodError) {
      const formattedErrors = formatZodErrors(error);
      logger.error('Validation failed for election data', { errors: formattedErrors });
      throw new Error(`Election data validation failed: ${formattedErrors}`);
    }
    
    logger.error('Error during election data validation', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Validates a single election against the schema
 * @param election - The election to validate
 * @returns Validated election or throws an error
 */
export function validateSingleElection(election: DetailedElection): DetailedElection {
  try {
    logger.info(`Validating election: ${election.position}`);
    
    // Validate the election
    const validationResult = DetailedElectionSchema.safeParse(election);
    
    if (!validationResult.success) {
      const errors = formatZodErrors(validationResult.error);
      logger.error(`Validation failed for election: ${election.position}`, { errors });
      throw new Error(`Election validation failed: ${errors}`);
    }
    
    logger.info(`Election ${election.position} successfully validated`);
    return validationResult.data;
  } catch (error) {
    if (error instanceof ZodError) {
      const formattedErrors = formatZodErrors(error);
      logger.error(`Validation failed for election: ${election.position}`, { errors: formattedErrors });
      throw new Error(`Election validation failed: ${formattedErrors}`);
    }
    
    logger.error(`Error during validation for election: ${election.position}`, {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Formats Zod errors for better readability in logs
 * @param error - The Zod error object
 * @returns Formatted error string
 */
function formatZodErrors(error: ZodError): string {
  return error.errors
    .map(err => `${err.path.join('.')}: ${err.message}`)
    .join('; ');
} 