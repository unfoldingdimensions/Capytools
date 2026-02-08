export function getAIHeaders(): HeadersInit {
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };

    if (typeof window !== 'undefined') {
        const storedConfig = localStorage.getItem('ai-config');
        if (storedConfig) {
            try {
                headers['x-ai-config'] = btoa(storedConfig);
            } catch (e) {
                console.error('Failed to encode AI config', e);
            }
        }
    }
    return headers;
}
