#!/usr/bin/env node
// Scaffold one CapyBench run folder, and refuse to scaffold a contaminated one.
//
//   node bench/new-run.mjs --model gemini-3.8-flash --dir ../capybench-runs
//   node bench/new-run.mjs --finalize ../capybench-runs/gemini-3-8-flash__2026-09-12
//
// Why the guard exists: an agent picks up CLAUDE.md / AGENTS.md and friends from its
// working directory AND every parent directory. A run folder anywhere under the
// Capytools repo would hand the model our brand ethos, palette and type stack — the
// benchmark would be measuring who read the style guide. So the run folder must be
// sterile, and that is checked rather than remembered.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, parse, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const BENCH = dirname(fileURLToPath(import.meta.url));
const SPEC_VERSION = "2";
const BENCHMARK = "capy-onsen";

/**
 * Agent instruction files and anything that can carry them.
 *
 * INCOMPLETE BY CONSTRUCTION: each model runs in its own native harness, and every
 * harness reads its own instruction files. Before a harness's first run, check its
 * docs for what it loads from the working directory and its parents, and add those
 * names here. A missing entry is a silent contamination; a name that does not exist
 * costs nothing (existsSync simply returns false), so err toward adding.
 *
 * Unverified for Antigravity and the Hermes fallback — do that before running them.
 */
const CONTAMINANTS = [
  "CLAUDE.md",
  "AGENTS.md",
  "GEMINI.md",
  "AGENT.md",
  ".cursorrules",
  ".windsurfrules",
  ".clinerules",
  ".github/copilot-instructions.md",
  ".cursor",
  ".claude",
  ".gemini",
  ".antigravity",
  ".hermes",
  ".agent",
  ".mcp.json",
  ".git",
];

/**
 * Walk from `dir` up to the filesystem root looking for anything that would leak
 * instructions into the run, and split the hits in two:
 *
 *   fatal   — project-level config (a repo's CLAUDE.md / AGENTS.md, a .git that could
 *             carry them). These differ per location, so one run could get the
 *             Capytools design system while another gets nothing. Never acceptable.
 *   ambient — the operator's own user-level config, which sits directly in the home
 *             directory (~/.claude, ~/CLAUDE.md). On most machines this cannot be
 *             escaped without leaving home entirely, so it is reported rather than
 *             refused.
 *
 * Ambient config is NOT harmless, and is not a shared constant: each harness reads its
 * own user-level files, so ~/.claude/CLAUDE.md reaches Claude Code and nothing else.
 * That makes it a per-harness asymmetry. Neutralise it for the run where the harness
 * allows skipping user settings; where it does not, record it and disclose it.
 */
export function findContamination(dir) {
  const home = resolve(homedir());
  const fatal = [];
  const ambient = [];
  let current = resolve(dir);
  for (;;) {
    for (const name of CONTAMINANTS) {
      const candidate = join(current, name);
      if (!existsSync(candidate)) continue;
      (current === home ? ambient : fatal).push(candidate);
    }
    const next = dirname(current);
    if (next === current || parse(current).root === current) break;
    current = next;
  }
  return { fatal, ambient };
}

