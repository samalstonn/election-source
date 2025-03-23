# Election Source

A full-stack application that automates the collection, enhancement, formatting, and storage of election-related data. The system fetches basic election information from the Google Civic API and enriches it with detailed position and candidate data using Gemini Deep Research.

## Features

- Retrieves basic election data (name, date) from Google Civic API
- Uses Gemini AI with Google Search grounding for comprehensive election research and information gathering
- Processes and enhances election data with detailed candidate and position information
- Validates and transforms data with Zod for robust type safety
- Stores the complete dataset in a Neon PostgreSQL database using Prisma
- Comprehensive error handling and logging
- Modular component architecture

## Tech Stack

- Node.js / TypeScript
- Prisma ORM with Neon PostgreSQL
- Google Civic API
- Gemini Deep Research API
- Zod for data validation
- Winston for logging
- Jest for testing

## System Workflow

1. **Basic Election Data Retrieval**: Queries the Google Civic API to obtain active elections with basic details.
2. **Detailed Information Research**: For each election, uses Gemini Deep Research to retrieve comprehensive details about positions and candidates.
3. **Data Transformation**: Aggregates and transforms the data into a standardized format.
4. **Validation**: Validates the transformed data against a predefined schema.
5. **Database Storage**: Stores the validated data in a Neon PostgreSQL database.

## Project Structure

```
election-source/
├── prisma/
│   └── schema.prisma        # Prisma database schema
├── src/
│   ├── apis/                # API integrations
│   │   ├── civic/           # Google Civic API
│   │   └── gemini/          # Gemini Deep Research API
│   ├── config/              # Configuration management
│   ├── models/              # Data models and types
│   ├── services/            # Core services
│   │   ├── data-aggregator/ # Aggregates data from multiple sources
│   │   ├── data-transformer/# Transforms raw data to standard format
│   │   ├── data-validator/  # Validates data against schemas
│   │   └── db/              # Database operations
│   ├── utils/               # Utility functions
│   └── index.ts             # Application entry point
├── tests/                   # Test files
├── .env                     # Environment variables (not in repo)
├── .env.example             # Environment variables template
└── package.json             # Project dependencies
```

## Setup Instructions

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- A Neon PostgreSQL database
- API keys for Google Civic API and Gemini API

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/samalstonn/election-source.git
   cd election-source
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file based on `.env.example` and fill in your API keys and database URL:
   ```
   cp .env.example .env
   ```

4. Generate Prisma client:
   ```
   npm run prisma:generate
   ```

5. Push the database schema:
   ```
   npm run prisma:push
   ```

### Running the Application

Development mode:
```
npm run dev
```

Production mode:
```
npm run build
npm start
```

### Running Tests

```
npm test
```

## Configuration

The application uses environment variables for configuration:

- `DATABASE_URL`: Neon PostgreSQL connection string
- `GOOGLE_API_KEY`: Google API key with Civic API access
- `GEMINI_API_KEY`: Gemini API key
- `NODE_ENV`: Environment (development, production)
- `LOG_LEVEL`: Logging level (info, warn, error, debug)

## Error Handling and Logging

The application uses Winston for logging, with different transport options based on the environment. Logs are stored in the `logs` directory for review and troubleshooting.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## License

ISC

## Architecture

The application follows a modular, service-oriented architecture with clear separation of concerns:

1. **Data Aggregation**: Fetches basic election data from the Google Civic API and uses Gemini AI (with Google Search grounding) to research and gather detailed information.
2. **Transformation**: Converts the raw data into a structured format.
3. **Enhancement**: Adds additional details and insights to the election data.
4. **Validation**: Validates the transformed data against a predefined schema.
5. **Storage**: Persists the processed data in a Neon PostgreSQL database.

## Usage

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Push schema to database
npm run prisma:push

# Run the application in development mode
npm run dev

# Run with only one election (for testing)
npm run dev:single

# Run with limited elections (3 by default)
npm run dev:limited

# Build for production
npm build

# Start production server
npm start
```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
DATABASE_URL="postgresql://username:password@hostname:port/database?sslmode=require"
GOOGLE_API_KEY="your_google_civic_api_key"
GEMINI_API_KEY="your_gemini_api_key"
NODE_ENV="development"
LOG_LEVEL="info"
ELECTION_LIMIT="0" # Optional: Limit number of elections processed (0 = no limit)
```
