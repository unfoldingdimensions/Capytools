---
name: maintaining-skills
description: Updates and evolves existing skills based on new project rules, design decisions, or architectural constraints. Use ONLY when the user explicitly asks to "update a skill", "save this rule", or "remember this decision".
---

# Maintaining & Evolving Skills

## When to use this skill
- When the user explicitly says "Update the [X] skill".
- When the user says "Remember this for next time" or "Add this to our design system".
- When a new recurring pattern or rule is established and needs to be codified.

## Workflow

### 1. Discovery & Targeting
- **Analyze the Request**: Identify which domain the new rule applies to (e.g., UI -> `mastering-ui-design`, Testing -> `testing-code`, Plans -> `planning-implementation`).
- **Scan**: If unsure, list `.agent/skills/` to see available skills.
- **Read**: Use `view_file` to read the target `SKILL.md`.

### 2. Surgical Injection (The "Gardener" Approach)
Do NOT simply append to the end of the file. Find the **semantic home** for the new information:
- **New Constraints**: Add to `## Guidelines` or `## Best Practices`.
- **New Anti-Patterns**: Add to `## Common Pitfalls`.
- **New Process Steps**: Add to `## Workflow`.
- **New Templates**: Add to `## Templates` or create a new file in `examples/` if large.

### 3. Execution
- Use `replace_file_content` (for small, contiguous blocks) or `multi_replace_file_content` (for scattered updates).
- **Match Tone**: Ensure the new text uses the same formatting (bullet points, bold headers) as the existing file.
- **Deduplicate**: If a similar rule exists, update/refine it instead of creating a duplicate.

### 4. Verification
- Confirm: "I have updated `[skill-name]` to include: [Brief Summary]."

## Heuristics for Updates
- **Be Concise**: Don't add fluff. "Use `x` instead of `y`" is better than "It is recommended that developers utilize `x`..."
- **Be Specific**: "Use `gap-4`" is better than "Use standard spacing."
- **Code over Text**: If providing a pattern, use a code block.

## Example Scenarios

**Scenario: User bans blue buttons**
1. Target: `mastering-ui-design`
2. Section: `## Core Design Philosophy` or `## Common Pitfalls`
3. Action: Add "- **No Blue Buttons**: Functional colors are strictly forbidden."

**Scenario: User changes testing library**
1. Target: `planning-implementation`
2. Section: `## Tech Stack` or `## Workflow`
3. Action: Replace references of `jest` with `vitest`.
