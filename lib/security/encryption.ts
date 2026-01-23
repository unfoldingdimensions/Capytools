import crypto from 'crypto';

/**
 * AES-256-GCM Encryption Utilities
 * 
 * CRITICAL: This module implements fail-loud error handling.
 * All encryption/decryption failures throw detailed errors.
 * Never use fallback data or silent failures.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // 256 bits

interface EncryptedData {
    encrypted: string;
    iv: string;
    authTag: string;
    salt: string;
}

/**
 * Gets the encryption key from environment variables
 * @throws {Error} If ENCRYPTION_KEY is not set or invalid
 */
function getEncryptionKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY;

    if (!key) {
        throw new Error(
            'ENCRYPTION_KEY environment variable is not set. ' +
            'This is a critical security requirement. ' +
            'Generate a key with: openssl rand -base64 32'
        );
    }

    if (key.length < 32) {
        throw new Error(
            `ENCRYPTION_KEY is too short (${key.length} characters). ` +
            'Must be at least 32 characters for AES-256 encryption.'
        );
    }

    try {
        // Derive a 256-bit key using PBKDF2
        const salt = crypto.createHash('sha256').update(key).digest();
        return crypto.pbkdf2Sync(key, salt, 100000, 32, 'sha256');
    } catch (error) {
        throw new Error(
            `Failed to derive encryption key: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}

/**
 * Encrypts data using AES-256-GCM
 * @param data - Plain text data to encrypt
 * @returns Encrypted data object with IV, auth tag, and salt
 * @throws {Error} If encryption fails for any reason
 */
export function encrypt(data: string): EncryptedData {
    if (!data) {
        throw new Error('Cannot encrypt empty data. Data parameter is required.');
    }

    try {
        const key = getEncryptionKey();
        const iv = crypto.randomBytes(IV_LENGTH);
        const salt = crypto.randomBytes(SALT_LENGTH);

        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const authTag = cipher.getAuthTag();

        return {
            encrypted,
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex'),
            salt: salt.toString('hex'),
        };
    } catch (error) {
        throw new Error(
            `Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
            `Data length: ${data.length} characters.`
        );
    }
}

/**
 * Decrypts data encrypted with AES-256-GCM
 * @param encryptedData - Encrypted data object
 * @returns Decrypted plain text
 * @throws {Error} If decryption fails or data is tampered
 */
export function decrypt(encryptedData: EncryptedData): string {
    if (!encryptedData || !encryptedData.encrypted || !encryptedData.iv || !encryptedData.authTag) {
        throw new Error(
            'Invalid encrypted data structure. Required fields: encrypted, iv, authTag. ' +
            `Received: ${JSON.stringify(Object.keys(encryptedData))}`
        );
    }

    try {
        const key = getEncryptionKey();
        const decipher = crypto.createDecipheriv(
            ALGORITHM,
            key,
            Buffer.from(encryptedData.iv, 'hex')
        );

        decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

        let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        throw new Error(
            `Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
            'This may indicate data tampering or corruption. ' +
            `Encrypted data length: ${encryptedData.encrypted.length} characters.`
        );
    }
}

/**
 * Encrypts a JSON object
 * @param obj - Object to encrypt
 * @returns Encrypted string representation
 * @throws {Error} If serialization or encryption fails
 */
export function encryptJSON<T>(obj: T): string {
    if (obj === null || obj === undefined) {
        throw new Error('Cannot encrypt null or undefined object.');
    }

    try {
        const jsonString = JSON.stringify(obj);
        const encrypted = encrypt(jsonString);
        return JSON.stringify(encrypted);
    } catch (error) {
        throw new Error(
            `Failed to encrypt JSON object: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
            `Object type: ${typeof obj}`
        );
    }
}

/**
 * Decrypts a JSON object
 * @param encryptedString - Encrypted string representation
 * @returns Decrypted object
 * @throws {Error} If decryption or deserialization fails
 */
export function decryptJSON<T>(encryptedString: string): T {
    if (!encryptedString) {
        throw new Error('Cannot decrypt empty string.');
    }

    try {
        const encryptedData = JSON.parse(encryptedString) as EncryptedData;
        const decrypted = decrypt(encryptedData);
        return JSON.parse(decrypted) as T;
    } catch (error) {
        throw new Error(
            `Failed to decrypt JSON: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
            `Input length: ${encryptedString.length} characters.`
        );
    }
}

/**
 * Hashes data using SHA-256
 * @param data - Data to hash
 * @returns Hex-encoded hash
 * @throws {Error} If hashing fails
 */
export function hash(data: string): string {
    if (!data) {
        throw new Error('Cannot hash empty data.');
    }

    try {
        return crypto.createHash('sha256').update(data).digest('hex');
    } catch (error) {
        throw new Error(
            `Hashing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}

/**
 * Generates a secure random token
 * @param length - Length in bytes (default 32)
 * @returns Hex-encoded random token
 * @throws {Error} If token generation fails
 */
export function generateToken(length: number = 32): string {
    if (length <= 0) {
        throw new Error(`Invalid token length: ${length}. Must be greater than 0.`);
    }

    try {
        return crypto.randomBytes(length).toString('hex');
    } catch (error) {
        throw new Error(
            `Token generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}

