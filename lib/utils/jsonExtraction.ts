/**
 * Robust JSON extraction from AI responses.
 *
 * Models frequently wrap JSON in prose, markdown fences, or preambles. This module
 * extracts the first valid JSON object/array from a response instead of trusting
 * the whole output to be parseable. Used by both the OpenAI and Gemini service
 * layers so behavior stays identical across providers.
 *
 * Pure module - no external dependencies.
 */

/**
 * Parses the first valid JSON object or array found in a text response.
 *
 * Strategy:
 * 1. Trim and strip markdown code fences.
 * 2. Try parsing the whole text as JSON (fast path for clean responses).
 * 3. Otherwise, scan every `{`/`[` candidate and extract the balanced structure
 *    (respecting strings and escapes), returning the first candidate that parses.
 *    This tolerates prose before/after the JSON, including prose that contains
 *    braces or brackets.
 *
 * @throws {Error} If no valid JSON value can be extracted.
 */
export function parseJsonFromText<T>(text: string): T {
    let content = (text || '').trim();

    // Strip markdown code fences (```json ... ```)
    if (content.startsWith('```')) {
        const fenceMatch = content.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
        if (fenceMatch && fenceMatch[1]) {
            content = fenceMatch[1].trim();
        } else {
            content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        }
    }

    // Fast path: the entire response is already valid JSON.
    try {
        return JSON.parse(content) as T;
    } catch {
        // Fall through to candidate extraction.
    }

    // Collect candidate start positions (every opening brace/bracket).
    const starts: number[] = [];
    for (let i = 0; i < content.length; i++) {
        const ch = content[i];
        if (ch === '{' || ch === '[') {
            starts.push(i);
        }
    }

    for (const start of starts) {
        const end = findBalancedEnd(content, start);
        if (end === -1) continue;

        const candidate = content.substring(start, end + 1);
        try {
            return JSON.parse(candidate) as T;
        } catch {
            // Not a valid JSON value at this position; try the next candidate.
        }
    }

    throw new Error('No valid JSON object or array found in response');
}

/**
 * Returns the index of the closing bracket that balances the opening bracket at
 * `startIndex`, ignoring characters inside string literals.
 */
function findBalancedEnd(text: string, startIndex: number): number {
    const opening = text[startIndex];
    const closing = opening === '{' ? '}' : ']';
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = startIndex; i < text.length; i++) {
        const ch = text[i];

        if (inString) {
            if (escaped) {
                escaped = false;
            } else if (ch === '\\') {
                escaped = true;
            } else if (ch === '"') {
                inString = false;
            }
            continue;
        }

        if (ch === '"') {
            inString = true;
            continue;
        }

        if (ch === opening) {
            depth++;
        } else if (ch === closing) {
            depth--;
            if (depth === 0) {
                return i;
            }
        }
    }

    return -1;
}
