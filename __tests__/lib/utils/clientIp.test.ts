import { getClientIp } from '@/lib/utils/clientIp';

function makeReq(headers: Record<string, unknown>, remoteAddress?: string) {
    return {
        headers,
        socket: { remoteAddress },
    } as unknown as import('http').IncomingMessage;
}

describe('getClientIp', () => {
    it('should use the last X-Forwarded-For entry (the proxy-appended one)', () => {
        const req = makeReq({ 'x-forwarded-for': '203.0.113.5, 70.41.3.18, 150.172.238.178' });
        expect(getClientIp(req)).toBe('150.172.238.178');
    });

    it('should handle a single X-Forwarded-For entry', () => {
        const req = makeReq({ 'x-forwarded-for': '203.0.113.5' });
        expect(getClientIp(req)).toBe('203.0.113.5');
    });

    it('should fall back to the socket remote address', () => {
        const req = makeReq({}, '127.0.0.1');
        expect(getClientIp(req)).toBe('127.0.0.1');
    });

    it('should return unknown when no IP is available', () => {
        const req = makeReq({});
        expect(getClientIp(req)).toBe('unknown');
    });
});
