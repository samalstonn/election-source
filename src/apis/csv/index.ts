// src/apis/csv/index.ts
import fs from 'fs';
import path from 'path';
import { parse } from 'papaparse';
import logger from '../../utils/logger';
import { BasicElection } from '../../models/types';

/**
 * Reads election data from a CSV file
 * Expected CSV format:
 * State,District,Description,Date
 * "Delaware,Laurel,"Toen of Laurel, D.E. general municipal election",2025-03-27
 * 
 * @param filePath - Path to the CSV file
 * @returns Promise<BasicElection[]> - Array of basic election info
 */
export async function getElectionsFromCsv(filePath: string): Promise<BasicElection[]> {
    try {
      logger.info(`Reading elections from CSV file: ${filePath}`);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        logger.error(`CSV file not found: ${filePath}`);
        throw new Error(`CSV file not found: ${filePath}. Please check the file path and try again.`);
      }
      
      // Read file content
      const fileContent = fs.readFileSync(filePath, { encoding: 'utf-8' });
      
      if (fileContent.trim() === '') {
        logger.error(`CSV file is empty: ${filePath}`);
        throw new Error(`CSV file is empty: ${filePath}. Please provide a valid CSV file with election data.`);
      }
      
      // Parse CSV
      const parseResult = parse(fileContent, {
        header: true,
        skipEmptyLines: true,
      });
      
      if (parseResult.errors.length > 0) {
        logger.error('Errors parsing CSV file', { errors: parseResult.errors });
        throw new Error(`Failed to parse CSV file: ${parseResult.errors[0].message}. Please check the CSV format and try again.`);
      }
      
      if (parseResult.data.length === 0) {
        logger.error('CSV file contains no data rows');
        throw new Error(`CSV file contains no data rows. Please provide a valid CSV file with election data.`);
      }
      
      // Check if required columns exist
      const firstRow = parseResult.data[0] as any;
      if (!firstRow.hasOwnProperty('name') || !firstRow.hasOwnProperty('date')) {
        logger.error('CSV file missing required columns', { columns: Object.keys(firstRow) });
        throw new Error(`CSV file must have 'name' and 'date' columns. Found columns: ${Object.keys(firstRow).join(', ')}`);
      }
      
      // Map to BasicElection format
      const elections: BasicElection[] = parseResult.data.map((row: any, index: number) => {
        // Extract State,District,Description,Date

        const state = row.name?.trim();
        const district = row.name?.trim();
        const description = row.name?.trim();
        const dateStr = row.date?.trim();
        const name = state+","+district+","+description+","+dateStr;
        
        if (!state || !district || !description || !dateStr) {
          logger.error(`Missing required fields in CSV row ${index + 1}`, { row });
          throw new Error(`CSV row ${index + 1} missing required fields: all of State,District,Description,Date are required.`);
        }
        
        // Parse date
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
          logger.error(`Invalid date format in CSV row ${index + 1}`, { row });
          throw new Error(`Invalid date format in CSV row ${index + 1}: "${dateStr}". Expected format: YYYY-MM-DD`);
        }
        
        return {
          state,
          district,
          description,
          date,
          name,
        };
      });
      
      logger.info(`Successfully read ${elections.length} elections from CSV file`);
      return elections;
    } catch (error) {
      logger.error('Error reading elections from CSV file', {
        error: error instanceof Error ? error.message : String(error),
        filePath,
      });
      throw error; // Re-throw to be handled by the calling function
    }
  }