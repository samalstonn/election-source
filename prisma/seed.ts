import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed script to delete specific elections and associated candidates...');
  
  // Parse the date strings from the criteria
  const startDate = new Date('2025-03-23T14:14:23.402Z');
  const endDate = new Date('2025-03-26T18:59:26.398Z');
  
  try {
    // First, identify all elections that match the criteria
    const matchingElections = await prisma.election.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
      },
      select: {
        id: true,
      },
    });
    
    const electionIds = matchingElections.map(election => election.id);
    console.log(`Found ${electionIds.length} elections matching the criteria.`);
    
    // Start a transaction to ensure data integrity
    const result = await prisma.$transaction(async (tx) => {
      // First delete all candidates associated with these elections
      const deletedCandidates = await tx.candidate.deleteMany({
        where: {
          electionId: {
            in: electionIds,
          },
        },
      });
      
      console.log(`Deleted ${deletedCandidates.count} candidates.`);
      
      // Then delete the elections themselves
      const deletedElections = await tx.election.deleteMany({
        where: {
          id: {
            in: electionIds,
          },
        },
      });
      
      console.log(`Deleted ${deletedElections.count} elections.`);
      
      return {
        deletedCandidates: deletedCandidates.count,
        deletedElections: deletedElections.count,
      };
    });
    
    console.log('Deletion completed successfully.');
    console.log(`Summary: Deleted ${result.deletedElections} elections and ${result.deletedCandidates} associated candidates.`);
    
  } catch (error) {
    console.error('Error during deletion process:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });