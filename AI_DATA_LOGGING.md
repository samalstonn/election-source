# AI Data Logging for Election Source

## Overview
The AI Data Logging functionality enhances the Election Source application by saving raw outputs from AI models (Google Civic API and Gemini) to local files in a structured, human-readable format. This allows for easier debugging, analysis, and understanding of how the AI models process and generate election data.

## Features
- Creates timestamped folders for each application run
- Saves Google Civic API responses in both JSON and human-readable text formats
- Logs raw Gemini research responses for each election
- Saves Gemini's structured JSON output both in raw and parsed formats
- Generates human-readable summaries of the parsed election data
- Creates a run summary with statistics and metadata

## Usage

Run the application with AI data logging enabled:

```bash
./run-with-logging.sh
```

You can also set environment variables for testing:

```bash
# Process only one election (for testing)
ELECTION_LIMIT=1 ./run-with-logging.sh

# Set more verbose logging
LOG_LEVEL=debug ./run-with-logging.sh
```

## Analysis

The AI data logs can be used for:

1. **Debugging**: Trace how the AI processes each election and identify any errors or inconsistencies.
2. **Model Evaluation**: Compare the raw research responses with the structured JSON to evaluate the model's comprehension.
3. **Data Verification**: Verify that the parsed data accurately reflects the original information.
4. **Improvement**: Analyze the logs to identify patterns and optimize prompts for better results.
5. **Audit Trail**: Maintain a record of all AI interactions for compliance and transparency.

## Directory Structure
The AI data logger creates the following directory structure:

```
ai-logs/
└── YYYY-MM-DD_HH-MM-SS/                 # Timestamped folder for each run
    ├── run_summary.txt                  # Summary of the run with statistics
    ├── civic-api/                       # Google Civic API outputs
    │   ├── elections.json               # Raw API data in JSON format
    │   └── elections.txt                # Human-readable election data
    ├── gemini-research/                 # Gemini research responses
    │   └── [election_name].txt          # Raw research for each election
    └── gemini-json/                     # Gemini structured JSON outputs
        ├── [election_name]_raw.json     # Raw JSON response from Gemini
        ├── [election_name]_parsed.json  # Parsed election data
        └── [election_name]_readable.txt # Human-readable election details

## Example Log Files

### Civic API Elections (elections.txt)
```
GOOGLE CIVIC API ELECTION DATA
Retrieved at: 2025-03-25T14:30:45.123Z

Election #1:
- Name: South Carolina Special Election - State House District 113
- Date: 2025-03-25

Election #2:
- Name: California Primary Election
- Date: 2025-03-05
```

### Gemini Research Response (south_carolina_special_election_state_house_district_113.txt)
```
GEMINI RESEARCH - South Carolina Special Election - State House District 113
Retrieved at: 2025-03-25T14:31:15.456Z
Run: 2025-03-25_14-30-45

[Detailed research response from Gemini about the election, including position information and candidate details...]
```

### Human-Readable Parsed Data (south_carolina_special_election_state_house_district_113_readable.txt)
```
PARSED ELECTION DATA FOR: South Carolina Special Election - State House District 113

POSITION: State House Representative - District 113
Date: 2025-03-25
Location: Charleston, SC
Type: STATE
Description: Representing District 113 in the South Carolina State House of Representatives

CANDIDATES (2):
[1] Jane Smith
    Position: Attorney
    Party: Democrat
    Bio: Jane Smith is a practicing attorney specializing in environmental law...

[2] John Johnson
    Position: Business Owner
    Party: Republican
    Bio: John Johnson is a local business owner who has operated...

    Key Policies:
      - Economic Development: Focus on bringing new businesses to the district...
      - Education Reform: Supports increased funding for public schools...
```

## Integration with Existing Code

The AI data logging functionality is designed to integrate seamlessly with the existing Election Source application. It wraps the existing data aggregation process with logging functionality without changing the core behavior.

To modify the existing code:

1. Import and use the enhanced aggregation function:
   ```typescript
   import { aggregateElectionDataWithLogging } from './services/ai-logger-integration';
   
   // Replace
   const rawElectionData = await aggregateElectionData();
   
   // With
   const rawElectionData = await aggregateElectionDataWithLogging();
   ```

2. Add logging calls to your own code:
   ```typescript
   import { AIDataLogger } from './utils/ai-data-logger';
   
   const aiLogger = new AIDataLogger();
   aiLogger.logCivicApiData(elections);
   aiLogger.logGeminiResearch(election.name, rawResearch);
   aiLogger.logGeminiJson(election.name, structuredJson, detailedInfo);
   ```

## Maintenance

The logs can accumulate disk space over time. Consider implementing a log rotation/cleanup policy for production environments.