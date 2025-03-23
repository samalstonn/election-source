import * as civicModule from '../../src/apis/civic';

// Store the original implementation
const originalGetActiveElections = civicModule.getActiveElections;

// Mock the googleapis module
jest.mock('googleapis', () => ({
  google: {
    civicinfo: jest.fn().mockImplementation(() => ({
      elections: {
        electionQuery: jest.fn()
      },
      voterinfo: {
        query: jest.fn()
      }
    }))
  }
}));

// Mock the config module
jest.mock('../../src/config', () => ({
  config: {
    google: {
      apiKey: 'mock-api-key'
    }
  }
}));

// Mock the logger to avoid console clutter during tests
jest.mock('../../src/utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('Google Civic API', () => {
  let mockGetActiveElections: jest.SpyInstance;
  
  beforeEach(() => {
    // Mock the implementation of getActiveElections for testing
    mockGetActiveElections = jest.spyOn(civicModule, 'getActiveElections');
  });
  
  afterEach(() => {
    // Clean up after the test
    mockGetActiveElections.mockRestore();
  });
  
  describe('getActiveElections', () => {
    it('should return an empty array when no elections are found', async () => {
      // Mock the implementation to return an empty array
      mockGetActiveElections.mockResolvedValueOnce([]);
      
      const result = await civicModule.getActiveElections();
      
      expect(result).toEqual([]);
      expect(mockGetActiveElections).toHaveBeenCalledTimes(1);
    });
    
    it('should return elections when found', async () => {
      const mockElectionDate = new Date('2023-11-07');
      const mockElections = [
        {
          name: 'Test Election 1',
          date: mockElectionDate
        },
        {
          name: 'Test Election 2',
          date: mockElectionDate
        }
      ];
      
      // Mock the implementation to return the elections
      mockGetActiveElections.mockResolvedValueOnce(mockElections);
      
      const result = await civicModule.getActiveElections();
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: 'Test Election 1',
        date: mockElectionDate
      });
      expect(mockGetActiveElections).toHaveBeenCalledTimes(1);
    });
    
    it('should handle errors properly', async () => {
      // Mock the implementation to throw an error
      mockGetActiveElections.mockImplementationOnce(() => {
        throw new Error('Failed to fetch elections from Google Civic API');
      });
      
      await expect(civicModule.getActiveElections()).rejects.toThrow(
        'Failed to fetch elections from Google Civic API'
      );
      expect(mockGetActiveElections).toHaveBeenCalledTimes(1);
    });
  });
}); 