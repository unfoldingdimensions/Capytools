import '@testing-library/jest-dom';

// Mock environment variables for testing
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-long-here';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

