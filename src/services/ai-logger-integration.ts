// src/services/ai-logger-integration.ts
import { AIDataLogger } from '../utils/ai-data-logger';
import logger from '../utils/logger';
import { getActiveElections } from '../apis/civic';
import { getElectionsFromCsv } from '../apis/csv';
import { BasicElection, DetailedElection, DetailedPosition, ElectionType } from '../models/types';
import { config } from '../config';
import { generateElectionQuery, generateTransformationPrompt } from '../apis/gemini/queries';
import { parseAIGeneratedJson } from '../apis/gemini/index';
import { todo } from 'node:test';
import { callGeminiApi } from '../apis/gemini/index';
import { generateCandidatesQuery } from '../apis/gemini/queries';

/**
 * Enhanced version of the existing aggregateElectionData function
 * that logs AI model outputs during processing
 */
export async function aggregateElectionDataWithLogging(options?: {
  csvFilePath?: string
}): Promise<DetailedElection[]> {
  const startTime = new Date();
  const aiLogger = new AIDataLogger();
  
  try {
    logger.info('Starting election data aggregation with AI data logging');
    
    // Step 1: Get basic election data from the selected data source
    let basicElections: BasicElection[] = [];
    
    if (options?.csvFilePath) {
      // Get elections from CSV file
      logger.info(`Using CSV file as data source: ${options.csvFilePath}`);
      basicElections = await getElectionsFromCsv(options.csvFilePath);
      
      // Log CSV election data
      aiLogger.logCsvElectionData(basicElections, options.csvFilePath);
    } else {
      // Get basic election data from Google Civic API
      logger.info('Using Google Civic API as data source');
      basicElections = await getActiveElections();
      
      // Log Civic API results
      aiLogger.logCivicApiData(basicElections);
    }
    
    if (basicElections.length === 0) {
      logger.warn('No active elections found, aggregation process stopped');
      aiLogger.createRunSummary(0, startTime);
      return [];
    }
    
    logger.info(`Found ${basicElections.length} active elections, fetching detailed information`);
    
    // Apply election limit for testing if configured
    let electionsToProcess = basicElections;
    if (config.testing.electionLimit > 0) {
      electionsToProcess = basicElections.slice(0, config.testing.electionLimit);
      logger.info(`Testing mode: Limited to ${electionsToProcess.length} elections (from ${basicElections.length} available)`);
    }
    
    // Step 2: Process each election and collect detailed information
    const detailedElections: DetailedElection[] = [];
    
    for (const [index, election] of electionsToProcess.entries()) {
      logger.info(`Processing election ${index + 1}/${electionsToProcess.length}: ${election.name}`);
      
      try {
        // Make the request to Gemini API and get the raw research response
        const { structuredJson, detailedInfo } = await getDetailedElectionInfoWithRawResponses(election);
        
        
        // Log the structured JSON response
        aiLogger.logGeminiJson(election.name, structuredJson, detailedInfo);
        
        // Add the processed election data to our collection
        detailedElections.push(...detailedInfo);
        
        logger.info(`Successfully processed election: ${election.name}`);
      } catch (error) {
        logger.error(`Failed to get detailed info for election: ${election.name}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
      
      // Add a delay between requests to avoid rate limiting
      if (index < electionsToProcess.length - 1) {
        const delayMs = 5000; // 5 seconds
        logger.info(`Waiting ${delayMs/1000} seconds before processing next election...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    // Create a run summary
    aiLogger.createRunSummary(detailedElections.length, startTime);
    
    logger.info(`Election data aggregation with logging complete. Aggregated ${detailedElections.length} detailed elections`);
    
    return detailedElections;
  } catch (error) {
    logger.error('Error during election data aggregation with logging', {
      error: error instanceof Error ? error.message : String(error),
    });
    
    // Create a run summary even on error
    aiLogger.createRunSummary(0, startTime);
    
    throw new Error('Election data aggregation with logging failed');
  }
}

/**
 * Extended version of getDetailedElectionInfo that returns raw responses
 * This function wraps the existing functionality while capturing raw responses for logging
 */
async function getDetailedElectionInfoWithRawResponses(
  basicElection: BasicElection
): Promise<{
  structuredJson: string;
  detailedInfo: DetailedElection[];
}> {
  // Import necessary modules and functions
  const { callGeminiApi } = require('../apis/gemini/index');
  const aiLogger = new AIDataLogger();
  
  try {
    logger.info(`Getting detailed information with raw responses for election: ${basicElection.name}`);
    
    // Step 1: Generate the elections query for Gemini
    const researchQuery = generateElectionQuery(basicElection);
    
    // Step 2: Get detailed positions list from Gemini with Google Search grounding
    const rawPositions = await callGeminiApi(researchQuery, true);
    
    // Log the election query and response
    aiLogger.logElectionQuery(basicElection.name, researchQuery, rawPositions);

    // add 1 minute timeout 
    await new Promise(resolve => setTimeout(resolve, 30000));
    logger.info('30 second timeout');

    // Step 3: Validate the raw positions response
    const detailedPositions = validateRawPositions(rawPositions, basicElection);

    // Step 4: Get detailed list of candidates for each position
    const detailedCandidates = await getDetailedCandidatesInfoWithLogging(detailedPositions, basicElection, aiLogger);
    
    
    // Step 5: Generate the transformation prompt
    const transformationPrompt = generateTransformationPrompt(detailedCandidates, basicElection);
    
    // Create conversation history for transformation
    const conversationHistory = [
      { role: 'user', text: researchQuery },
      { role: 'model', text: rawPositions },
    ];
    for (const candidate of detailedCandidates) {
      // Only use the candidatesResponse string, not the whole object
      conversationHistory.push({ role: 'model', text: candidate.candidatesResponse });
    }

    // Step 6: Transform unstructured data to structured JSON
    const structuredJson = await callGeminiApi(transformationPrompt, false, conversationHistory);
    
    // Step 7: Process the JSON response
    const detailedInfo = parseAIGeneratedJson(structuredJson, basicElection);
    
    return {
      structuredJson,
      detailedInfo
    };
  } catch (error) {
    logger.error('Error getting detailed election information with raw responses', {
      error: error instanceof Error ? error.message : String(error),
      election: basicElection.name,
    });
    throw error;
  }
}


function validateRawPositions(
  rawPositions: string,
  basicElection: BasicElection
): DetailedPosition[] {
  try {
    logger.info(`Validating position information for election: ${basicElection.name}`);
    
    // Try to extract JSON from the response
    const jsonMatch = rawPositions.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.error('No JSON object found in Gemini response');
      return [];
    }
    
    const jsonString = jsonMatch[0];
    let parsedData: any;
    
    try {
      parsedData = JSON.parse(jsonString);
    } catch (error) {
      logger.error('Failed to parse JSON from Gemini response', {
        error: error instanceof Error ? error.message : String(error),
        preview: jsonString.substring(0, 200) + '...'
      });
      return [];
    }
    
    // Validate the parsed data structure
    if (!parsedData.positions_up_for_election || !Array.isArray(parsedData.positions_up_for_election)) {
      logger.warn('Invalid JSON structure: missing or invalid positions_up_for_election array');
      return [];
    }
    
    // Map to DetailedPosition type
    const detailedPositions: DetailedPosition[] = parsedData.positions_up_for_election.map((position: any, index: number) => {
      // Validate required fields
      if (!position.position_name) {
        logger.warn(`Position at index ${index} is missing position_name, skipping`);
        return null;
      }
      
      // Convert position_type to ElectionType enum
      let positionType: ElectionType;
      const typeStr = String(position.position_type || '').toUpperCase();
      
      switch (typeStr) {
        case 'LOCAL':
          positionType = ElectionType.LOCAL;
          break;
        case 'STATE':
          positionType = ElectionType.STATE;
          break;
        case 'FEDERAL':
        case 'NATIONAL':
          positionType = ElectionType.NATIONAL;
          break;
        case 'UNIVERSITY':
          positionType = ElectionType.UNIVERSITY;
          break;
        default:
          logger.warn(`Unknown position type: ${position.position_type}, defaulting to LOCAL`);
          positionType = ElectionType.LOCAL;
      }
      
      // Use election date from basic election if not provided
      const electionDate = basicElection.date;
      
      // Validate positions count
      const positions = parseInt(position.positions, 10);
      
      return {
        positionName: position.position_name,
        electionDate: electionDate,
        city: position.city || '',
        state: position.state || '',
        description: position.description || `Position for ${basicElection.name}`,
        type: positionType,
        positions: isNaN(positions) ? 1 : positions
      };
    }).filter((position:string | DetailedPosition): position is DetailedPosition => position !== null);
    
    if (detailedPositions.length === 0) {
      logger.warn(`No valid positions found for election: ${basicElection.name}`);
    } else {
      logger.info(`Successfully validated ${detailedPositions.length} positions for election: ${basicElection.name}`);
    }
    
    return detailedPositions;
  } catch (error) {
    logger.error('Error validating position information', {
      error: error instanceof Error ? error.message : String(error),
      election: basicElection.name,
    });
    return [];
  }
}

async function getDetailedCandidatesInfoWithLogging(
  detailedPositions: DetailedPosition[],
  basicElection: BasicElection,
  aiLogger: AIDataLogger
): Promise<Array<{position: DetailedPosition, candidatesResponse: string}>> {
  try {
    if (detailedPositions.length === 0) {
      logger.warn(`No positions to query candidates for in election: ${basicElection.name}`);
      return [];
    }

    logger.info(`Getting candidate info for ${detailedPositions.length} positions in election: ${basicElection.name}`);
    
    const results: Array<{position: DetailedPosition, candidatesResponse: string}> = [];
    
    // Process each position sequentially to avoid rate limiting
    for (let i = 0; i < detailedPositions.length; i++) {
      const position = detailedPositions[i];
      logger.info(`Processing position ${i + 1}/${detailedPositions.length}: ${position.positionName}`);
      
      try {
        // Generate candidates query for this specific position
        const candidatesQuery = generateCandidatesQuery(basicElection, position);
        
        // Call Gemini API with Google Search grounding enabled
        const candidateResponse = await callGeminiApi(candidatesQuery, true);
        
        // Log the candidate query and response
        aiLogger.logCandidateQuery(
          basicElection.name, 
          position.positionName, 
          candidatesQuery, 
          candidateResponse
        );
        
        // Add the response and position to our collection
        results.push({
          position: position,
          candidatesResponse: candidateResponse
        });
        
        logger.info(`Successfully retrieved candidate information for position: ${position.positionName}`);
        
        // Add delay between calls to avoid rate limiting
        if (i < detailedPositions.length - 1) {
          logger.info(`Waiting 30 seconds before querying next position to avoid rate limiting...`);
          await new Promise(resolve => setTimeout(resolve, 30000)); // 30 second delay
        }
      } catch (error) {
        logger.error(`Failed to get candidate info for position: ${position.positionName}`, {
          error: error instanceof Error ? error.message : String(error),
        });
        
        // Still include a placeholder in the results array to maintain order
        results.push({
          position: position,
          candidatesResponse: `Error retrieving candidate information for ${position.positionName}: ${error instanceof Error ? error.message : String(error)}`
        });
        
        // Add delay even after error to maintain rate limiting pattern
        if (i < detailedPositions.length - 1) {
          logger.info(`Waiting 30 seconds before querying next position (after error)...`);
          await new Promise(resolve => setTimeout(resolve, 30000));
        }
      }
    }
    
    logger.info(`Completed candidate information gathering for all positions in election: ${basicElection.name}`);
    return results;
  } catch (error) {
    logger.error(`Error retrieving candidate information for election: ${basicElection.name}`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}