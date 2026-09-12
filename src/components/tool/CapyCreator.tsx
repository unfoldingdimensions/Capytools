"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useReducedMotion } from "motion/react";
import {
  ArrowRight,
  Check,
  Copy,
  Download,
  Key,
  RotateCcw,
  Settings,
  Sparkles,
} from "lucide-react";

import {
  FAMILIES,
  MODEL_PROFILES,
} from "@/lib/capycreator/profiles";
import {
  buildIntent,
  buildQuestionnaire,
  detectTaskType,
} from "@/lib/capycreator/intent";
import { assemble } from "@/lib/capycreator/assemble";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import {
  getDefaultSettings,
  getStoredSettings,
  polishPrompt,
  PROVIDER_PRESETS,
  saveStoredSettings,
  testConnection,
} from "@/lib/capycreator/polish";
import {
  ModelFamily,
  PolishProvider,
  PolishSettings,
  Question,
} from "@/lib/capycreator/types";

import { Button } from "@/components/ui/button";
import { StageCard, StageChip } from "@/components/stage-card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const TIER_OPTIONS = [
  { id: "auto", label: "Auto (Default)" },
  { id: "1", label: "Tier 1 (Small)" },
  { id: "2", label: "Tier 2 (Flash)" },
  { id: "3", label: "Tier 3 (Mid)" },
  { id: "4", label: "Tier 4 (High)" },
  { id: "5", label: "Tier 5 (Frontier)" },
];

