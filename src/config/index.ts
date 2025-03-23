import dotenv from 'dotenv';
import path from 'path';
import logger from '../utils/logger';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Configuration object
const config = {
  database: {
    url: process.env.DATABASE_URL || '',
  },
  google: {
    apiKey: process.env.GOOGLE_API_KEY || '',
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
  },
  app: {
    nodeEnv: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info',
  },
  testing: {
    // Parse the election limit from environment variable or default to 0 (no limit)
    electionLimit: parseInt(process.env.ELECTION_LIMIT || '0', 10),
  },
};

// Validate required environment variables
const validateConfig = () => {
  const requiredVars = [
    { key: 'DATABASE_URL', value: config.database.url },
    { key: 'GOOGLE_API_KEY', value: config.google.apiKey },
    { key: 'GEMINI_API_KEY', value: config.gemini.apiKey },
  ];

  let missingVars = false;
  
  requiredVars.forEach(({ key, value }) => {
    if (!value) {
      logger.error(`Missing required environment variable: ${key}`);
      missingVars = true;
    }
  });

  if (missingVars) {
    throw new Error('Missing required environment variables. Please check your .env file.');
  }
};

export { config, validateConfig }; 