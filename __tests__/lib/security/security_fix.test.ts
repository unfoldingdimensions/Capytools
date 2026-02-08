import { encrypt, decrypt } from '@/lib/security/encryption';
import crypto from 'crypto';

describe('Security Fix: Salted Key Derivation', () => {
    const ENCRYPTION_KEY = 'test-encryption-key-32-chars-long-here';

    beforeAll(() => {
        process.env.ENCRYPTION_KEY = ENCRYPTION_KEY;
    });

    it('should use a unique key for each encryption based on salt', () => {
        const plainText = 'Sensitive data';
        const encrypted1 = encrypt(plainText);
        const encrypted2 = encrypt(plainText);

        expect(encrypted1.salt).not.toBe(encrypted2.salt);

        // Even if we manually set the IV to be the same,
        // the ciphertexts should be different because the keys are different (due to different salts).
        // Since we can't easily force the IV in the current 'encrypt' function,
        // we can at least verify they both decrypt correctly.
        expect(decrypt(encrypted1)).toBe(plainText);
        expect(decrypt(encrypted2)).toBe(plainText);
    });

    it('should be backward compatible with deterministic salt encryption', () => {
        // Manually create an 'old' encrypted data object using deterministic salt
        const plainText = 'Old data';

        // Deterministic key derivation logic (vulnerable version)
        const deterministicSalt = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
        const key = crypto.pbkdf2Sync(ENCRYPTION_KEY, deterministicSalt, 100000, 32, 'sha256');

        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
        let encrypted = cipher.update(plainText, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag();

        const oldEncryptedData = {
            encrypted,
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex'),
            salt: 'some-random-salt-that-was-ignored', // Old data has random salt but it was ignored
        };

        // This should still work because of the fallback in decrypt()
        const decrypted = decrypt(oldEncryptedData);
        expect(decrypted).toBe(plainText);
    });

    it('should fail if the salt is tampered with for new encryptions', () => {
        const plainText = 'Tamper test';
        const encrypted = encrypt(plainText);

        // Change the salt
        const tamperedEncrypted = {
            ...encrypted,
            salt: crypto.randomBytes(32).toString('hex'),
        };

        // Decryption should fail because:
        // 1. Primary attempt with tampered salt will derive a wrong key.
        // 2. Fallback attempt with deterministic salt will also derive a wrong key.
        expect(() => decrypt(tamperedEncrypted)).toThrow();
    });
});
