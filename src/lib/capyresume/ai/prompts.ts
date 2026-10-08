/**
 * CapyResume — AI prompts.
 *
 * The system prompt is the most important text in the BYOK feature: the risk of
 * an AI résumé assistant is that it invents achievements a candidate cannot
 * defend in an interview. So rule one is that it may not add facts, and
 * "quantify" is written to sharpen wording rather than manufacture numbers.
 *
 * Pure module — no React, no network — so it is unit-tested directly.
 */

export type ImproveAction = 'tighten' | 'quantify' | 'grammar' | 'clarity';

export interface ActionSpec {
  id: ImproveAction;
  label: string;
  /** Shown under the action picker so the user knows what they are asking for. */
  hint: string;
  instruction: string;
}

export const IMPROVE_ACTIONS: readonly ActionSpec[] = [
  {
    id: 'tighten',
    label: 'Tighten it',
    hint: 'Shorter and more direct, without losing detail.',
    instruction:
      'Rewrite this résumé text so it is tighter and more direct. Remove filler and weak phrasing, but do not drop any real detail.',
  },
  {
    id: 'quantify',
    label: 'Lead with impact',
    hint: 'Front-load the result. Will not invent numbers.',
    instruction:
      'Rewrite this résumé text so the result or impact leads. Make any scale, scope or outcome already present clearer. Do NOT invent numbers, percentages or metrics — if the text contains no quantity, sharpen the wording instead.',
  },
  {
    id: 'grammar',
    label: 'Fix grammar and spelling',
    hint: 'The smallest possible correction.',
    instruction:
      'Correct the grammar, spelling and punctuation. Make the smallest change that fixes the problem and leave the wording otherwise identical.',
  },
  {
    id: 'clarity',
    label: 'Make it clearer',
    hint: 'Understandable in one reading.',
    instruction:
      'Rewrite this résumé text for clarity so a busy recruiter understands it in a single reading. Keep the same facts and the same level of seniority.',
  },
];

export function getAction(id: string): ActionSpec | undefined {
  return IMPROVE_ACTIONS.find((action) => action.id === id);
}

export const SYSTEM_PROMPT = [
  'You are a careful résumé editor. You rewrite one piece of text at a time for a CV.',
  '',
  'Rules, in order of importance:',
  '1. Never invent facts. Do not add numbers, percentages, employers, dates, technologies, job titles or achievements that the given text does not already support. If it contains no metric, do not manufacture one.',
  '2. Keep every proper noun, tool name, technology and job title exactly as written.',
  '3. Write in résumé style: no first person ("I", "my"), strong verb fragments, no trailing full stop on a bullet.',
  '4. Do not pad. The result should be the same length or shorter unless the instruction says otherwise.',
  '5. Preserve the writer’s meaning and seniority. Never inflate a small task into a strategic initiative.',
  '6. Plain, specific, professional English. No buzzwords, no corporate jargon, no emoji.',
  '7. If the text is already good, return it unchanged rather than inventing an improvement.',
  '',
  'Return only the rewritten text. No preamble, no explanation, no surrounding quotation marks, no alternative versions.',
].join('\n');

/**
 * Build the user turn. The field description matters: "a bullet under
 * Experience at Analyst, Northwind" gives the model enough grounding to keep the
 * register right without inviting it to write anything new.
 */
export function buildUserMessage(action: ActionSpec, fieldLabel: string, text: string): string {
  return [action.instruction, '', `This is ${fieldLabel}.`, '', 'Text to rewrite:', text].join(
    '\n'
  );
}
