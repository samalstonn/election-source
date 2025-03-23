import logger from '../../utils/logger';
import { DetailedElection, ElectionType, CandidatePolicy, TransformedData } from '../../models/types';
import { validateElectionData } from '../data-validator';

/**
 * Transforms the raw election data from the Gemini API into a standardized format
 * @param rawElections - Array of elections from the aggregator
 * @returns Validated and transformed election data
 */
export function transformElectionData(rawElections: DetailedElection[]): DetailedElection[] {
  try {
    logger.info('Transforming election data');
    
    // Validate and standardize the format of each election
    const transformedElections = rawElections.map(transformSingleElection);
    
    // Validate the entire dataset
    const data: TransformedData = { elections: transformedElections };
    const validatedData = validateElectionData(data);
    
    logger.info('Election data transformation complete');
    return validatedData.elections;
  } catch (error) {
    logger.error('Error during election data transformation', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error('Failed to transform election data');
  }
}

/**
 * Transforms a single election's data
 * @param election - The election data to transform
 * @returns The transformed election
 */
function transformSingleElection(election: DetailedElection): DetailedElection {
  try {
    logger.info(`Transforming election: ${election.position}`);
    
    // Transform the election type to ensure it's a valid enum value
    const transformedType = transformElectionType(election.type);
    
    // Transform candidates data
    const transformedCandidates = election.candidates.map(candidate => {
      // Transform policy data
      const transformedPolicies = Array.isArray(candidate.keyPolicies)
        ? candidate.keyPolicies.map(policy => transformPolicy(policy))
        : [];
      
      // Ensure URLs are properly formatted and valid
      const transformedImageUrl = candidate.imageUrl ? formatUrl(candidate.imageUrl) : undefined;
      const transformedLinkedinUrl = candidate.linkedinUrl ? formatUrl(candidate.linkedinUrl) : undefined;
      const transformedCampaignUrl = candidate.campaignUrl ? formatUrl(candidate.campaignUrl) : undefined;
      
      return {
        ...candidate,
        imageUrl: transformedImageUrl,
        linkedinUrl: transformedLinkedinUrl,
        campaignUrl: transformedCampaignUrl,
        keyPolicies: transformedPolicies,
      };
    });
    
    return {
      ...election,
      type: transformedType,
      candidates: transformedCandidates,
    };
  } catch (error) {
    logger.error(`Error transforming election: ${election.position}`, {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Transforms an election type string to the appropriate enum value
 * @param type - The election type 
 * @returns The correct ElectionType enum value
 */
function transformElectionType(type: ElectionType | string): ElectionType {
  if (typeof type === 'string') {
    const upperType = type.toUpperCase();
    
    if (upperType === 'LOCAL' || upperType === 'STATE' || upperType === 'NATIONAL' || upperType === 'UNIVERSITY') {
      return upperType as ElectionType;
    }
    
    // Default if not matched
    logger.warn(`Unknown election type: ${type}, defaulting to LOCAL`);
    return ElectionType.LOCAL;
  }
  
  return type;
}

/**
 * Transforms policy data
 * @param policy - The policy to transform
 * @returns A properly formatted policy
 */
function transformPolicy(policy: CandidatePolicy | string): CandidatePolicy {
  if (typeof policy === 'string') {
    return {
      title: 'Policy',
      description: policy,
    };
  }
  
  return policy;
}

/**
 * Ensures a URL is properly formatted
 * @param url - The URL to format
 * @returns A properly formatted URL
 */
function formatUrl(url: string): string | undefined {
  if (!url) return undefined;
  
  try {
    // Add https:// if protocol is missing
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    // Validate URL
    new URL(url);
    return url;
  } catch (error) {
    logger.warn(`Invalid URL: ${url}`);
    return undefined;
  }
} 