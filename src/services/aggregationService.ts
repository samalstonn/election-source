import logger from '../utils/logger';
import { getActiveElections } from '../apis/civic';
import { getDetailedElectionInfo } from '../apis/gemini';
import { BasicElection, DetailedElection } from '../models/types';
import { sleep } from '../utils/helpers';
import { config } from '../config';

/**
 * Process elections sequentially to avoid rate limiting
 * @param elections - List of basic elections to process
 * @returns Array of detailed elections
 */
async function processElectionsSequentially(elections: BasicElection[]): Promise<DetailedElection[]> {
  const allDetailedElections: DetailedElection[] = [];
  
  logger.info(`Processing ${elections.length} elections sequentially`);
  
  for (let i = 0; i < elections.length; i++) {
    const election = elections[i];
    logger.info(`Processing election ${i + 1}/${elections.length}: ${election.name}`);
    
    try {
      // Process each election with proper error handling
      const detailedElections = await getDetailedElectionInfo(election);
      allDetailedElections.push(...detailedElections);
      logger.info(`Successfully processed election: ${election.name}`);
    } catch (error) {
      logger.error(`Failed to get detailed info for election: ${election.name}`, { error });
    }
    
    // Add a significant delay between each election to avoid rate limiting
    // Skip delay after the last election
    if (i < elections.length - 1) {
      const delayTime = 15000; // 15 seconds between elections
      logger.info(`Waiting ${delayTime/1000} seconds before processing next election to avoid rate limiting...`);
      await sleep(delayTime);
    }
  }
  
  return allDetailedElections;
}

/**
 * Main function to aggregate election data from various sources
 * @returns Promise with array of detailed elections
 */
export async function aggregateElectionData(): Promise<DetailedElection[]> {
  logger.info('Starting election data aggregation process');

  try {
    // Step 1: Get active elections from Google Civic API
    logger.info('Fetching active elections from Google Civic API');
    const activeElections = await getActiveElections();
    logger.info(`Retrieved ${activeElections.length} elections from Civic API`);

    if (activeElections.length === 0) {
      logger.warn('No active elections found');
      return [];
    }

    // Apply election limit for testing if configured
    let electionsToProcess = activeElections;
    if (config.testing.electionLimit > 0) {
      electionsToProcess = activeElections.slice(0, config.testing.electionLimit);
      logger.info(`Testing mode: Limited to ${electionsToProcess.length} elections (from ${activeElections.length} available)`);
    }

    // Step 2: Get detailed information for each election
    logger.info(`Processing ${electionsToProcess.length} elections, fetching detailed information`);
    
    // Process elections sequentially to avoid rate limiting
    const detailedElections = await processElectionsSequentially(electionsToProcess);
    
    logger.info(`Election data aggregation complete. Aggregated ${detailedElections.length} detailed elections`);
    return detailedElections;
  } catch (error) {
    logger.error('Error during election data aggregation', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error('Failed to aggregate election data');
  }
} 