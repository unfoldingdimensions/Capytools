export type ModelFamily =
  | "claude"
  | "deepseek"
  | "gemini"
  | "glm"
  | "gpt"
  | "hunyuan"
  | "qwen";

export interface ModelProfile {
  id: ModelFamily;
  vendor: string;
  family: string;
  capability_tier: number;
  instruction_derivation: "low" | "med-low" | "med" | "med-high" | "high";
  flagship_models: string[];
  flash_variants: string[];
  prompt_principles: {
    do: string[];
    dont: string[];
  };
  failure_modes: string[];
  structured_output?: {
    supported: boolean;
    method: string;
  };
  context_window?: number;
  notes?: string;
}

export type TaskType =
  | "design_review"
  | "code_review"
  | "debugging"
  | "writing"
  | "analysis"
  | "generic";

export interface Question {
  id: string;
  dimension: string;
  text: string;
  required: boolean;
  help?: string;
}

export interface Intent {
  raw_ask: string;
  task_type: TaskType;
  current_state: string;
  desired_state: string;
  constraints: string;
  references: string;
  output_format: string;
  audience: string;
  non_negotiables: string;
}

export type { LlmProvider as PolishProvider, LlmSettings as PolishSettings } from "@/lib/capytools/llm";
