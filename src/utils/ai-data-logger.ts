import fs from 'fs';
import path from 'path';
import logger from './logger';
import { BasicElection, DetailedElection } from '../models/types';

/**
 * AI Data Logger - Utility to log data from AI models to local files
 * in a structured and human-readable format
 */
export class AIDataLogger {
  private baseDir: string;
  private currentRunDir: string;
  private timestamp: string;
  
  /**
   * Creates a new AIDataLogger instance
   * @param baseDir - Base directory for logs (default: './ai-logs')
   */
  constructor(baseDir: string = './ai-logs') {
    this.baseDir = baseDir;
    this.timestamp = this.generateTimestamp();
    this.currentRunDir = path.join(this.baseDir, this.timestamp);
    
    this.initializeDirectories();
  }
  
  /**
   * Generates a timestamp for the current run
   * @returns Formatted timestamp string
   */
  private generateTimestamp(): string {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}-${now.getMinutes().toString().padStart(2, '0')}-${now.getSeconds().toString().padStart(2, '0')}`;
  }
  
  /**
   * Initializes the directory structure for the current run
   */
  private initializeDirectories(): void {
    try {
      // Create base directory if it doesn't exist
      if (!fs.existsSync(this.baseDir)) {
        fs.mkdirSync(this.baseDir, { recursive: true });
        logger.info(`Created base directory: ${this.baseDir}`);
      }
      
      // Create run directory
      fs.mkdirSync(this.currentRunDir, { recursive: true });
      logger.info(`Created run directory: ${this.currentRunDir}`);
      
      // Create subdirectories for different data types
      const subdirs = ['civic-api', 'gemini-research', 'gemini-json'];
      
      subdirs.forEach(subdir => {
        const fullPath = path.join(this.currentRunDir, subdir);
        fs.mkdirSync(fullPath, { recursive: true });
      });
      
      logger.info(`Initialized AI data logger for run: ${this.timestamp}`);
    } catch (error) {
      logger.error('Error initializing AI data logger directories', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  
  /**
   * Logs Google Civic API data
   * @param elections - Array of elections from the Civic API
   */
  public logCivicApiData(elections: BasicElection[]): void {
    try {
      const filePath = path.join(this.currentRunDir, 'civic-api', 'elections.json');
      
      // Create a more human-readable format
      const formattedData = elections.map(election => ({
        name: election.name,
        date: election.date.toISOString().split('T')[0], // YYYY-MM-DD format
        timestamp: this.timestamp,
        source: 'Google Civic API'
      }));
      
      // Write the formatted data to a JSON file
      fs.writeFileSync(
        filePath,
        JSON.stringify(formattedData, null, 2), // Pretty print with 2 spaces
        'utf8'
      );
      
      // Also create a human-readable text version
      const textFilePath = path.join(this.currentRunDir, 'civic-api', 'elections.txt');
      let textContent = 'GOOGLE CIVIC API ELECTION DATA\n';
      textContent += `Retrieved at: ${new Date().toISOString()}\n\n`;
      
      elections.forEach((election, index) => {
        textContent += `Election #${index + 1}:\n`;
        textContent += `- Name: ${election.name}\n`;
        textContent += `- Date: ${election.date.toISOString().split('T')[0]}\n\n`;
      });
      
      fs.writeFileSync(textFilePath, textContent, 'utf8');
      
      logger.info(`Logged Civic API data to ${filePath} and ${textFilePath}`);
    } catch (error) {
      logger.error('Error logging Civic API data', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  
  /**
   * Logs Gemini's research response for a specific election
   * @param electionName - Name of the election
   * @param researchResponse - Raw research response from Gemini
   */
  public logGeminiResearch(electionName: string, researchResponse: string): void {
    try {
      // Sanitize election name for file naming
      const sanitizedName = this.sanitizeFileName(electionName);
      
      const filePath = path.join(this.currentRunDir, 'gemini-research', `${sanitizedName}.txt`);
      
      // Add header information
      let content = `GEMINI RESEARCH - ${electionName}\n`;
      content += `Retrieved at: ${new Date().toISOString()}\n`;
      content += `Run: ${this.timestamp}\n\n`;
      content += `${researchResponse}`;
      
      fs.writeFileSync(filePath, content, 'utf8');
      
      logger.info(`Logged Gemini research for "${electionName}" to ${filePath}`);
    } catch (error) {
      logger.error(`Error logging Gemini research for "${electionName}"`, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  
  /**
   * Logs Gemini's JSON output for a specific election
   * @param electionName - Name of the election
   * @param jsonResponse - JSON string response from Gemini
   * @param parsedElections - The parsed elections data (optional)
   */
  public logGeminiJson(
    electionName: string, 
    jsonResponse: string, 
    parsedElections?: DetailedElection[]
  ): void {
    try {
      // Sanitize election name for file naming
      const sanitizedName = this.sanitizeFileName(electionName);
      
      // Save the raw JSON response
      const rawFilePath = path.join(this.currentRunDir, 'gemini-json', `${sanitizedName}_raw.json`);
      
      // Try to format the JSON if possible
      let formattedJson = jsonResponse;
      try {
        // Extract JSON if wrapped in text
        const jsonMatch = jsonResponse.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : jsonResponse;
        
        // Parse and re-stringify for pretty printing
        const parsed = JSON.parse(jsonString);
        formattedJson = JSON.stringify(parsed, null, 2);
      } catch (e) {
        // If formatting fails, keep the original
        logger.warn(`Could not format JSON for "${electionName}", saving raw content`);
      }
      
      fs.writeFileSync(rawFilePath, formattedJson, 'utf8');
      
      // If we have parsed elections, save those too
      if (parsedElections && parsedElections.length > 0) {
        const parsedFilePath = path.join(this.currentRunDir, 'gemini-json', `${sanitizedName}_parsed.json`);
        
        fs.writeFileSync(
          parsedFilePath,
          JSON.stringify(parsedElections, null, 2),
          'utf8'
        );
        
        // Also create a human-readable version
        const readableFilePath = path.join(this.currentRunDir, 'gemini-json', `${sanitizedName}_readable.txt`);
        let readableContent = `PARSED ELECTION DATA FOR: ${electionName}\n\n`;
        
        parsedElections.forEach((election, elIndex) => {
          readableContent += `POSITION: ${election.position}\n`;
          readableContent += `Date: ${election.date.toISOString().split('T')[0]}\n`;
          readableContent += `Location: ${election.city}, ${election.state}\n`;
          readableContent += `Type: ${election.type}\n`;
          readableContent += `Description: ${election.description}\n\n`;
          
          readableContent += `CANDIDATES (${election.candidates.length}):\n`;
          
          election.candidates.forEach((candidate, candIndex) => {
            readableContent += `[${candIndex + 1}] ${candidate.fullName}\n`;
            readableContent += `    Position: ${candidate.currentPosition}\n`;
            if (candidate.party) readableContent += `    Party: ${candidate.party}\n`;
            readableContent += `    Bio: ${candidate.description.substring(0, 100)}${candidate.description.length > 100 ? '...' : ''}\n`;
            
            readableContent += `    Key Policies:\n`;
            candidate.keyPolicies.forEach(policy => {
              readableContent += `      - ${policy.title}: ${policy.description.substring(0, 100)}${policy.description.length > 100 ? '...' : ''}\n`;
            });
            
            readableContent += '\n';
          });
          
          readableContent += '----------------------------------------\n\n';
        });
        
        fs.writeFileSync(readableFilePath, readableContent, 'utf8');
        
        logger.info(`Logged parsed Gemini JSON for "${electionName}" to ${parsedFilePath} and ${readableFilePath}`);
      }
      
      logger.info(`Logged Gemini JSON response for "${electionName}" to ${rawFilePath}`);
    } catch (error) {
      logger.error(`Error logging Gemini JSON for "${electionName}"`, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  
  /**
   * Creates a log file with summary information about the run
   * @param electionCount - Number of elections processed
   * @param startTime - Start time of the run
   */
  public createRunSummary(electionCount: number, startTime: Date): void {
    try {
      const endTime = new Date();
      const duration = (endTime.getTime() - startTime.getTime()) / 1000; // seconds
      
      const filePath = path.join(this.currentRunDir, 'run_summary.txt');
      
      let content = 'ELECTION SOURCE - RUN SUMMARY\n';
      content += '==============================\n\n';
      content += `Run ID: ${this.timestamp}\n`;
      content += `Start time: ${startTime.toISOString()}\n`;
      content += `End time: ${endTime.toISOString()}\n`;
      content += `Duration: ${duration.toFixed(2)} seconds\n\n`;
      content += `Elections processed: ${electionCount}\n\n`;
      content += 'Directory structure:\n';
      content += `- ${this.currentRunDir}/\n`;
      content += `  |- civic-api/        # Google Civic API responses\n`;
      content += `  |- gemini-research/   # Gemini research responses\n`;
      content += `  |- gemini-json/       # Gemini structured JSON outputs\n`;
      
      fs.writeFileSync(filePath, content, 'utf8');
      
      logger.info(`Created run summary at ${filePath}`);
    } catch (error) {
      logger.error('Error creating run summary', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  
  /**
   * Helper function to sanitize file names
   * @param fileName - Original file name
   * @returns Sanitized file name
   */
  private sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[^a-z0-9]/gi, '_') // Replace non-alphanumeric with underscore
      .replace(/_+/g, '_')         // Replace multiple underscores with single
      .toLowerCase();
  }
}

export default AIDataLogger;