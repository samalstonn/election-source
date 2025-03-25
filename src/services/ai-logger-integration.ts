import { AIDataLogger } from '../utils/ai-data-logger';
import logger from '../utils/logger';
import { getActiveElections } from '../apis/civic';
import { getDetailedElectionInfo } from '../apis/gemini';
import { BasicElection, DetailedElection } from '../models/types';
import { config } from '../config';

/**
 * Enhanced version of the existing aggregateElectionData function
 * that logs AI model outputs during processing
 */
export async function aggregateElectionDataWithLogging(): Promise<DetailedElection[]> {
  const startTime = new Date();
  const aiLogger = new AIDataLogger();
  
  try {
    logger.info('Starting election data aggregation with AI data logging');
    
    // Step 1: Get basic election data from Google Civic API
    const basicElections = await getActiveElections();
    
    // Log Civic API results
    aiLogger.logCivicApiData(basicElections);
    
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
        // Get the research query and response
        const researchQuery = generateResearchQuery(election);
        
        // We need to access the private function from the Gemini API
        // For logging purposes, we'll modify our approach to log the raw responses
        
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
 * Helper function to generate a research query for an election
 * This is a copy of the function from the Gemini API to maintain consistency
 */
function generateResearchQuery(election: BasicElection): string {
  return `
  I need comprehensive information about the "${election.name}" scheduled for ${election.date.toISOString().split('T')[0]}.

  Please provide the following details:

  1. List of all positions up for election including:
     - Position name (e.g., "Mayor", "Council Member")
     - Election date (if different from the main election date)
     - City and State
     - Brief description of the role and its responsibilities
     - Categorize the position as local, state, or federal

  2. For each position, provide details about each candidate running:
     - Full name
     - Current position (e.g., "Incumbent Village Mayor – Democrat")
     - Image URL (if available)
     - LinkedIn profile URL (if available)
     - Campaign website URL
     - Full description of the candidate's background
     - Key policies (up to 5 major policies)
     - Additional notes about the candidate
     - Sources used to gather the information

  Please provide up-to-date information with proper citations. For recent developments in this election, search online sources.
  `;
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

/**
 * Helper function to generate a transformation prompt for the AI
 * This is a copy of the function from the Gemini API to maintain consistency
 */
function generateTransformationPrompt(researchResponse: string, basicElection: BasicElection): string {
  return `
  I have an unstructured text response about the "${basicElection.name}" election scheduled for ${basicElection.date.toISOString().split('T')[0]}.
  
  Your task is to analyze this response and create a structured JSON object that follows the schema below. Extract all available information about positions and candidates.
  
  Here's the schema to follow:
  {
    "elections": [
      {
        "position": "string", // Position name like "Mayor" or "Council Member"
        "date": "YYYY-MM-DD", // Date of the election
        "city": "string", // City where the election is held
        "state": "string", // State where the election is held
        "description": "string", // Description of the position
        "type": "LOCAL" | "STATE" | "NATIONAL" | "UNIVERSITY", // Type of election
        "candidates": [
          {
            "fullName": "string", // Full name of the candidate
            "currentPosition": "string", // Current position, e.g., "Incumbent Mayor - Democrat"
            "imageUrl": "string (optional)", // URL to candidate's image
            "linkedinUrl": "string (optional)", // LinkedIn profile URL
            "campaignUrl": "string (optional)", // Campaign website URL
            "description": "string", // Background of the candidate
            "keyPolicies": ["string"], // list of key policies of the candidate
            "additionalNotes": "string (optional)", // Additional notes
            "sources": ["string"], // List of sources
            "party": "string (optional)", // Political party
            "city": "string (optional)", // City candidate is from
            "state": "string (optional)", // State candidate is from
            "twitter": "string (optional)" // Twitter handle
          }
        ]
      }
    ]
  }
  
  If information is missing, make reasonable inferences or leave fields blank. Ensure the JSON is valid with no syntax errors.
  
  Here's the unstructured text to analyze:
  
  ${researchResponse}
  
  Please ONLY respond with the valid JSON object, nothing else. Your response must be valid, parseable JSON.
  `;
}

/**
 * Parse the AI-generated JSON response into DetailedElection objects
 * This is a simplified version of the function from the Gemini API
 */
function parseAIGeneratedJson(jsonResponse: string, basicElection: BasicElection): DetailedElection[] {
  // Import the necessary function from the gemini API
  const { parseAIGeneratedJson } = require('../apis/gemini');
  
  // Call the existing function to parse the JSON
  return parseAIGeneratedJson(jsonResponse, basicElection);
}