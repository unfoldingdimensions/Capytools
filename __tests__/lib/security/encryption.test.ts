import { encrypt, decrypt, encryptJSON, decryptJSON, hash, generateToken } from '@/lib/security/encryption';

describe('Encryption Utilities', () => {
    describe('encrypt and decrypt', () => {
        it('should encrypt and decrypt data correctly', () => {
            const plainText = 'Hello, World!';
            const encrypted = encrypt(plainText);

            expect(encrypted).toHaveProperty('encrypted');
            expect(encrypted).toHaveProperty('iv');
            expect(encrypted).toHaveProperty('authTag');
            expect(encrypted).toHaveProperty('salt');

            const decrypted = decrypt(encrypted);
            expect(decrypted).toBe(plainText);
        });

        it('should throw error when encrypting empty data', () => {
            expect(() => encrypt('')).toThrow('Cannot encrypt empty data');
        });

        it('should throw error when decrypting invalid data', () => {
            const invalidData = {
                encrypted: 'invalid',
                iv: 'invalid',
                authTag: 'invalid',
                salt: 'invalid',
            };

            expect(() => decrypt(invalidData)).toThrow();
        });
    });

    describe('encryptJSON and decryptJSON', () => {
        it('should encrypt and decrypt JSON objects', () => {
            const obj = {
                name: 'John Doe',
                email: 'john@example.com',
                age: 30,
            };

            const encrypted = encryptJSON(obj);
            expect(typeof encrypted).toBe('string');

            const decrypted = decryptJSON<typeof obj>(encrypted);
            expect(decrypted).toEqual(obj);
        });

        it('should handle nested objects', () => {
            const obj = {
                user: {
                    name: 'John',
                    details: {
                        age: 30,
                        city: 'NYC',
                    },
                },
            };

            const encrypted = encryptJSON(obj);
            const decrypted = decryptJSON<typeof obj>(encrypted);
            expect(decrypted).toEqual(obj);
        });

        it('should throw error for null object', () => {
            expect(() => encryptJSON(null)).toThrow('Cannot encrypt null or undefined object');
        });
    });

    describe('hash', () => {
        it('should generate consistent hashes', () => {
            const data = 'test-data';
            const hash1 = hash(data);
            const hash2 = hash(data);

            expect(hash1).toBe(hash2);
            expect(hash1).toHaveLength(64); // SHA-256 produces 64 hex characters
        });

        it('should throw error for empty data', () => {
            expect(() => hash('')).toThrow('Cannot hash empty data');
        });
    });

    describe('generateToken', () => {
        it('should generate random tokens', () => {
            const token1 = generateToken();
            const token2 = generateToken();

            expect(token1).not.toBe(token2);
            expect(token1).toHaveLength(64); // 32 bytes = 64 hex characters
        });

        it('should generate tokens of specified length', () => {
            const token = generateToken(16);
            expect(token).toHaveLength(32); // 16 bytes = 32 hex characters
        });

        it('should throw error for invalid length', () => {
            expect(() => generateToken(0)).toThrow('Invalid token length');
            expect(() => generateToken(-1)).toThrow('Invalid token length');
        });
    });
});

