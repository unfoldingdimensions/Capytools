import { PrismaClient } from '@prisma/client';

/**
 * Prisma Client Singleton
 * 
 * Ensures only one instance of PrismaClient is created
 * to prevent connection pool exhaustion in serverless environments.
 */

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
        errorFormat: 'pretty',
    });

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}

// Graceful shutdown
if (typeof process !== 'undefined') {
    process.on('beforeExit', () => {
        void prisma.$disconnect();
    });

    process.on('SIGINT', () => {
        void prisma.$disconnect().then(() => {
            process.exit(0);
        });
    });

    process.on('SIGTERM', () => {
        void prisma.$disconnect().then(() => {
            process.exit(0);
        });
    });
}

export default prisma;

