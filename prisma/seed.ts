import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting database seed...');

    // Add seed data if needed
    console.log('Seed completed successfully!');
}

main()
    .catch((error: Error) => {
        console.error('Error during seeding:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

