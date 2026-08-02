/**
 * Client IP resolution.
 *
 * In a proxy chain each hop appends the address it received the request from, so
 * the LAST entry of X-Forwarded-For is the one added by our trusted edge. Reading
 * the FIRST entry trusts a client-controllable value, which lets callers spoof
 * their IP in audit logs and IP-based rate limiting.
 *
 * Pure module - no external dependencies.
 */

import { IncomingMessage } from 'http';

export function getClientIp(req: IncomingMessage): string {
    const forwarded = req.headers['x-forwarded-for'];

    if (typeof forwarded === 'string' && forwarded.trim().length > 0) {
        const parts = forwarded.split(',');
        const last = parts[parts.length - 1]?.trim();
        if (last) {
            return last;
        }
    }

    return req.socket.remoteAddress || 'unknown';
}
