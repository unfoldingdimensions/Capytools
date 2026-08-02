/**
 * Cleans common AI preambles and trailing commentary from generated text.
 *
 * Centralized so every AI service applies the same cleanup rules instead of
 * maintaining slightly-divergent copies.
 *
 * Pure module - no external dependencies.
 */

/**
 * Removes common AI preambles and explanatory text from responses.
 */
export function cleanAIResponse(text: string): string {
    let cleaned = text.trim();

    // Remove common preambles at the start
    const preambles = [
        /^Here is (a|an|the) (professional )?summary.*?:\s*/i,
        /^Here are (the )?(bullet points?|suggestions?).*?:\s*/i,
        /^Here'?s (a|an|the).*?:\s*/i,
        /^I'?ve (generated|created|written).*?:\s*/i,
        /^Based on.*?:\s*/i,
        /^Sure[,!]? (here'?s|here is).*?:\s*/i,
        /^Certainly[,!]? (here'?s|here is).*?:\s*/i,
        /^Role:.*?\n/i,
        /^(Position|Title|Job):.*?\n/i,
    ];

    for (const pattern of preambles) {
        cleaned = cleaned.replace(pattern, '');
    }

    // Remove explanatory notes and trailing text
    const trailingPatterns = [
        /\n\s*Note that this.*/is,
        /\n\s*This (summary|content).*/is,
        /\n\s*Let me know if you.*/is,
        /\n\s*Feel free to.*/is,
        /\n\s*I hope this.*/is,
        /\n\s*Please let me know.*/is,
        /\n\s*Would you like.*/is,
        /\n\s*If you need.*/is,
    ];

    for (const pattern of trailingPatterns) {
        cleaned = cleaned.replace(pattern, '');
    }

    return cleaned.trim();
}
