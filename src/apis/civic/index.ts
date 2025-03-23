import { google } from 'googleapis';
import { config } from '../../config';
import logger from '../../utils/logger';
import { BasicElection } from '../../models/types';

const civicInfo = google.civicinfo({
  version: 'v2',
  auth: config.google.apiKey,
});

// Test election constants
const TEST_ELECTION_ID = '2000';
const TEST_ELECTION_NAME = 'VIP Test Election';

/**
 * Fetches active elections from the Google Civic API
 * @returns Promise<BasicElection[]> - Array of basic election info
 */
export async function getActiveElections(): Promise<BasicElection[]> {
  try {
    logger.info('Fetching active elections from Google Civic API');
    
    const response = await civicInfo.elections.electionQuery();
    
    if (!response.data.elections) {
      logger.warn('No elections found in the Civic API response');
      return [];
    }
    
    // Filter out test elections
    const realElections = response.data.elections.filter(election => 
      election.id !== TEST_ELECTION_ID && election.name !== TEST_ELECTION_NAME
    );
    
    logger.info(`Retrieved ${response.data.elections.length} elections from Civic API (${realElections.length} after filtering out test elections)`);
    
    // Extract and transform the basic election data
    return realElections.map(election => ({
      name: election.name || 'Unknown Election',
      date: election.electionDay ? new Date(election.electionDay) : new Date(),
    }));
  } catch (error) {
    logger.error('Error fetching elections from Google Civic API', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error('Failed to fetch elections from Google Civic API');
  }
}

/**
 * Retrieves voter information for a specific address
 * This method can be used to get more detailed information about elections
 * @param address - The voter's address
 * @returns Promise with voter information
 */
export async function getVoterInfo(address: string): Promise<any> {
  try {
    logger.info(`Fetching voter information for address: ${address}`);
    
    // @ts-ignore - The type definition is incomplete, but the API supports this method
    const response = await civicInfo.voterinfo.query({
      address,
    });
    
    return response.data;
  } catch (error) {
    logger.error('Error fetching voter information', {
      error: error instanceof Error ? error.message : String(error),
      address,
    });
    throw new Error('Failed to fetch voter information');
  }
} 