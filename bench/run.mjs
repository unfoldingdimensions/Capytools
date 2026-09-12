#!/usr/bin/env node
// CapyBench runner. One prompt, one shot, one model, one result on disk.
//
//   node bench/run.mjs --model claude-opus-5 [--dry-run]
//
// Rules this file enforces, because the whole benchmark rests on them:
//   - the prompt is sent byte-for-byte and its sha256 goes into the result
//   - a model with no verified official price cannot produce a result at all
//   - artifact extraction is mechanical, so "it produced nothing" stays a fact
//     rather than a judgement call
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BENCH = dirname(fileURLToPath(import.meta.url));
const SPEC_VERSION = "1";
const BENCHMARK = "capy-onsen";
const REQUEST_TIMEOUT_MS = 600_000;
const TRANSPORT_RETRIES = 2;
// Protocol cap: every run gets the same output ceiling, so a model with a 128K cap is
// not handed a bigger budget than one capped at 64K. Also keeps non-streaming requests
// clear of HTTP timeouts, which is why the runs are non-streaming in the first place.
const MAX_OUTPUT_TOKENS = 64_000;
const FENCE = "`".repeat(3);

/** Take the last fenced html block; failing that a bare document; failing that nothing. */
export function extractArtifact(text) {
  const fences = [...text.matchAll(new RegExp(`${FENCE}html\\r?\\n([\\s\\S]*?)${FENCE}`, "gi"))];
  if (fences.length > 0) {
    return { html: fences[fences.length - 1][1], extracted: "fenced-html-block" };
  }
  if (/^\s*<!doctype/i.test(text)) return { html: text, extracted: "bare-document" };
  return { html: "", extracted: "none" };
}

/**
 * Reasoning tokens are a SUBSET of output tokens for every vendor we support
 * (Anthropic counts thinking inside output_tokens, OpenAI counts reasoning inside
 * completion_tokens), so they are reported but never billed twice.
 */
export function computeCost(usage, pricing) {
  const round = (n) => Math.round(n * 1e6) / 1e6;
  const inputUsd = round((usage.inputTokens / 1e6) * pricing.inputPerMTok);
  const outputUsd = round((usage.outputTokens / 1e6) * pricing.outputPerMTok);
  return { inputUsd, outputUsd, totalUsd: round(inputUsd + outputUsd) };
}

export const VENDORS = {
  anthropic: {
    url: (m) => `${m.baseUrl}/v1/messages`,
    headers: (key) => ({
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    }),
    body: (m, prompt) => ({
      model: m.id,
      max_tokens: m.maxOutputTokens,
      messages: [{ role: "user", content: prompt }],
    }),
    read: (json) => ({
      text: (json.content ?? [])
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join(""),
      usage: {
        inputTokens: json.usage?.input_tokens ?? 0,
        outputTokens: json.usage?.output_tokens ?? 0,
        reasoningTokens: 0,
        cachedInputTokens: json.usage?.cache_read_input_tokens ?? 0,
      },
      stopReason: json.stop_reason ?? null,
    }),
  },
  "openai-compatible": {
    url: (m) => `${m.baseUrl}/v1/chat/completions`,
    headers: (key) => ({ "content-type": "application/json", authorization: `Bearer ${key}` }),
    body: (m, prompt) => ({
      model: m.id,
      max_completion_tokens: m.maxOutputTokens,
      messages: [{ role: "user", content: prompt }],
    }),
    read: (json) => ({
      text: json.choices?.[0]?.message?.content ?? "",
      usage: {
        inputTokens: json.usage?.prompt_tokens ?? 0,
        outputTokens: json.usage?.completion_tokens ?? 0,
        reasoningTokens: json.usage?.completion_tokens_details?.reasoning_tokens ?? 0,
        cachedInputTokens: json.usage?.prompt_tokens_details?.cached_tokens ?? 0,
      },
      stopReason: json.choices?.[0]?.finish_reason ?? null,
    }),
  },
  // Gemini's native shape. Google publishes an OpenAI-compatible path too, but it sits at
  // /v1beta/openai/chat/completions and reports thinking/cache token details as empty, so
  // the native endpoint is the one that can account for what we are billed.
  google: {
    url: (m) => `${m.baseUrl}/v1beta/models/${m.id}:generateContent`,
    // Key goes in a header, never the query string.
    headers: (key) => ({ "content-type": "application/json", "x-goog-api-key": key }),
    body: (m, prompt) => ({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: m.maxOutputTokens },
    }),
    read: (json) => ({
      text: (json.candidates?.[0]?.content?.parts ?? [])
        .map((p) => p.text ?? "")
        .join(""),
      usage: {
        // promptTokenCount already includes cached content, per the API reference.
        inputTokens: json.usageMetadata?.promptTokenCount ?? 0,
        // candidatesTokenCount is the billed output quantity; thoughts are understood to
        // sit inside it (output prices are documented as including thinking tokens).
        // checkUsage() below fails loudly if a real response contradicts that.
        outputTokens: json.usageMetadata?.candidatesTokenCount ?? 0,
        reasoningTokens: json.usageMetadata?.thoughtsTokenCount ?? 0,
        cachedInputTokens: json.usageMetadata?.cachedContentTokenCount ?? 0,
      },
      stopReason: json.candidates?.[0]?.finishReason ?? null,
    }),
  },
};

