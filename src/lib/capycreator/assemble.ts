import { Intent, ModelProfile } from "./types";

function has(v: string): boolean {
  return Boolean(v && v.trim().length > 0);
}

function roleBlock(profile: ModelProfile, intent: Intent): string {
  const fam = profile.family || profile.id || "assistant";
  return `You are a senior, meticulous ${fam} assistant executing a ${intent.task_type.replace(/_/g, " ")} task.`;
}

function stepsBlock(intent: Intent): string {
  const steps: string[] = [];
  if (has(intent.current_state)) {
    steps.push(`Review the starting point: ${intent.current_state}`);
  }
  steps.push("Carry out the task precisely as specified.");
  if (has(intent.desired_state)) {
    steps.push(`Confirm the result matches: ${intent.desired_state}`);
  }
  if (has(intent.non_negotiables)) {
    steps.push(`Respect these hard limits: ${intent.non_negotiables}`);
  }

  const lines = steps.map((s, idx) => `${idx + 1}. ${s}`);
  return "Steps:\n" + lines.join("\n");
}

function constraintsBlock(intent: Intent, profile: ModelProfile): string {
  const parts: string[] = [];
  if (has(intent.audience)) {
    parts.push(`Target audience: ${intent.audience}`);
  }
  if (has(intent.constraints)) {
    parts.push(`Follow these constraints: ${intent.constraints}`);
  }
  if (has(intent.references)) {
    parts.push(`Use these references as authoritative: ${intent.references}`);
  }

  const principles = profile.prompt_principles?.do || [];
  for (const p of principles.slice(0, 2)) {
    if (typeof p === "string") {
      const lower = p.toLowerCase();
      if (
        lower.includes("schema") ||
        lower.includes("json") ||
        lower.includes("few-shot") ||
        lower.includes("xml") ||
        lower.includes("developer") ||
        lower.includes("system")
      ) {
        parts.push(`Family guidance: ${p}`);
      }
    }
  }

  if (parts.length === 0) return "";
  return "Constraints:\n" + parts.map((p) => `- ${p}`).join("\n");
}

function outputFormatBlock(intent: Intent): string {
  if (has(intent.output_format)) {
    return `Output format: ${intent.output_format}`;
  }
  return "Output format: deliver the result clearly and completely.";
}

function negativeBlock(intent: Intent): string {
  const negs: string[] = [];
  if (has(intent.non_negotiables)) {
    negs.push(intent.non_negotiables);
  }
  negs.push("Do not add commentary, disclaimers, or explanations outside the requested artifact.");
  negs.push("Do not invent facts, fields, or values not present in the input/references.");
  return "Do NOT:\n" + negs.map((n) => `- ${n}`).join("\n");
}

export function assemble(
  intent: Intent,
  profile: ModelProfile,
  tierOverride?: number
): string {
  const tier = tierOverride ?? profile.capability_tier ?? 3;
  const lines: string[] = [];

  // 1. Role (scaffolding tier <= 3)
  if (tier <= 3) {
    lines.push(roleBlock(profile, intent));
    lines.push("");
  }

  // 2. Restated task
  lines.push(`Task: ${intent.task_type.replace(/_/g, " ")}`);
  if (has(intent.current_state)) {
    lines.push(`Context / what's wrong or the starting point: ${intent.current_state}`);
  }
  if (has(intent.desired_state)) {
    lines.push(`Goal / what 'good' looks like: ${intent.desired_state}`);
  }
  lines.push("");

  // 3. Explicit steps (flash/weak tier <= 3)
  if (tier <= 3) {
    lines.push(stepsBlock(intent));
    lines.push("");
  }

  // 4. Constraints + references
  const cb = constraintsBlock(intent, profile);
  if (cb) {
    lines.push(cb);
    lines.push("");
  }

  // 5. Output format
  lines.push(outputFormatBlock(intent));
  lines.push("");

  // 6. Negative constraints
  if (tier <= 2) {
    lines.push(negativeBlock(intent));
    lines.push("");
    lines.push("Respond with ONLY the requested artifact. No prose before or after it.");
  } else if (tier === 3) {
    lines.push("Be concise. Output only the requested artifact.");
  } else {
    // Frontier tier 4-5
    lines.push("Proceed directly and use your judgment to satisfy the intent above.");
  }

  return lines.join("\n").trim() + "\n";
}
