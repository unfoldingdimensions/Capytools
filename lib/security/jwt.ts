import { SignJWT, jwtVerify } from 'jose';

/**
 * JWT Token Management
 * 
 * CRITICAL: Fail-loud error handling for all JWT operations.
 * Never return fallback values or silently fail.
 */

const JWT_ALGORITHM = 'HS256';
const DEFAULT_EXPIRATION = '7d'; // 7 days

interface JWTPayload {
    userId: string;
    email: string;
    role?: string;
    [key: string]: unknown;
}

/**
 * Gets the JWT secret from environment variables
 * @throws {Error} If JWT_SECRET is not set or invalid
 */
function getJWTSecret(): Uint8Array {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        throw new Error(
            'JWT_SECRET environment variable is not set. ' +
            'This is a critical security requirement. ' +
            'Generate a secret with: openssl rand -base64 32'
        );
    }

    if (secret.length < 32) {
        throw new Error(
            `JWT_SECRET is too short (${secret.length} characters). ` +
            'Must be at least 32 characters for secure JWT signing.'
        );
    }

    return new TextEncoder().encode(secret);
}

/**
 * Signs a JWT token
 * @param payload - Token payload
 * @param expiresIn - Expiration time (default: 7d)
 * @returns Signed JWT token
 * @throws {Error} If signing fails
 */
export async function signToken(
    payload: JWTPayload,
    expiresIn: string = DEFAULT_EXPIRATION
): Promise<string> {
    if (!payload.userId) {
        throw new Error(
            'Invalid JWT payload: userId is required. ' +
            `Received payload keys: ${Object.keys(payload).join(', ')}`
        );
    }

    if (!payload.email) {
        throw new Error(
            'Invalid JWT payload: email is required. ' +
            `Received payload keys: ${Object.keys(payload).join(', ')}`
        );
    }

    try {
        const secret = getJWTSecret();
        const token = await new SignJWT(payload)
            .setProtectedHeader({ alg: JWT_ALGORITHM })
            .setIssuedAt()
            .setExpirationTime(expiresIn)
            .sign(secret);

        return token;
    } catch (error) {
        throw new Error(
            `JWT signing failed: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
            `Payload: ${JSON.stringify({ userId: payload.userId, email: payload.email })}`
        );
    }
}

/**
 * Verifies and decodes a JWT token
 * @param token - JWT token to verify
 * @returns Decoded payload
 * @throws {Error} If verification fails or token is invalid/expired
 */
export async function verifyToken(token: string): Promise<JWTPayload> {
    if (!token) {
        throw new Error('Cannot verify empty token. Token is required.');
    }

    try {
        const secret = getJWTSecret();
        const { payload } = await jwtVerify(token, secret, {
            algorithms: [JWT_ALGORITHM],
        });

        if (!payload.userId || !payload.email) {
            throw new Error(
                'Invalid token payload: missing required fields (userId, email). ' +
                `Received keys: ${Object.keys(payload).join(', ')}`
            );
        }

        return payload as JWTPayload;
    } catch (error) {
        if (error instanceof Error) {
            if (error.message.includes('expired')) {
                throw new Error('JWT token has expired. Please login again.');
            }
            if (error.message.includes('signature')) {
                throw new Error('JWT token signature verification failed. Token may be tampered.');
            }
            throw new Error(`JWT verification failed: ${error.message}`);
        }
        throw new Error('JWT verification failed: Unknown error');
    }
}

/**
 * Extracts token from Authorization header
 * @param authHeader - Authorization header value
 * @returns Token string
 * @throws {Error} If header is invalid or missing
 */
export function extractTokenFromHeader(authHeader: string | undefined): string {
    if (!authHeader) {
        throw new Error('Authorization header is missing. Header is required for authentication.');
    }

    const parts = authHeader.split(' ');

    if (parts.length !== 2) {
        throw new Error(
            `Invalid Authorization header format. Expected "Bearer <token>", got "${authHeader}"`
        );
    }

    const [scheme, token] = parts;

    if (scheme !== 'Bearer') {
        throw new Error(
            `Invalid Authorization scheme. Expected "Bearer", got "${scheme}"`
        );
    }

    if (!token) {
        throw new Error('Token is missing in Authorization header.');
    }

    return token;
}

/**
 * Creates a refresh token (longer expiration)
 * @param payload - Token payload
 * @returns Signed refresh token
 * @throws {Error} If signing fails
 */
export async function createRefreshToken(payload: JWTPayload): Promise<string> {
    return signToken(payload, '30d'); // 30 days for refresh tokens
}