export function CapyCreator() {
  const reduced = useReducedMotion();
  const [ask, setAsk] = useState("do a design review of the login page");
  const [model, setModel] = useState<ModelFamily>("gemini");
  const [tierOverride, setTierOverride] = useState<string>("auto");

  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [assembledPrompt, setAssembledPrompt] = useState<string>("");
  const [lastDeterministicPrompt, setLastDeterministicPrompt] = useState<string>("");

  // Polish settings
  const [showSettings, setShowSettings] = useState(false);
  const [polishSettings, setPolishSettings] = useState<PolishSettings>(getDefaultSettings());
  const [testResult, setTestResult] = useState<{ ok?: boolean; note?: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Polish runtime
  const [polishEnabled, setPolishEnabled] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [polishNote, setPolishNote] = useState("");

  const [copied, setCopied] = useState(false);

  // Hydrate stored settings on client mount
  const hydrateSettings = useCallback(() => {
    setPolishSettings(getStoredSettings());
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(hydrateSettings, [hydrateSettings]);

  const activeProfile = MODEL_PROFILES[model];
  const effectiveTier = tierOverride === "auto" ? activeProfile.capability_tier : Number(tierOverride);
  const taskType = useMemo(() => detectTaskType(ask), [ask]);

  // Scrolling is motion: `scrollIntoView({behavior:"smooth"})` animates the
  // viewport and `prefers-reduced-motion` does not govern it, so it is asked
  // for explicitly — the same promise the CSS and motion layers keep.
  const revealCard = useCallback(
    (id: string) => {
      window.setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({
          behavior: reduced ? "auto" : "smooth",
          block: "start",
        });
      }, 50);
    },
    [reduced],
  );

  // Handle question generation
  const handleGenerateQuestions = useCallback(() => {
    const tierNum = tierOverride === "auto" ? undefined : Number(tierOverride);
    const qs = buildQuestionnaire(ask, model, tierNum);
    setQuestions(qs);
    revealCard("questionnaire-card");
  }, [ask, model, tierOverride, revealCard]);

  // Handle assembly
  const handleAssemble = useCallback(() => {
    const tierNum = tierOverride === "auto" ? undefined : Number(tierOverride);
    const intent = buildIntent(ask, model, answers, tierNum);
    const out = assemble(intent, activeProfile, tierNum);
    setAssembledPrompt(out);
    setLastDeterministicPrompt(out);
    setPolishEnabled(false);
    setPolishNote("");
    revealCard("output-card");
  }, [ask, model, answers, tierOverride, activeProfile, revealCard]);

  // Handle polish toggle
  const handlePolishToggle = async (enabled: boolean) => {
    setPolishEnabled(enabled);
    if (!enabled) {
      setAssembledPrompt(lastDeterministicPrompt);
      setPolishNote("");
      return;
    }

    if (!lastDeterministicPrompt) return;

    setIsPolishing(true);
    setPolishNote(`Polishing with ${polishSettings.model} (${PROVIDER_PRESETS[polishSettings.provider].name})…`);

    const res = await polishPrompt(
      lastDeterministicPrompt,
      activeProfile.family,
      effectiveTier,
      polishSettings
    );

    setIsPolishing(false);
    if (res.ok) {
      setAssembledPrompt(res.text);
      setPolishNote(`✓ ${res.note}`);
    } else {
      setPolishEnabled(false);
      setAssembledPrompt(lastDeterministicPrompt);
      setPolishNote(`⚠ ${res.note}`);
    }
  };

  const handleProviderChange = (prov: PolishProvider) => {
    const preset = PROVIDER_PRESETS[prov];
    const updated: PolishSettings = {
      provider: prov,
      apiKey: polishSettings.apiKey,
      baseUrl: preset.defaultBaseUrl,
      model: preset.defaultModel,
    };
    setPolishSettings(updated);
    saveStoredSettings(updated);
    setTestResult(null);
  };

  const handleSaveSettings = () => {
    saveStoredSettings(polishSettings);
    setTestResult({ ok: true, note: "Settings saved to browser storage." });
    setTimeout(() => setTestResult(null), 3000);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult({ note: "Testing provider connection…" });
    saveStoredSettings(polishSettings);
    const res = await testConnection(polishSettings);
    setIsTesting(false);
    setTestResult(res);
  };

  const copyToClipboard = async () => {
    if (!assembledPrompt) return;
    try {
      await navigator.clipboard.writeText(assembledPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback handled by selectable text
    }
  };

  const downloadMarkdown = () => {
    if (!assembledPrompt) return;
    const blob = new Blob([assembledPrompt], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prompt-${model}-${taskType}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex w-full flex-col gap-5">
      {/* CARD 1: THE ASK & MODEL FAMILY */}
      <StageCard
        index="01"
        title="The Ask & Model Dialect"
        actions={
          <Button
            variant="ghost"
            size="sm"
            className="h-8 rounded-full text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="mr-1.5 size-3.5" />
            Polish Settings
          </Button>
        }
      >

        {/* Collapsible Provider Settings Panel */}
        {showSettings && (
          <div className="mt-4 rounded-2xl border border-border/80 bg-muted/40 p-4 transition-all">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-foreground">
                LLM Polish Provider Configuration
              </span>
              <span className="text-xs text-muted-foreground">Saved locally in browser</span>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                  Provider
                </span>
                <Select
                  value={polishSettings.provider}
                  onValueChange={(v) => handleProviderChange(v as PolishProvider)}
                >
                  <SelectTrigger className="mt-1 w-full rounded-2xl bg-card" aria-label="Polish Provider">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(PROVIDER_PRESETS).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {PROVIDER_PRESETS[polishSettings.provider].description}
                </p>
              </div>

              <div>
                <label
                  htmlFor="polish-model"
                  className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground"
                >
                  Polish Model Name
                </label>
                <Input
                  id="polish-model"
                  type="text"
                  value={polishSettings.model}
                  onChange={(e) => setPolishSettings({ ...polishSettings, model: e.target.value })}
                  placeholder={PROVIDER_PRESETS[polishSettings.provider].defaultModel}
                  className="mt-1 bg-card font-mono text-xs"
                />
              </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="polish-base-url"
                  className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground"
                >
                  Base URL
                </label>
                <Input
                  id="polish-base-url"
                  type="text"
                  value={polishSettings.baseUrl}
                  onChange={(e) => setPolishSettings({ ...polishSettings, baseUrl: e.target.value })}
                  placeholder={PROVIDER_PRESETS[polishSettings.provider].defaultBaseUrl}
                  className="mt-1 bg-card font-mono text-xs"
                />
              </div>

              <div>
                <label
                  htmlFor="polish-api-key"
                  className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground"
                >
                  API Key
                </label>
                <div className="relative mt-1">
                  <Input
                    id="polish-api-key"
                    type="password"
                    value={polishSettings.apiKey}
                    onChange={(e) => setPolishSettings({ ...polishSettings, apiKey: e.target.value })}
                    placeholder={PROVIDER_PRESETS[polishSettings.provider].placeholderKey}
                    className="bg-card pr-8 font-mono text-xs"
                  />
                  <Key className="pointer-events-none absolute right-2.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between pt-2">
              <span className="text-xs text-muted-foreground">
                {testResult?.note && (
                  <span className={testResult.ok ? "text-primary font-medium" : "text-destructive font-medium"}>
                    {testResult.ok ? "✓ " : "✗ "}
                    {testResult.note}
                  </span>
                )}
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full text-xs"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                >
                  {isTesting ? "Testing…" : "Test connection"}
                </Button>
                <Button
                  size="sm"
                  className="rounded-full text-xs"
                  onClick={handleSaveSettings}
                >
                  Save settings
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Ask input textarea */}
        <div className="mt-4">
          <label
            htmlFor="creator-ask"
            className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
          >
            Your ask (can be vague)
          </label>
          <Textarea
            id="creator-ask"
            value={ask}
            onChange={(e) => setAsk(e.target.value)}
            rows={3}
            className="mt-1.5 bg-muted/40 font-sans"
            placeholder="e.g. do a design review of the login page"
          />

          {/* Quick chips */}
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setAsk("do a design review of the login page")}
              className="rounded-full border border-border bg-muted/30 px-3 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
            >
              Design review
            </button>
            <button
              type="button"
              onClick={() => setAsk("review my code for race conditions and memory leaks")}
              className="rounded-full border border-border bg-muted/30 px-3 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
            >
              Code review
            </button>
            <button
              type="button"
              onClick={() => setAsk("debug why the websocket connection drops under heavy load")}
              className="rounded-full border border-border bg-muted/30 px-3 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
            >
              Debug issue
            </button>
            <button
              type="button"
              onClick={() => setAsk("draft an architectural RFC for a multi-tenant queue system")}
              className="rounded-full border border-border bg-muted/30 px-3 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
            >
              Write RFC spec
            </button>
          </div>
        </div>

        {/* Model selection and Tier controls */}
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="select-model-family" className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Target Model Family
            </label>
            <Select value={model} onValueChange={(v) => setModel(v as ModelFamily)}>
              <SelectTrigger id="select-model-family" className="mt-1.5 w-full rounded-2xl bg-muted/40" aria-label="Target Model Family">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FAMILIES.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.family} — {f.vendor} (Default Tier {f.capability_tier})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label htmlFor="select-tier-override" className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Capability Tier Override
            </label>
            <Select value={tierOverride} onValueChange={setTierOverride}>
              <SelectTrigger id="select-tier-override" className="mt-1.5 w-full rounded-2xl bg-muted/40" aria-label="Capability Tier Override">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIER_OPTIONS.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tier scaffolding guidance banner */}
        <div className="mt-4 rounded-2xl border border-border/70 bg-muted/30 p-3.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-foreground">
              Target: <span className="font-mono">{activeProfile.family}</span> · Tier {effectiveTier}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
              Derivation: {activeProfile.instruction_derivation}
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {effectiveTier <= 2 &&
              "Flash / Small model scaffolding: Injects explicit role, numbered steps, hard constraints, and strict negative 'Do NOT' boundaries. Intent questions are required."}
            {effectiveTier === 3 &&
              "Mid-tier model scaffolding: Injects moderate role framing, task restatement, and clear output constraints. Non-negotiables are optional."}
            {effectiveTier >= 4 &&
              "Frontier model scaffolding: Concise, intent-first prompt. Omits rigid hand-holding steps and preserves native reasoning depth. Questions can be skipped."}
          </p>
        </div>

        {/* Action Button */}
        <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
          <span className="font-mono text-[11px] text-muted-foreground">
            Task detected: <strong className="text-foreground">{taskType.replace(/_/g, " ")}</strong>
          </span>
          <Button
            className="rounded-full font-medium"
            onClick={handleGenerateQuestions}
          >
            Generate questions
            <ArrowRight className="ml-1.5 size-4" />
          </Button>
        </div>
      </StageCard>

      {/* CARD 2: QUESTIONNAIRE */}
      <ScrollReveal direction="up">
        {questions.length > 0 && (
          <StageCard
            id="questionnaire-card"
            index="02"
            title="Intent Questionnaire"
            chips={<StageChip>{taskType.replace(/_/g, " ")} · Tier {effectiveTier}</StageChip>}
            actions={
              <Button
                variant="ghost"
                size="sm"
                className="h-7 rounded-full text-xs text-muted-foreground"
                onClick={() => setAnswers({})}
              >
                <RotateCcw className="mr-1 size-3" />
                Reset fields
              </Button>
            }
          >

            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {effectiveTier <= 2
                ? "Required fields are highlighted for low-tier models. Be specific to prevent hallucinations and loose compliance."
                : "Optional questions can be left blank—frontier models will infer unstated context naturally."}
            </p>

            <div className="mt-4 space-y-3.5">
              {questions.map((q) => (
                <div
                  key={q.id}
                  className="rounded-2xl border border-border/70 bg-muted/30 p-4 transition-all focus-within:border-ring focus-within:bg-card"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                      {q.dimension.replace(/_/g, " ")}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em]",
                        q.required
                          ? "border border-[var(--clay)]/30 bg-[var(--clay)]/10 text-[var(--clay)]"
                          : "border border-border bg-muted/60 text-muted-foreground"
                      )}
                    >
                      {q.required ? "Required" : "Optional"}
                    </span>
                  </div>

                  <label
                    htmlFor={`answer-${q.id}`}
                    className="mt-1.5 block text-xs font-medium leading-snug text-foreground"
                  >
                    {q.text}
                  </label>

                  <Textarea
                    id={`answer-${q.id}`}
                    rows={2}
                    value={answers[q.id] || ""}
                    onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                    placeholder={
                      q.required
                        ? "Answer needed for accurate prompt assembly..."
                        : "Optional (leave blank to let model infer)..."
                    }
                    className="mt-2 bg-card font-sans text-xs"
                  />
                </div>
              ))}
            </div>

            <div className="mt-5 flex justify-end border-t border-border pt-4">
              <Button className="rounded-full font-medium" onClick={handleAssemble}>
                Assemble prompt
                <ArrowRight className="ml-1.5 size-4" />
              </Button>
            </div>
          </StageCard>
        )}
      </ScrollReveal>

      {/* CARD 3: ASSEMBLED PROMPT OUTPUT */}
      <ScrollReveal direction="up">
        {assembledPrompt && (
          <StageCard
            id="output-card"
            index="03"
            title="Engineered Prompt"
            chips={<StageChip>{activeProfile.family} · Tier {effectiveTier}</StageChip>}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                {/* Polish Switch */}
                <div className="flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs">
                  <Switch
                    id="polish-switch"
                    checked={polishEnabled}
                    onCheckedChange={handlePolishToggle}
                    disabled={isPolishing}
                  />
                  <label htmlFor="polish-switch" className="flex cursor-pointer items-center gap-1 font-medium text-foreground">
                    <Sparkles className="size-3.5 text-primary" />
                    Polish ({polishSettings.model})
                  </label>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="min-w-[84px] rounded-full"
                  onClick={copyToClipboard}
                >
                  {copied ? <Check className="mr-1 size-3.5" /> : <Copy className="mr-1 size-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full"
                  onClick={downloadMarkdown}
                >
                  <Download className="mr-1 size-3.5" />
                  .md
                </Button>
              </div>
            }
          >

            {/* Inset Output Well */}
            <pre className="min-h-36 select-all whitespace-pre-wrap break-words rounded-2xl border border-border/70 bg-muted/50 p-4 font-mono text-[13px] leading-relaxed text-foreground">
              {assembledPrompt}
            </pre>

            {/* Polish Status Note */}
            {polishNote && (
              <p className="mt-2 text-xs font-medium text-muted-foreground">
                {polishNote}
              </p>
            )}

            {/* Model Dialect Principles Footer */}
            <div className="mt-4 rounded-2xl border border-border/60 bg-muted/30 p-3.5 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{activeProfile.family} Guidance: </span>
              {activeProfile.prompt_principles.do.slice(0, 2).join(" ")}
            </div>
          </StageCard>
        )}
      </ScrollReveal>
    </div>
  );
}
