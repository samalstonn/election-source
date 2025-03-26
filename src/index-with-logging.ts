// src/index-with-logging.ts
import logger from './utils/logger';
import { config, validateConfig } from './config';
import { aggregateElectionDataWithLogging } from './services/ai-logger-integration';
import { transformElectionData } from './services/data-transformer';
import { storeElectionData } from './services/db';
import { PrismaClient } from '@prisma/client';
import path from 'path';

const prisma = new PrismaClient();

/**
 * Main application function with AI data logging
 */
async function main() {
  try {
    logger.info('Starting election data processing workflow with AI data logging');
    
    // Validate configuration
    validateConfig();
    
    // Check if CSV file path is provided as command line argument
    const csvFilePath = getCsvFilePathFromArgs();
    
    // Step 1: Retrieve and aggregate election data with logging
    logger.info('Step 1: Aggregating election data with AI data logging');
    
    const options = csvFilePath ? { csvFilePath } : undefined;
    const rawElectionData = await aggregateElectionDataWithLogging(options);
    
    if (rawElectionData.length === 0) {
      logger.warn('No election data found, process complete');
      return;
    }
    
    logger.info(`Retrieved ${rawElectionData.length} elections`);
    
    // Step 2: Transform and validate the data
    logger.info('Step 2: Transforming election data');
    const transformedData = transformElectionData(rawElectionData);
    
    logger.info(`Successfully transformed ${transformedData.length} elections`);
    
    // Step 3: Store the data in the database
    logger.info('Step 3: Storing data in database');
    await storeElectionData(transformedData);
    
    logger.info('Election data processing workflow completed successfully');
    logger.info('AI data logs have been saved to the ./ai-logs directory');
  } catch (error) {
    logger.error('Error in election data processing workflow', {
      error: error instanceof Error ? error.message : String(error),
    });
    
    // Exit with error code
    process.exit(1);
  } finally {
    // Clean up Prisma connection
    await prisma.$disconnect();
  }
}

/**
 * Gets the CSV file path from command line arguments
 * @returns CSV file path or undefined if not provided
 */
function getCsvFilePathFromArgs(): string | undefined {
  const args = process.argv.slice(2);
  
  // Look for --csv flag with file path
  const csvIndex = args.indexOf('--csv');
  if (csvIndex !== -1 && args.length > csvIndex + 1) {
    const csvPath = args[csvIndex + 1];
    
    // Resolve to absolute path if relative
    return path.isAbsolute(csvPath) ? csvPath : path.resolve(process.cwd(), csvPath);
  }
  
  // Also check for CSV_FILE_PATH environment variable
  if (process.env.CSV_FILE_PATH) {
    const csvPath = process.env.CSV_FILE_PATH;
    return path.isAbsolute(csvPath) ? csvPath : path.resolve(process.cwd(), csvPath);
  }
  
  return undefined;
}

// Run the application
if (require.main === module) {
  main()
    .then(() => {
      logger.info('Application completed successfully');
      process.exit(0);
    })
    .catch(error => {
      logger.error('Application failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      process.exit(1);
    });
}