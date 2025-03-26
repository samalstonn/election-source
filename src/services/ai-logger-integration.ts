// src/services/ai-logger-integration.ts
import { AIDataLogger } from '../utils/ai-data-logger';
import logger from '../utils/logger';
import { getActiveElections } from '../apis/civic';
import { getElectionsFromCsv } from '../apis/csv';
import { getDetailedElectionInfo } from '../apis/gemini';
import { BasicElection, DetailedElection } from '../models/types';
import { config } from '../config';
import { generateResearchQuery, generateTransformationPrompt } from '../apis/gemini';

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
        const { rawResearch, structuredJson, detailedInfo } = await getDetailedElectionInfoWithRawResponses(election);
        
        // Log the raw research response
        aiLogger.logGeminiResearch(election.name, rawResearch);
        
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
  rawResearch: string;
  structuredJson: string;
  detailedInfo: DetailedElection[];
}> {
  // Import necessary modules and functions
  const { callGeminiApi } = require('../apis/gemini');
  
  try {
    logger.info(`Getting detailed information with raw responses for election: ${basicElection.name}`);
    
    // Step 1: Generate the research query
    const researchQuery = generateResearchQuery(basicElection);
    
    // Step 2: Get detailed research from Gemini with Google Search grounding
    const rawResearch = await callGeminiApi(researchQuery, true);
    
    // Step 3: Generate the transformation prompt
    const transformationPrompt = generateTransformationPrompt(rawResearch, basicElection);
    
    // Create conversation history for transformation
    const conversationHistory = [
      { role: 'user', text: researchQuery },
      { role: 'model', text: rawResearch }
    ];
    
    // Step 4: Transform unstructured data to structured JSON
    const structuredJson = await callGeminiApi(transformationPrompt, false, conversationHistory);
    
    // Step 5: Process the JSON response
    const detailedInfo = parseAIGeneratedJson(structuredJson, basicElection);
    
    return {
      rawResearch,
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