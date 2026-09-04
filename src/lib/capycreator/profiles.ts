import { ModelFamily, ModelProfile } from "./types";

export const MODEL_PROFILES: Record<ModelFamily, ModelProfile> = {
  claude: {
    id: "claude",
    vendor: "Anthropic",
    family: "Claude",
    capability_tier: 4,
    instruction_derivation: "high",
    flagship_models: ["claude-3-7-sonnet", "claude-3-5-sonnet", "claude-3-opus"],
    flash_variants: ["claude-3-5-haiku", "claude-3-haiku"],
    prompt_principles: {
      do: [
        "Use explicit XML tags (<context>, <instructions>, <rules>) to structure documents.",
        "Put critical instructions and constraints near the end of the user prompt.",
        "Give Claude explicit permission to use thinking tags or chain of thought for complex reasoning.",
        "Provide 1-2 few-shot exemplars enclosed in <example> tags.",
      ],
      dont: [
        "Don't over-constrain high-tier Claude models with unnecessary negative rules.",
        "Don't mix system-level role definitions with user instructions when system role is available.",
      ],
    },
    failure_modes: [
      "Over-refusal on ambiguous or edge-case sensitive topics without explicit framing.",
      "Sycophancy under leading user assumptions without an explicit neutral bias directive.",
    ],
    context_window: 200000,
  },
  deepseek: {
    id: "deepseek",
    vendor: "DeepSeek",
    family: "DeepSeek",
    capability_tier: 4,
    instruction_derivation: "med-high",
    flagship_models: ["deepseek-r1", "deepseek-v3"],
    flash_variants: ["deepseek-coder-lite", "deepseek-distill-qwen-8b"],
    prompt_principles: {
      do: [
        "State the core objective concisely; let native reasoning handle multi-step deduction.",
        "Preserve native reasoning trace (<think> tags) on reasoning variants.",
        "Use markdown headers and structured lists for complex queries.",
      ],
      dont: [
        "Don't enforce rigid step-by-step thinking for R1 (it degrades native self-reflection).",
        "Don't use few-shot examples that dictate reasoning style to R1.",
      ],
    },
    failure_modes: [
      "Chain-of-thought contamination when strict JSON output is requested with thinking enabled.",
      "Repetitive phrasing if temperature is set too low on open reasoning models.",
    ],
    context_window: 128000,
  },
  gemini: {
    id: "gemini",
    vendor: "Google",
    family: "Gemini",
    capability_tier: 2, // Default rated for flash variant
    instruction_derivation: "med",
    flagship_models: ["gemini-2.5-pro", "gemini-3.1-pro-preview"],
    flash_variants: ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-lite"],
    prompt_principles: {
      do: [
        "State role and task directly; Gemini 2.5/3 is efficient and direct by default.",
        "Include 1-3 consistent few-shot examples (Google's explicit recommendation).",
        "For Flash: state role/goal, exact output schema, and numbered step list.",
        "Put hard constraints as the final directive before execution.",
      ],
      dont: [
        "Don't rely on Flash/Flash-Lite to infer implicit constraints or unstated context.",
        "Don't repeat schema descriptions in the body text when a schema parameter is present.",
      ],
    },
    failure_modes: [
      "Flash drops format/constraints without explicit schema and negative rules.",
      "Ignores buried instructions in long prompts (recency bias to first and last instructions).",
      "Wraps structured output in polite prose without strict negative directives.",
    ],
    context_window: 1000000,
  },
  glm: {
    id: "glm",
    vendor: "Zhipu AI",
    family: "GLM",
    capability_tier: 3,
    instruction_derivation: "med",
    flagship_models: ["GLM-4-Plus", "GLM-4-Air", "GLM-Zero-Preview"],
    flash_variants: ["GLM-4-Flash", "GLM-4-9B-Chat"],
    prompt_principles: {
      do: [
        "Use clear role specification and delimited instructions.",
        "For Flash variants, provide explicit input-output boundaries and few-shot examples.",
        "State target output format and schema strictly.",
      ],
      dont: [
        "Don't assume deep reasoning on GLM-4-Flash without explicit steps.",
      ],
    },
    failure_modes: [
      "Reverting to conversational prose without strict negative constraints.",
    ],
    context_window: 128000,
  },
  gpt: {
    id: "gpt",
    vendor: "OpenAI",
    family: "GPT",
    capability_tier: 2, // Default rated for mini/nano variants
    instruction_derivation: "med",
    flagship_models: ["gpt-5", "o3", "o1", "gpt-4o"],
    flash_variants: ["gpt-4o-mini", "gpt-3.5-turbo"],
    prompt_principles: {
      do: [
        "Use clear markdown headings (### Instructions, ### Constraints, ### Output Format).",
        "For Mini variants, specify explicit numbered steps and negative boundaries.",
        "On reasoning models (o1/o3), keep prompts intent-focused and avoid hand-holding steps.",
      ],
      dont: [
        "Don't over-specify steps for o1/o3 reasoning models.",
        "Don't expect Mini models to adhere to complex constraints without few-shot guidance.",
      ],
    },
    failure_modes: [
      "Mini models drifting into generic explanations without 'Respond with ONLY the artifact'.",
      "Over-scaffolding reasoning models causing degraded inference depth.",
    ],
    context_window: 128000,
  },
  hunyuan: {
    id: "hunyuan",
    vendor: "Tencent",
    family: "Hunyuan",
    capability_tier: 3,
    instruction_derivation: "low",
    flagship_models: ["HY4", "HY3", "Hunyuan-Large"],
    flash_variants: ["HY3-free", "Hunyuan-A13B"],
    prompt_principles: {
      do: [
        "Over-specify structure, schema, steps, and negative constraints.",
        "Put critical rules in the user turn as well as the system prompt.",
        "End with explicit 'Respond with ONLY the requested artifact. No markdown. No commentary.'",
      ],
      dont: [
        "Don't rely on HY3-free to infer implied constraints or nuances.",
        "Don't leave thinking mode enabled when strict programmatic output is required.",
      ],
    },
    failure_modes: [
      "Loses format on prompts with more than 3 simultaneous constraints.",
      "Literal over-interpretation prioritizing phrasing over practical intent.",
    ],
    context_window: 256000,
  },
  qwen: {
    id: "qwen",
    vendor: "Alibaba (QwenLM)",
    family: "Qwen",
    capability_tier: 3,
    instruction_derivation: "med",
    flagship_models: ["Qwen-Max", "Qwen2.5-72B-Instruct", "Qwen3-235B"],
    flash_variants: ["Qwen-Turbo", "Qwen2.5-7B-Instruct", "Qwen3-8B"],
    prompt_principles: {
      do: [
        "State output schema explicitly in the system or instruction block.",
        "For small Qwen models, add 1-2 few-shot exemplars (they learn patterns from examples).",
        "Explicitly pin the output language (e.g., 'Respond in English') to prevent code-switching.",
      ],
      dont: [
        "Don't rely on small Qwen variants to deduce constraints from a loose prompt.",
      ],
    },
    failure_modes: [
      "Format drift and trailing commentary on open-weight models without strict negative bounds.",
      "Multilingual code-switching on ambiguous technical queries.",
    ],
    context_window: 131072,
  },
};

export const FAMILIES: ModelProfile[] = Object.values(MODEL_PROFILES);
