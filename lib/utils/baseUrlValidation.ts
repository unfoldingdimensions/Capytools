/**
 * BYOK base URL validation.
 *
 * The server makes outbound AI requests to a base URL supplied by the client via
 * the `x-ai-config` header. Without validation, an authenticated user could point
 * the server at internal services or cloud-metadata endpoints (SSRF). This module
 * is the SSRF guard for any user-controlled base URL.
 *
 * Pure module - no external dependencies.
 */

const IPV4_LITERAL_PATTERN = /^\d{1,3}(\.\d{1,3}){3}$/;

/**
 * Hostname suffix services commonly used for DNS rebinding / "hostname as IP"
 * SSRF tricks (e.g. `127.0.0.1.nip.io` resolves to 127.0.0.1).
 */
const REBINDING_SUFFIXES = [
    '.nip.io',
    '.sslip.io',
    '.xip.io',
    '.localtest.me',
    '.lvh.me',
    '.traefik.me',
];

function isIpv4Literal(hostname: string): boolean {
    return IPV4_LITERAL_PATTERN.test(hostname);
}

function isLoopback(hostname: string): boolean {
    return (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '::1' ||
        hostname === '0:0:0:0:0:0:0:1'
    );
}

function hasRebindingSuffix(hostname: string): boolean {
    return REBINDING_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
}

/**
 * Validates a user-supplied AI provider base URL before the server connects to it.
 *
 * - The `gemini` routing marker (not a URL) is passed through unchanged.
 * - Credentials in the URL are rejected.
 * - Loopback hosts are only allowed for local development (never in production).
 * - IP literals (IPv4/IPv6), private/reserved ranges, and DNS-rebinding hostnames
 *   are always blocked.
 * - Non-loopback traffic must use HTTPS.
 *
 * @throws {Error} If the base URL is not safe to connect to.
 * @returns The (possibly normalized) base URL, or undefined when absent.
 */
export function validateBaseURL(baseURL: string | undefined): string | undefined {
    if (!baseURL) {
        return undefined;
    }

    // The special 'gemini' provider marker is not a URL and is handled by the Gemini SDK.
    if (baseURL === 'gemini') {
        return baseURL;
    }

    if (!/^https?:\/\//i.test(baseURL)) {
        throw new Error('AI provider base URL must be an HTTPS URL or the "gemini" marker');
    }

    let parsed: URL;
    try {
        parsed = new URL(baseURL);
    } catch {
        throw new Error('AI provider base URL is not a valid URL');
    }

    if (parsed.username || parsed.password) {
        throw new Error('AI provider base URL must not contain credentials');
    }

    const host = (parsed.hostname || '').replace(/^\[|\]$/g, '').toLowerCase();

    // Local dev proxies (e.g. Ollama at http://localhost:11434) are allowed outside production.
    if (process.env.NODE_ENV !== 'production' && isLoopback(host)) {
        return baseURL;
    }

    if (isLoopback(host)) {
        throw new Error('AI provider base URL must not point to localhost');
    }

    if (isIpv4Literal(host) || host.includes(':')) {
        throw new Error('AI provider base URL must use a hostname, not an IP address');
    }

    if (hasRebindingSuffix(host)) {
        throw new Error('AI provider base URL host is not allowed');
    }

    if (parsed.protocol !== 'https:') {
        throw new Error('AI provider base URL must use HTTPS');
    }

    return baseURL;
}
