import logger from './utils/logger';
import { config, validateConfig } from './config';
import { aggregateElectionData } from './services/data-aggregator';
import { transformElectionData } from './services/data-transformer';
import { storeElectionData } from './services/db';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Main application function
 */
async function main() {
  try {
    logger.info('Starting election data processing workflow');
    
    // Validate configuration
    validateConfig();
    
    // Step 1: Retrieve and aggregate election data
    logger.info('Step 1: Aggregating election data');
    const rawElectionData = await aggregateElectionData();
    
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