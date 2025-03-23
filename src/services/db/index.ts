import { PrismaClient } from '@prisma/client';
import logger from '../../utils/logger';
import { DetailedElection, Candidate, CandidatePolicy } from '../../models/types';
import { chunkArray } from '../../utils/helpers';

const prisma = new PrismaClient();

/**
 * Store election data in the database
 * @param elections - Array of detailed elections to store
 * @returns Promise that resolves when all data is stored
 */
export async function storeElectionData(elections: DetailedElection[]): Promise<void> {
  try {
    logger.info('Starting to store election data in database');
    
    // Process elections in chunks to avoid overwhelming the database
    const chunks = chunkArray(elections, 5);
    
    for (const [chunkIndex, chunk] of chunks.entries()) {
      logger.info(`Processing database storage chunk ${chunkIndex + 1}/${chunks.length}`);
      
      // Store each election in the chunk
      for (const election of chunk) {
        await storeElection(election);
      }
    }
    
    logger.info('Election data storage complete');
  } catch (error) {
    logger.error('Error storing election data in database', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error('Failed to store election data in database');
  }
}

/**
 * Store a single election in the database
 * @param election - The election to store
 * @returns Promise that resolves when the election is stored
 */
async function storeElection(election: DetailedElection): Promise<void> {
  try {
    logger.info(`Storing election: ${election.position}`);
    
    // Create the election record
    const createdElection = await prisma.election.create({
      data: {
        position: election.position,
        date: election.date,
        city: election.city,
        state: election.state,
        description: election.description,
        type: election.type,
        active: true,
        positions: 1, // Assuming 1 position per election, adjust as needed
      },
    });
    
    // Store candidates for this election
    await storeCandidates(createdElection.id, election.candidates);
    
    logger.info(`Successfully stored election: ${election.position} with ID ${createdElection.id}`);
  } catch (error) {
    logger.error(`Error storing election: ${election.position}`, {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Store candidates for an election
 * @param electionId - The ID of the election
 * @param candidates - Array of candidates to store
 * @returns Promise that resolves when all candidates are stored
 */
async function storeCandidates(electionId: number, candidates: Candidate[]): Promise<void> {
  try {
    logger.info(`Storing ${candidates.length} candidates for election ID ${electionId}`);
    
    for (const candidate of candidates) {
      // Format policies as strings for database storage
      const policiesStr = candidate.keyPolicies.map(formatPolicy);
      
      // Extract additional fields with safe defaults
      const { party = '', city, state, twitter } = candidate;
      
      // Create the candidate record
      await prisma.candidate.create({
        data: {
          name: candidate.fullName,
          position: candidate.currentPosition,
          party,
          policies: policiesStr,
          website: candidate.campaignUrl,
          electionId,
          additionalNotes: candidate.additionalNotes,
          city,
          linkedin: candidate.linkedinUrl,
          photo: candidate.imageUrl,
          sources: candidate.sources,
          state,
          twitter,
          bio: candidate.description,
          verified: false,
          donations: [],
          history: [],
        },
      });
    }
    
    logger.info(`Successfully stored all candidates for election ID ${electionId}`);
  } catch (error) {
    logger.error(`Error storing candidates for election ID ${electionId}`, {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Format a policy for database storage
 * @param policy - The policy to format
 * @returns Formatted policy string
 */
function formatPolicy(policy: CandidatePolicy): string {
  return `${policy.title}: ${policy.description}`;
} 