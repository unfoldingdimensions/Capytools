import { parseJsonFromText } from '@/lib/utils/jsonExtraction';

describe('parseJsonFromText', () => {
    it('should parse a clean JSON object', () => {
        expect(parseJsonFromText('{"a": 1, "b": "two"}')).toEqual({ a: 1, b: 'two' });
    });

    it('should parse a clean JSON array', () => {
        expect(parseJsonFromText('["one", "two"]')).toEqual(['one', 'two']);
    });

    it('should strip markdown code fences', () => {
        const fenced = '```json\n{"a": 1}\n```';
        expect(parseJsonFromText(fenced)).toEqual({ a: 1 });
    });

    it('should extract JSON from prose before the value', () => {
        expect(parseJsonFromText('Here is your result: {"a": 1}')).toEqual({ a: 1 });
    });

    it('should ignore braces that appear in prose before the JSON', () => {
        // The old logic took the first "{" which is inside the prose.
        expect(parseJsonFromText('Something {placeholder} then {"a": 1}')).toEqual({ a: 1 });
    });

    it('should ignore trailing prose after the JSON', () => {
        expect(parseJsonFromText('{"a": 1}\n\nHope this helps!')).toEqual({ a: 1 });
    });

    it('should extract an array surrounded by prose', () => {
        expect(parseJsonFromText('The bullets are: ["a", "b"] thanks!')).toEqual(['a', 'b']);
    });

    it('should respect string literals containing braces and brackets', () => {
        expect(parseJsonFromText('{"a": "{x}", "b": "[y]"}')).toEqual({ a: '{x}', b: '[y]' });
    });

    it('should throw when no JSON is present', () => {
        expect(() => parseJsonFromText('Sorry, I cannot do that.')).toThrow(/No valid JSON/);
    });
});