/** gemini-3.8-flash -> gemini-3-8-flash. No spaces, no dots: these end up in URLs. */
export function slug(modelId) {
  return modelId
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function runFolderName(modelId, date) {
  return `${slug(modelId)}__${date}`;
}

function die(message) {
  console.error(`capybench: ${message}`);
  process.exit(1);
}

function arg(argv, flag) {
  const i = argv.indexOf(flag);
  return i === -1 ? undefined : argv[i + 1];
}

function finalize(dir) {
  const runPath = join(dir, "run.json");
  if (!existsSync(runPath)) die(`no run.json in ${dir}`);
  const run = JSON.parse(readFileSync(runPath, "utf8"));
  const artifact = join(dir, "index.html");

  if (existsSync(artifact)) {
    const html = readFileSync(artifact);
    run.artifact = {
      file: "index.html",
      bytes: html.byteLength,
      sha256: createHash("sha256").update(html).digest("hex"),
    };
  } else {
    // A model that never produced a file is a real, publishable result.
    run.artifact = { file: null, bytes: 0, sha256: null };
    console.error("capybench: WARNING — no index.html; recording an empty artifact");
  }

  if (run.run?.startedAt && run.run?.finishedAt) {
    const seconds = (Date.parse(run.run.finishedAt) - Date.parse(run.run.startedAt)) / 1000;
    if (Number.isFinite(seconds) && seconds >= 0) run.run.durationSeconds = Math.round(seconds);
    else console.error("capybench: WARNING — startedAt/finishedAt do not parse into a duration");
  } else {
    console.error("capybench: WARNING — fill startedAt and finishedAt to get a duration");
  }

  const blank = [
    "harness.name",
    "harness.nativeTo",
    "harness.capabilities.webSearch",
    "run.turns",
    "run.startedAt",
    "run.finishedAt",
  ].filter((path) => {
    const value = path.split(".").reduce((o, k) => o?.[k], run);
    return value === null || value === undefined || value === "";
  });
  if (blank.length > 0) console.error(`capybench: still unfilled — ${blank.join(", ")}`);

  writeFileSync(runPath, `${JSON.stringify(run, null, 2)}\n`);
  console.log(`capybench: finalized ${runPath} (${run.artifact.bytes} bytes)`);
}

function scaffold(modelId, parentDir) {
  const prices = JSON.parse(readFileSync(join(BENCH, "prices.json"), "utf8"));
  const row = modelId.startsWith("_") ? undefined : prices[modelId];
  // The operator's local calendar day, not UTC — otherwise a run made on the evening of
  // the 12th lands in a folder labelled the 11th, which is just confusing to look at.
  const now = new Date();
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
  const dir = resolve(parentDir, runFolderName(modelId, date));

  const { fatal, ambient } = findContamination(parentDir);
  if (fatal.length > 0) {
    die(
      `refusing to scaffold: ${parentDir} sits under project-level agent instruction ` +
        `files, which would leak into the run.\n  ${fatal.join("\n  ")}\n` +
        "Pick a directory outside any repo that carries these.",
    );
  }
  for (const a of ambient) {
    console.error(
      `capybench: WARNING — user-level config may reach this run: ${a}\n` +
        "  Only the harness that owns it reads it, so this is a per-harness asymmetry, " +
        "not a shared constant.\n" +
        "  Neutralise it if the harness can skip user settings; otherwise record it in " +
        "harness.ambientConfig and disclose it.",
    );
  }
  if (existsSync(dir)) die(`${dir} already exists — a run folder is never reused`);

  const prompt = readFileSync(join(BENCH, `prompt.v${SPEC_VERSION}.md`), "utf8");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "prompt.md"), prompt);
  writeFileSync(
    join(dir, "run.json"),
    `${JSON.stringify(
      {
        _note:
          "Agentic runs cannot yield a comparable USD cost: a coding agent's token count is " +
          "mostly harness, chat subscriptions are not billed per token, and wall-clock " +
          "includes the operator. So no cost or usage is recorded here by design. Fill the " +
          "nulls by hand after the run, then: node bench/new-run.mjs --finalize <this dir>",
        benchmark: BENCHMARK,
        specVersion: SPEC_VERSION,
        promptSha256: createHash("sha256").update(prompt, "utf8").digest("hex"),
        model: { id: modelId, label: row?.label ?? null, vendor: row?.vendor ?? null },
        // Each model runs in its own native harness, so the harness is a variable, not
        // a constant — which makes recording it part of the result, not metadata.
        // nativeTo: the vendor slug when this is the model's first-party agent, or
        // "fallback" for the shared stand-in. capabilities: what the harness could
        // actually do, which is what explains output differences the model cannot be
        // credited or blamed for. Turn webSearch off wherever the harness allows it.
        harness: {
          name: null,
          version: null,
          nativeTo: null,
          capabilities: {
            writeFiles: null,
            readFiles: null,
            runCommands: null,
            browserPreview: null,
            webSearch: null,
          },
          modelSettings: null,
          ambientConfig: ambient,
        },
        run: {
          protocol: "agentic-single-prompt",
          startedAt: null,
          finishedAt: null,
          durationSeconds: null,
          turns: null,
          toolCalls: null,
          humanTurnsAfterPrompt: 0,
        },
        // Anything that needed an exception. An honest blemish log is what keeps the
        // single-prompt claim credible.
        blemishes: [],
        artifact: { file: "index.html", bytes: null, sha256: null },
        notes: "",
      },
      null,
      2,
    )}\n`,
  );

  console.log(`capybench: ${dir}`);
  console.log("  prompt.md  — paste verbatim as the single prompt; no human turns after it");
  console.log("  run.json   — fill harness (name, version, nativeTo, capabilities),");
  console.log("               startedAt/finishedAt, turns, toolCalls");
  if (!row) console.log(`  note: "${modelId}" is not in prices.json, so label/vendor are null`);
}

const argv = process.argv.slice(2);
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const finalizeDir = arg(argv, "--finalize");
  const modelId = arg(argv, "--model");
  if (finalizeDir) {
    if (!existsSync(finalizeDir) || !statSync(finalizeDir).isDirectory()) {
      die(`${finalizeDir} is not a directory`);
    }
    finalize(finalizeDir);
  } else if (modelId) {
    scaffold(modelId, arg(argv, "--dir") ?? resolve(BENCH, "..", "..", "capybench-runs"));
  } else {
    die("usage: node bench/new-run.mjs --model <id> [--dir <parent>] | --finalize <dir>");
  }
}
