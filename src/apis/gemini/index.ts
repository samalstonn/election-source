import { config } from '../../config';
import logger from '../../utils/logger';
import { DetailedElection, BasicElection, ElectionType, Candidate, CandidatePolicy } from '../../models/types';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Update to use the latest Gemini model
const model = 'gemini-2.0-flash';

/**
 * Function to make API calls to Gemini with streaming support
 * @param prompt - The text prompt to send to Gemini
 * @param useGrounding - Whether to use Google Search grounding
 * @returns The response from Gemini
 */
async function callGeminiApi(
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
      temperature: 0.7,
      maxOutputTokens: 8192,
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
 * Generates a detailed research query for an election
 * @param election - Basic election information
 * @returns The formatted research query
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
 * Generates a prompt for the AI to transform unstructured data into structured JSON
 * @param researchResponse - The unstructured response from Gemini research
 * @param basicElection - Basic election information
 * @returns Prompt for the AI transformation
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
function parseAIGeneratedJson(jsonResponse: string, basicElection: BasicElection): DetailedElection[] {
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
      return createFallbackElection(basicElection);
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
              : ['Information provided by AI'];
              
            return {
              fullName: candidate.fullName || 'Unknown Candidate',
              currentPosition: candidate.currentPosition || 'Candidate',
              imageUrl: candidate.imageUrl || '',
              linkedinUrl: candidate.linkedinUrl || '',
              campaignUrl: candidate.campaignUrl || '',
              description: candidate.description || 'No description provided',
              keyPolicies,
              additionalNotes: candidate.additionalNotes || '',
              sources,
              party: candidate.party || '',
              city: candidate.city || 'Unknown',
              state: candidate.state || 'Unknown',
              twitter: candidate.twitter || ''
            };
          })
        : [];
        
      // If no candidates were found, create a placeholder
      if (candidates.length === 0) {
        candidates.push({
          fullName: 'Information Not Available',
          currentPosition: 'Candidate',
          description: 'Candidate information could not be parsed',
          keyPolicies: [{ title: 'Policy', description: 'Information not available' }],
          sources: ['Information provided by AI'],
          additionalNotes: '',
          imageUrl: '',
          linkedinUrl: '',
          campaignUrl: '',
          party: '',
          city: 'Unknown',
          state: 'Unknown',
          twitter: ''
        });
      }
      
      return {
        position: election.position || basicElection.name,
        date: electionDate,
        city: election.city || 'Unknown',
        state: election.state || 'Unknown',
        description: election.description || `Position for ${basicElection.name}`,
        type: electionType,
        candidates
      };
    });
    
    // If no elections were parsed, create a fallback
    if (detailedElections.length === 0) {
      logger.warn('No elections found in AI-generated JSON');
      return createFallbackElection(basicElection);
    }
    
    logger.info(`Successfully parsed ${detailedElections.length} elections with ${detailedElections.reduce((sum, e) => sum + e.candidates.length, 0)} candidates total`);
    return detailedElections;
  } catch (error) {
    logger.error('Error parsing AI-generated JSON', {
      error: error instanceof Error ? error.message : String(error),
      jsonPreview: jsonResponse.substring(0, 200) + '...'
    });
    return createFallbackElection(basicElection);
  }
}

/**
 * Creates a fallback election when parsing fails
 * @param basicElection - Basic election information
 * @returns Array with a single fallback election
 */
function createFallbackElection(basicElection: BasicElection): DetailedElection[] {
  logger.warn(`Creating fallback election for ${basicElection.name}`);
  
  return [{
    position: basicElection.name.replace(/Election - /, '').replace(/.*State /, 'State '),
    date: basicElection.date,
    city: 'Information Not Available',
    state: basicElection.name.match(/([A-Z]{2})/) ? 
           basicElection.name.match(/([A-Z]{2})/)?.[1] || 'Unknown' : 
           basicElection.name.split(' ')[0],
    description: `Position for ${basicElection.name}`,
    type: basicElection.name.toLowerCase().includes('state') ? 
          ElectionType.STATE : 
          (basicElection.name.toLowerCase().includes('national') ? 
           ElectionType.NATIONAL : ElectionType.LOCAL),
    candidates: [{
      fullName: 'Information Not Available',
      currentPosition: 'Candidate',
      description: 'Candidate information could not be retrieved',
      keyPolicies: [{ title: 'Policy', description: 'Information not available' }],
      sources: ['Fallback information due to processing error'],
      additionalNotes: '',
      imageUrl: '',
      linkedinUrl: '',
      campaignUrl: '',
      party: '',
      city: 'Unknown',
      state: 'Unknown',
      twitter: ''
    }]
  }];
} 