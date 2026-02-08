---
name: humanising-ai-output
description: Techniques and prompts to make AI-generated text sound more natural, human-like, and less robotic. Use this skill when the user wants to improve the tone, style, or "humanness" of AI outputs, or when crafting system prompts for conversational agents.
---

# Humanising AI Output

This skill provides strategies and prompt engineering techniques to transform robotic AI text into natural, engaging, human-like communication.

## Core Techniques

### 1. Style & Structure Variation
- **Burstiness**: Vary sentence length and structure. Mix short, punchy sentences with longer, flowing complex sentences.
- **Rhythm**: Avoid the monotonous "Subject-Verb-Object" pattern. Start sentences with prepositions, conjunctions, or adverbs.
- **Fragments**: Occasionally use sentence fragments for emphasis (e.g., "Not really.", "Exactly.").

### 2. Conversational Tone
- **Contractions**: ALWAYS use contractions (e.g., "you're", "can't", "we'll") instead of full forms ("you are", "cannot", "we will").
- **Everyday Language**: Use simple, accessible words. Avoid academic or corporate jargon unless the persona specifically demands it.
- **Direct Address**: Speak *to* the reader ("you"), not *at* them.
- **Rhetorical Questions**: Use them to engage the reader's thought process (e.g., "Why does this matter?", "So, what's next?").
- **Hesitations & Fillers**: In very casual contexts, include "well," "you know," or "actually" to simulate spoken thought (use sparingly).

### 3. "Anti-Robot" Rules (Negative Constraints)
Explicitly forbid common AI quirks:
- **No transitions**: Ban "In conclusion," "Furthermore," "Moreover," "It is important to note."
- **No buzzwords**: Ban "delve," "leverage," "traverse," "tapestry," "orchestrate," "game-changing."
- **No preaching**: Avoid "Remember that..." or "Ultimately..." moralizing at the end.
- **No hedging**: Reduce excessive "it seems," "typically," "generally" unless accuracy requires it.

### 4. Emotional Intelligence
- **Opinions**: Allow the AI to express a subjective "I feel" or "I think" (where appropriate).
- **Empathy**: Acknowledge the user's struggle or excitement (e.g., "This stuff is tricky, I know.").
- **Humor**: Inject light wit or self-deprecation if the context allows.

## Implementation Workflow

1.  **Define the Persona**: Who is speaking? (See `resources/persona-templates.md`)
2.  **Apply Constraints**: Add the "Anti-Robot" instruction block to your system prompt.
3.  **Provide Examples (Few-Shot Prompting)**: Show the AI *exactly* what you want.
    - *Bad*: "The weather is nice."
    - *Good*: "Man, what a beautiful day out there."
4.  **Iterate & Polish**: Check against `resources/anti-robot-checklist.md`.

## Example System Prompt Fragment

```markdown
You are a senior writing coach. 
Tone: Conversational, direct, witty.
Voice: Use contractions. Vary sentence length. Be punchy.
Constraints: 
- NEVER use words like "delve", "leverage", "realm", "tapestry".
- NEVER say "In conclusion" or "It is critical to remember".
- Write like you're talking to a colleague over coffee.
```

## Resources

- `resources/anti-robot-checklist.md`: A checklist to review AI output.
- `resources/persona-templates.md`: Ready-to-use personas for different contexts.
