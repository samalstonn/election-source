import logger from './logger';

/**
 * Sleep for a specified amount of time
 * @param ms - The number of milliseconds to sleep
 * @returns A promise that resolves after the specified time
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 * @param fn - The function to retry
 * @param maxRetries - Maximum number of retries
 * @param initialDelay - Initial delay in ms
 * @returns The result of the function
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>, 
  maxRetries = 3, 
  initialDelay = 1000
): Promise<T> {
  let attempt = 0;
  let delay = initialDelay;

  while (true) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      
      if (attempt >= maxRetries) {
        logger.error('Max retries reached', {
          error: error instanceof Error ? error.message : String(error),
          attempt,
          maxRetries,
        });
        throw error;
      }
      
      logger.warn(`Retry attempt ${attempt}/${maxRetries} in ${delay}ms`);
      await sleep(delay);
      delay *= 2; // Exponential backoff
    }
  }
}

/**
 * Chunk an array into smaller arrays
 * Useful for batching API requests
 * @param array - The array to chunk
 * @param size - The size of each chunk
 * @returns An array of chunks
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
} 