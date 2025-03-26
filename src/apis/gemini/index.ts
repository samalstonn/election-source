import { config } from '../../config';
import logger from '../../utils/logger';
import { DetailedElection, BasicElection, ElectionType, Candidate, CandidatePolicy } from '../../models/types';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateResearchQuery, generateTransformationPrompt } from './queries';

// Update to use the latest Gemini model
const model1 = "gemini-2.5-pro-exp-03-25"
const model2 = 'gemini-2.0-flash';
const model = model1;

/**
 * Function to make API calls to Gemini with streaming support
 * @param prompt - The text prompt to send to Gemini
 * @param useGrounding - Whether to use Google Search grounding
 * @returns The response from Gemini
 */
export async function callGeminiApi(
  prompt: string, 
  useGrounding = true,
  conversationHistory: {role: string, text: string}[] = []
): Promise<string> {
  try {
    // Initialize the Gemini client
    const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    const genaiClient = genAI.getGenerativeModel({ model });

    // Create a history of messages based on conversation history
    const history = [...conversationHistory];
    
    // Add the current prompt to history
    history.push({ role: 'user', text: prompt });

    // Prepare the content for the request
    const contents = history.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.text }]
    }));

    // Configure the request
    const generationConfig = {
      temperature: 0,
      maxOutputTokens: 25000,
      topP: 0.95,
      topK: 40,
    };

    // Set up request parameters
    const requestParams: any = {
      contents,
      generationConfig,
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    };

    // Add Google Search grounding if enabled
    if (useGrounding) {
      requestParams.tools = [
        { googleSearch: {} }
      ];
      logger.info('Using Google Search grounding for Gemini request');
    } else {
      const model = model2;
      requestParams.model = model;
      logger.info(`No grounding tools enabled for Gemini request. Using model: ${model2}`);
    }

    // Debug log the request
    logger.debug('Gemini API request parameters', {
      model,
      useGrounding,
      promptLength: prompt.length
    });

    logger.info('Making Gemini API request');

    // Generate content using streaming
    const result = await genaiClient.generateContent(requestParams);
    const response = result.response;
    const text = response.text();

    logger.info('Successfully received response from Gemini');
    return text;
  } catch (error) {
    logger.error('Error calling Gemini API', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error('Failed to get response from Gemini: ' + (error instanceof Error ? error.message : String(error)));
  }
}

/**
 * Uses Gemini Deep Research to get detailed election and candidate information
 * @param basicElection - Basic election information from Civic API
 * @returns Promise with detailed election data
 */
export async function getDetailedElectionInfo(basicElection: BasicElection): Promise<DetailedElection[]> {
  try {
    logger.info(`Getting detailed information for election: ${basicElection.name}`);
    
    // Step 1: Get detailed research from Gemini with Google Search grounding
    const researchQuery = generateResearchQuery(basicElection);
    const geminiResponse = await callGeminiApi(researchQuery, true); // Enable Google Search grounding
    
    logger.info('Successfully received detailed election information from Gemini');
    
    // Step 2: Use AI to transform the unstructured data into structured JSON
    const transformationPrompt = generateTransformationPrompt(geminiResponse, basicElection);
    
    // Create conversation history for transformation
    const conversationHistory = [
      { role: 'user', text: researchQuery },
      { role: 'model', text: geminiResponse }
    ];
    
    logger.info('Sending transformation request to Gemini for JSON structuring');
    const structuredJsonResponse = await callGeminiApi(transformationPrompt, false, conversationHistory);
    
    logger.info('Successfully received structured JSON from Gemini');
    
    // Step 3: Parse the JSON response
    return parseAIGeneratedJson(structuredJsonResponse, basicElection);
  } catch (error) {
    logger.error('Error getting detailed election information from Gemini', {
      error: error instanceof Error ? error.message : String(error),
      election: basicElection.name,
    });
    throw new Error('Failed to get detailed election information');
  }
}

/**
 * Parse the AI-generated JSON response into DetailedElection objects
 * @param jsonResponse - The JSON string from AI transformation
 * @param basicElection - Basic election information (for fallback)
 * @returns Array of DetailedElection objects
 */
export function parseAIGeneratedJson(jsonResponse: string, basicElection: BasicElection): DetailedElection[] {
  try {
    logger.info('Parsing AI-generated JSON response');
    
    // Find JSON content even if there's text around it
    const jsonMatch = jsonResponse.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : jsonResponse;
    
    // Parse the JSON
    const parsedData = JSON.parse(jsonString);
    
    // Basic validation
    if (!parsedData.elections || !Array.isArray(parsedData.elections)) {
      logger.warn('Invalid JSON structure: missing or invalid elections array');
      return [];
    }
    
    // Map to our DetailedElection type
    const detailedElections: DetailedElection[] = parsedData.elections.map((election: any) => {
      // Validate and transform date
      let electionDate: Date;
      try {
        electionDate = new Date(election.date);
        if (isNaN(electionDate.getTime())) {
          electionDate = basicElection.date;
        }
      } catch {
        electionDate = basicElection.date;
      }
      
      // Validate and transform type
      let electionType: ElectionType;
      if (election.type && Object.values(ElectionType).includes(election.type as ElectionType)) {
        electionType = election.type as ElectionType;
      } else {
        const upperType = String(election.type || '').toUpperCase();
        if (upperType === 'LOCAL' || upperType === 'STATE' || upperType === 'NATIONAL' || upperType === 'UNIVERSITY') {
          electionType = upperType as ElectionType;
        } else {
          electionType = ElectionType.LOCAL; // Default
        }
      }
      
      // Validate and transform candidates
      const candidates: Candidate[] = Array.isArray(election.candidates) 
        ? election.candidates.map((candidate: any) => {
            // Validate and transform keyPolicies
            const keyPolicies: CandidatePolicy[] = Array.isArray(candidate.keyPolicies)
              ? candidate.keyPolicies.map((policy: any) => ({
                  title: policy.title || 'Policy',
                  description: policy.description || 'No description provided'
                }))
              : [{ title: 'Policy', description: 'No specific policies mentioned' }];
              
            // Validate sources
            const sources: string[] = Array.isArray(candidate.sources)
              ? candidate.sources
              : ['No sources found'];
              
            return {
              fullName: candidate.fullName || '',
              currentPosition: candidate.currentPosition || 'Candidate',
              imageUrl: candidate.imageUrl || '',
              linkedinUrl: candidate.linkedinUrl || '',
              campaignUrl: candidate.campaignUrl || '',
              description: candidate.description || 'No description found',
              keyPolicies,
              additionalNotes: candidate.additionalNotes || '',
              sources,
              party: candidate.party || 'No party found',
              city: candidate.city || 'Unknown',
              state: candidate.state || 'Unknown',
              twitter: candidate.twitter || ''
            };
          })
        : [];
      
      return {
        position: election.position || basicElection.name,
        date: electionDate,
        city: election.city || '',
        state: election.state || '',
        description: election.description || `Position for ${basicElection.name}`,
        type: electionType,
        candidates
      };
    });
    
    // If no elections were parsed, create a fallback
    if (detailedElections.length === 0) {
      logger.warn('No elections found in AI-generated JSON');
      return []
    }
    
    logger.info(`Successfully parsed ${detailedElections.length} elections with ${detailedElections.reduce((sum, e) => sum + e.candidates.length, 0)} candidates total`);
    return detailedElections;
  } catch (error) {
    logger.error('Error parsing AI-generated JSON', {
      error: error instanceof Error ? error.message : String(error),
      jsonPreview: jsonResponse.substring(0, 200) + '...'
    });
    return [];
  }
}