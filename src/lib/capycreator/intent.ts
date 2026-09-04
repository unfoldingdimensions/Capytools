import { Intent, ModelFamily, Question, TaskType } from "./types";
import { MODEL_PROFILES } from "./profiles";

export const TASK_TYPES: Record<
  TaskType,
  {
    keywords: string[];
    emphasis: string[];
    questions: Record<string, string>;
  }
> = {
  design_review: {
    keywords: [
      "design review",
      "design crit",
      "ui review",
      "ux review",
      "visual review",
      "review the design",
      "design feedback",
    ],
    emphasis: ["current_state", "desired_state", "constraints", "output_format"],
    questions: {
      current_state:
        "What feels broken, off, or weak about the current design? (e.g. cramped layout, low contrast, inconsistent spacing)",
      desired_state:
        "What should 'good' look like when this is fixed? (e.g. clear visual hierarchy, accessible contrast, 8px grid)",
      constraints:
        "Any design system / DESIGN.md / brand guide / coding preferences it must follow? (files, tokens, frameworks)",
      references:
        "Link or describe the screens/components to review (or attach files).",
      output_format:
        "How should the review be delivered? (e.g. numbered severity-tagged report, before/after, checklist)",
      audience: "Who reads this review? (e.g. you, a designer, a stakeholder)",
      non_negotiables:
        "Hard 'do NOT' rules? (e.g. don't propose changes that break the design system, no new dependencies)",
    },
  },
  code_review: {
    keywords: [
      "code review",
      "review my code",
      "pr review",
      "review the pull",
      "review this function",
      "code quality",
    ],
    emphasis: ["current_state", "desired_state", "constraints", "output_format"],
    questions: {
      current_state:
        "What does the code do now, and what's the concern? (bug, smell, perf, security)",
      desired_state:
        "What does 'fixed/improved' look like? (passes lint, handles X, faster)",
      constraints:
        "Any coding standards / linters / style guide / language version it must follow?",
      references: "Link or paste the code / repo / file paths to review.",
      output_format:
        "Delivery format? (e.g. inline comments, prioritized list, diff suggestions)",
      audience: "Who acts on this? (you, a teammate, CI)",
      non_negotiables:
        "Hard 'do NOT' rules? (e.g. don't change public API, no new deps)",
    },
  },
  debugging: {
    keywords: [
      "debug",
      "fix this error",
      "traceback",
      "exception",
      "why is",
      "not working",
      "failing test",
      "stack trace",
    ],
    emphasis: ["current_state", "desired_state", "constraints"],
    questions: {
      current_state: "What are the exact symptoms + the full error / stack trace?",
      desired_state: "What is the expected behavior when fixed?",
      constraints:
        "Environment / versions / things you've already tried / must not break?",
      references: "Link or paste the repro, code, or logs.",
      output_format: "Want a root-cause explanation, a patch, or both?",
      audience: "Who applies the fix? (you, a teammate)",
      non_negotiables:
        "Hard 'do NOT' rules? (e.g. don't rewrite the module, keep the API stable)",
    },
  },
  writing: {
    keywords: [
      "write",
      "draft",
      "summarize",
      "summarise",
      "blog",
      "article",
      "email",
      "copy",
      "rewrite",
      "paraphrase",
    ],
    emphasis: ["desired_state", "audience", "constraints", "output_format"],
    questions: {
      current_state: "What source material or rough idea are you starting from?",
      desired_state:
        "What should the final piece achieve? (inform, persuade, entertain)",
      constraints: "Tone / voice / length / style / must-include points?",
      references: "Link or paste the source text / references.",
      output_format: "Format? (e.g. 300-word post, bullet summary, email)",
      audience: "Who is the reader? (technical, exec, general public)",
      non_negotiables: "Hard 'do NOT' rules? (e.g. no jargon, no em-dashes)",
    },
  },
  analysis: {
    keywords: [
      "analyze",
      "analyse",
      "analysis",
      "compare",
      "evaluate",
      "assess",
      "research",
      "pros and cons",
      "tradeoff",
    ],
    emphasis: ["desired_state", "constraints", "output_format"],
    questions: {
      current_state: "What data / artifact / situation are you analyzing?",
      desired_state:
        "What conclusion or decision should the analysis support?",
      constraints: "Frameworks / metrics / sources it must use or avoid?",
      references: "Link or paste the data / documents.",
      output_format: "Format? (e.g. comparison table, scored matrix, memo)",
      audience: "Who uses the analysis? (you, a stakeholder, a committee)",
      non_negotiables:
        "Hard 'do NOT' rules? (e.g. no unsupported claims, cite sources)",
    },
  },
  generic: {
    keywords: [],
    emphasis: ["current_state", "desired_state", "constraints", "output_format"],
    questions: {
      current_state:
        "What are you starting from, and what's the problem or gap?",
      desired_state: "What does a successful result look like?",
      constraints:
        "Any constraints, standards, or preferences it must respect?",
      references: "Any files, docs, or links it should use?",
      output_format: "What format do you want the output in?",
      audience: "Who is the audience for the result?",
      non_negotiables: "Any hard 'do NOT' rules?",
    },
  },
};

export function detectTaskType(ask: string): TaskType {
  if (!ask || typeof ask !== "string") return "generic";
  const normalized = ask.trim().toLowerCase();
  for (const [name, spec] of Object.entries(TASK_TYPES)) {
    if (name === "generic") continue;
    for (const kw of spec.keywords) {
      if (normalized.includes(kw)) {
        return name as TaskType;
      }
    }
  }
  return "generic";
}

const INTENT_DEFINING_DIMS = [
  "current_state",
  "desired_state",
  "constraints",
  "output_format",
  "non_negotiables",
];

export function requiredForTier(dimension: string, tier: number): boolean {
  if (!INTENT_DEFINING_DIMS.includes(dimension)) {
    return false;
  }
  if (tier <= 2) return true;
  if (tier === 3) return dimension !== "non_negotiables";
  return false;
}

export function buildQuestionnaire(
  ask: string,
  targetFamily: ModelFamily,
  tierOverride?: number
): Question[] {
  const taskType = detectTaskType(ask);
  const spec = TASK_TYPES[taskType];
  const profile = MODEL_PROFILES[targetFamily];
  const tier = tierOverride ?? profile?.capability_tier ?? 3;

  const questions: Question[] = [];
  const dimensions = [
    "current_state",
    "desired_state",
    "constraints",
    "references",
    "output_format",
    "audience",
    "non_negotiables",
  ];

  for (const dim of dimensions) {
    const qtext = spec.questions[dim];
    if (!qtext) continue;
    questions.push({
      id: dim,
      dimension: dim,
      text: qtext,
      required: requiredForTier(dim, tier),
      help: `task: ${taskType} · tier: ${tier}`,
    });
  }

  return questions;
}

export function buildIntent(
  ask: string,
  targetFamily: ModelFamily,
  answers: Record<string, string> = {},
  tierOverride?: number
): Intent {
  const taskType = detectTaskType(ask);
  const questions = buildQuestionnaire(ask, targetFamily, tierOverride);

  const intent: Intent = {
    raw_ask: ask.trim(),
    task_type: taskType,
    current_state: "",
    desired_state: "",
    constraints: "",
    references: "",
    output_format: "",
    audience: "",
    non_negotiables: "",
  };

  for (const q of questions) {
    const val = answers[q.id];
    if (val && typeof val === "string") {
      (intent as unknown as Record<string, string>)[q.dimension] = val.trim();
    }
  }

  return intent;
}
