import { getActiveElections } from '../../apis/civic';
import { getDetailedElectionInfo } from '../../apis/gemini';
import logger from '../../utils/logger';
import { BasicElection, DetailedElection } from '../../models/types';
import { chunkArray } from '../../utils/helpers';

/**
 * Aggregates data from multiple sources to create a comprehensive election dataset
 * @returns Promise with array of detailed elections
 */
export async function aggregateElectionData(): Promise<DetailedElection[]> {
  try {
    logger.info('Starting election data aggregation process');
    
    // Step 1: Get basic election data from Google Civic API
    const basicElections = await getActiveElections();
    
    if (basicElections.length === 0) {
      logger.warn('No active elections found, aggregation process stopped');
      return [];
    }
    
    logger.info(`Found ${basicElections.length} active elections, fetching detailed information`);
    
    // Step 2: Retrieve detailed information for each election using Gemini Deep Research
    // Process in batches to avoid rate limits
    const detailedElections: DetailedElection[] = [];
    const batches = chunkArray<BasicElection>(basicElections, 3); // Process 3 at a time
    
    for (const [batchIndex, batch] of batches.entries()) {
      logger.info(`Processing batch ${batchIndex + 1}/${batches.length} of elections`);
      
      const batchPromises = batch.map(election => getDetailedInfoWithErrorHandling(election));
      const batchResults = await Promise.all(batchPromises);
      
      // Flatten and filter out any failed results
      const validBatchResults = batchResults
        .flat()
        .filter(result => result !== null) as DetailedElection[];
      
      detailedElections.push(...validBatchResults);
    }
    
    logger.info(`Election data aggregation complete. Aggregated ${detailedElections.length} detailed elections`);
    
    return detailedElections;
  } catch (error) {
    logger.error('Error during election data aggregation', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error('Election data aggregation failed');
  }
}

/**
 * Helper function to handle errors for individual election processing
 * @param election - Basic election info
 * @returns Array of detailed elections or null if processing failed
 */
async function getDetailedInfoWithErrorHandling(election: BasicElection): Promise<DetailedElection[] | null> {
  try {
    return await getDetailedElectionInfo(election);
  } catch (error) {
    logger.error(`Failed to get detailed info for election: ${election.name}`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
} 