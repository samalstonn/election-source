import { BasicElection, DetailedPosition } from "../../models/types";

export function generateElectionQuery(election: BasicElection): string {
  return `
    Act as a diligent and thorough researcher to gather detailed, accurate, and up-to-date election information. 
    Your task is to provide comprehensive details about the below election.
    Please verify every detail carefully; if any information cannot be confirmed as accurate or is not available, mark it as "N/A."

    Election Details (use the following JSON template for election-level information):
    state: ${election.state},
    district: ${election.district},
    description: ${election.district},
    date: ${election.date.toISOString().split("T")[0]}

    Next, list all positions up for election as an array of JSON objects. 
  {
    "state": ${election.state},
    "district": ${election.district},
    "description":  ${election.district},
    "date": ${election.date.toISOString().split("T")[0]}
    "positions_up_for_election":   
      [
    "position list goes here"
      ]
  }
    Each position object must strictly follow this format WITH NO EXCEPTIONS:

    {
    "position_name": "Position name (e.g., 'Mayor', 'Council Member', 'County Circuit Court Judge - Branch 41')",
    "city": "City where the election is taking place (if it is a state or federal election, put 'N/A')",
    "state": "State where the election is taking place (if it is a federal election, put 'N/A'). Make sure the state is NOT in abbreviated form (eg. NOT NY or PA).",
    "description": "Brief description of the role and its responsibilities",
    "position_type": "Categorize the position as 'local', 'state', or 'federal'",
    "positions": "Number of seats up for election"
    }

    Important Instructions - Read before proceeding:
    - Accuracy First: Take your time and double-check all election details. Make sure to double check dates.
    - Clear Indications: Only mark any unverified or unavailable information as "N/A."
    - Structured Format: Present the output EXCLUSIVELY in JSON format following the exact schema provided above.
    - Follow Format: Do not include any additional details such as constitutional amendment voting, other key dates or resources, or information on elections in other states.

    IMPORTANT: Please ONLY respond with the valid JSON object, NOTHING ELSE. Your response must be valid, parseable JSON.
`;
}

/**
 * Generates a detailed research query for an election
 * @param election - Basic election information
 * @returns The formatted research query
 */
export function generateCandidatesQuery(
  election: BasicElection,
  position: DetailedPosition
): string {
  return `
    Act as a diligent and thorough researcher to gather detailed, accurate, and up-to-date election information. Your task is to provide comprehensive details about all candidates for the below election details.
    Please take your time to verify every piece of information carefully to avoid inaccuracies—especially for URLs. If a link cannot be confirmed as accurate or is not available, mark it as "N/A."

    Use the following election and position details:
    state: ${election.state},
    district: ${election.district},
    description: ${election.district},
    date: ${election.date.toISOString().split("T")[0]}

    position_name: ${position.positionName},
    city: ${position.city},
    state: ${position.state},
    description: ${position.description},
    position_type: ${position.type},
    positions: ${position.positions},

    Please provide the output in the following JSON format:
    {
    "candidates": [
        {
        "name": "Full legal name",
        "position": "Current position (e.g., 'Incumbent Village Mayor' or 'Business Owner')",
        "party": "All political party affiliations",
        "image_url": "Does not need to be searched. Mark as 'N/A'",
        "linkedin_url": "Confirm the URL is accurate. If not available or unverified, mark as 'N/A'",
        "campaign_website_url": "Does not need to be searched. Mark as 'N/A'",
        "description": "A comprehensive background including education, experience, and career history",
        "key_policies": ["Up to 5 major policies the candidate supports"],
        "home_city": "The candidate’s hometown city. If not available or unverified, mark as 'N/A'",
        "hometown_state": "The candidate’s hometown state. Make sure the state is NOT in abbreviated form (eg. NOT NY or PA). If not available or unverified, mark as 'N/A'",
        "additional_notes": "Any extra information (e.g., relevant controversies, endorsements, or unique campaign aspects)",
        "sources": ["A list of verified sources (no need for URLs just general page description) used to gather this information"]
        }
    ]
    }

    Important Instructions - Read before proceeding:
    - Accuracy First: Double-check all candidate details, especially verifying the accuracy of each URL.
    - Clear Indications: Clearly indicate any information that cannot be confirmed as "N/A".
    - Structured Format: Present the output exclusively in the JSON format shown above.
    - Do not include any additional details beyond what is requested.

    IMPORTANT: Please ONLY respond with the valid JSON object, nothing else. Your response must be valid, parseable JSON.
`;
}

/**
 * Generates a prompt for the AI to transform unstructured data into structured JSON
 * @param researchResponse[] - The unstructured responses from Gemini research of candidates
 * @param basicElection - Basic election information
 * @returns Prompt for the AI transformation
 */
export function generateTransformationPrompt(
  candidatesWithPositions: Array<{
    position: DetailedPosition;
    candidatesResponse: string;
  }>,
  election: BasicElection
): string {
  return `
  I have a list of json text response about the following election:
    state: ${election.state},
    district: ${election.district},
    description: ${election.district},
    date: ${election.date.toISOString().split("T")[0]}
  
  Your task is to analyze each response and create a compiled structured JSON object that follows the schema below. Extract all available information about positions and candidates.
  
  Here's the schema to follow:
{
  "elections": [
    {
      "position": "string",
      "date": "YYYY-MM-DD",
      "city": "string",
      "state": "string" Make sure the state is NOT in abbreviated form (eg. NOT NY or PA),
      "description": "string",
      "type": "LOCAL" | "STATE" | "NATIONAL",
      "candidates": [
        {
          "fullName": "string",
          "currentPosition": "string",
          "imageUrl": "string",
          "linkedinUrl": "string",
          "campaignUrl": "string",
          "description": "string",
          "keyPolicies": [
            "string"
          ],
          "additionalNotes": "string",
          "sources": [
            "string"
          ],
          "party": "string",
          "city": "string",
          "state": "string" Make sure the state is NOT in abbreviated form (eg. NOT NY or PA),
          "twitter": "string"
        }
      ]
    }
  ]
}
  
  If information is missing, leave fields blank. Ensure the JSON is valid with no syntax errors.
  
  Here's the text to analyze:
  
  ${candidatesWithPositions}
  
  Please ONLY respond with the valid JSON object, nothing else. Your response must be valid, parseable JSON.
  `;
}