/**
 * The cost figure rests on two claims the vendors' own docs leave partly implicit.
 * Rather than trust them silently, check them against every real response.
 */
export function checkUsage(usage) {
  const warnings = [];
  if (usage.reasoningTokens > usage.outputTokens) {
    warnings.push(
      `reasoning tokens (${usage.reasoningTokens}) exceed output tokens ` +
        `(${usage.outputTokens}): they are NOT a subset, so this cost UNDERSTATES the bill. ` +
        "Do not publish this run until the pricing model is fixed.",
    );
  }
  if (usage.cachedInputTokens > 0) {
    warnings.push(
      `${usage.cachedInputTokens} cached input tokens were reported; caching is on by ` +
        "default at OpenAI and Google. Cost bills them at the full input rate, so it " +
        "slightly OVERSTATES the bill.",
    );
  }
  return warnings;
}

function die(message) {
  console.error(`capybench: ${message}`);
  process.exit(1);
}

function resolveModel(id) {
  const prices = JSON.parse(readFileSync(join(BENCH, "prices.json"), "utf8"));
  const row = id.startsWith("_") ? undefined : prices[id];
  if (!row) {
    const known = Object.keys(prices).filter((k) => !k.startsWith("_"));
    die(`unknown model "${id}". Add it to bench/prices.json. Known: ${known.join(", ")}`);
  }
  if (row.inputPerMTok == null || row.outputPerMTok == null || !row.asOf) {
    die(
      `"${id}" has no verified official price. Read the rates off ${row.source} ` +
        "and fill inputPerMTok, outputPerMTok and asOf in bench/prices.json. " +
        "No result may exist without a frozen price.",
    );
  }
  if (!VENDORS[row.vendor]) die(`"${id}" has unknown vendor "${row.vendor}"`);
  return { id, ...row, maxOutputTokens: Math.min(row.maxOutputTokens, MAX_OUTPUT_TOKENS) };
}

async function callModel(model, prompt) {
  const vendor = VENDORS[model.vendor];
  const key = process.env[model.apiKeyEnv];
  if (!key) die(`${model.apiKeyEnv} is not set`);

  let transportRetries = 0;
  for (;;) {
    const startedAt = new Date();
    const t0 = performance.now();
    try {
      const res = await fetch(vendor.url(model), {
        method: "POST",
        headers: vendor.headers(key),
        body: JSON.stringify(vendor.body(model, prompt)),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (res.status >= 500 && transportRetries < TRANSPORT_RETRIES) {
        transportRetries += 1;
        console.error(`capybench: HTTP ${res.status}, retry ${transportRetries}`);
        await new Promise((r) => setTimeout(r, 2000 * transportRetries));
        continue;
      }
      const text = await res.text();
      if (!res.ok) die(`HTTP ${res.status} from ${model.vendor}: ${text.slice(0, 500)}`);
      return {
        ...vendor.read(JSON.parse(text)),
        startedAt: startedAt.toISOString(),
        durationMs: Math.round(performance.now() - t0),
        transportRetries,
      };
    } catch (err) {
      if (transportRetries >= TRANSPORT_RETRIES) die(`transport failure: ${err.message}`);
      transportRetries += 1;
      console.error(`capybench: ${err.message}, retry ${transportRetries}`);
      await new Promise((r) => setTimeout(r, 2000 * transportRetries));
    }
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const modelId = argv[argv.indexOf("--model") + 1];
  if (!argv.includes("--model") || !modelId) {
    die("usage: node bench/run.mjs --model <id> [--dry-run]");
  }
  const dryRun = argv.includes("--dry-run");

  const prompt = readFileSync(join(BENCH, `prompt.v${SPEC_VERSION}.md`), "utf8");
  const promptSha256 = createHash("sha256").update(prompt, "utf8").digest("hex");
  const model = resolveModel(modelId);
  const vendor = VENDORS[model.vendor];

  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          dryRun: true,
          promptSha256,
          promptBytes: Buffer.byteLength(prompt, "utf8"),
          url: vendor.url(model),
          apiKey: `${model.apiKeyEnv}=${process.env[model.apiKeyEnv] ? "set" : "MISSING"}`,
          pricing: {
            inputPerMTok: model.inputPerMTok,
            outputPerMTok: model.outputPerMTok,
            asOf: model.asOf,
          },
          body: {
            ...vendor.body(model, prompt),
            messages: [{ role: "user", content: `<prompt, ${prompt.length} chars>` }],
          },
        },
        null,
        2,
      ),
    );
    return;
  }

  const out = await callModel(model, prompt);
  const { html, extracted } = extractArtifact(out.text);
  const cost = computeCost(out.usage, model);
  const warnings = checkUsage(out.usage);
  for (const w of warnings) console.error(`capybench: WARNING — ${w}`);

  const dir = join(BENCH, "results", `v${SPEC_VERSION}`, modelId.replace(/[^a-z0-9.-]+/gi, "-"));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "raw.txt"), out.text);
  writeFileSync(join(dir, "index.html"), html);
  writeFileSync(
    join(dir, "result.json"),
    `${JSON.stringify(
      {
        benchmark: BENCHMARK,
        specVersion: SPEC_VERSION,
        promptSha256,
        model: { id: model.id, label: model.label, vendor: model.vendor },
        run: {
          startedAt: out.startedAt,
          durationMs: out.durationMs,
          protocol: "one-shot",
          transportRetries: out.transportRetries,
          stopReason: out.stopReason,
        },
        params: { temperature: null, maxOutputTokens: model.maxOutputTokens, reasoning: "default" },
        usage: out.usage,
        pricing: {
          source: model.source,
          asOf: model.asOf,
          currency: "USD",
          inputPerMTok: model.inputPerMTok,
          outputPerMTok: model.outputPerMTok,
        },
        cost,
        artifact: {
          file: "index.html",
          bytes: Buffer.byteLength(html, "utf8"),
          sha256: createHash("sha256").update(html, "utf8").digest("hex"),
          extracted,
        },
        // Kept in the result, not just the console: a run whose accounting is suspect
        // must carry that with it wherever the number is displayed.
        warnings,
      },
      null,
      2,
    )}\n`,
  );

  console.log(
    `capybench: ${model.label} — ${extracted}, ${Buffer.byteLength(html, "utf8")} bytes, ` +
      `${(out.durationMs / 1000).toFixed(1)}s, ${out.usage.outputTokens} out tok, ` +
      `$${cost.totalUsd.toFixed(4)} -> ${dir}`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
