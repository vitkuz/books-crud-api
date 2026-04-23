#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const { REPO, PR_NUMBER, GEMINI_API_KEY, GITHUB_TOKEN } = process.env;
const MODEL = process.env.MODEL || 'gemini-3.1-pro-preview';
const LABEL = 'Gemini';

if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is required');
if (!REPO) throw new Error('REPO is required');
if (!PR_NUMBER) throw new Error('PR_NUMBER is required');

if (!/^([\w.-]+\/){1,2}[\w.-]+$/.test(REPO)) {
  throw new Error(`REPO does not look like "owner/name": ${REPO}`);
}
if (!/^\d+$/.test(PR_NUMBER)) {
  throw new Error(`PR_NUMBER must be a positive integer, got: ${PR_NUMBER}`);
}

// ── Pricing table (per 1M tokens, USD) ──────────────────────────────────────
const PRICING = {
  'gemini-3.1-pro-preview': { input: 2.00, output: 12.00 },
  'gemini-3.1-flash-lite-preview': { input: 0.25, output: 1.50 },
  'gemini-2.5-pro': { input: 1.25, output: 10.00 },
  'gemini-2.5-flash': { input: 0.30, output: 2.50 },
  'gemini-2.5-flash-lite': { input: 0.10, output: 0.40 },
};

function estimateCost(model, promptChars, outputChars = 4000) {
  const p = PRICING[model];
  if (!p) return null;
  const inputTokens = Math.ceil(promptChars / 4);
  const outputTokens = Math.ceil(outputChars / 4);
  const cost = (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
  return { inputTokens, outputTokens, costUSD: cost };
}

// ── GitHub Checks API helpers ───────────────────────────────────────────────
function createCheckRun(name, headSha) {
  const payload = {
    name,
    head_sha: headSha,
    status: 'in_progress',
    started_at: new Date().toISOString(),
  };
  writeFileSync('/tmp/check-create.json', JSON.stringify(payload));
  const out = execFileSync('gh', [
    'api', '--method', 'POST',
    '-H', 'Accept: application/vnd.github+json',
    `/repos/${REPO}/check-runs`,
    '--input', '/tmp/check-create.json',
  ], { encoding: 'utf8' });
  return JSON.parse(out).id;
}

function updateCheckRun(checkId, conclusion, summary, text) {
  const payload = {
    status: 'completed',
    conclusion,
    completed_at: new Date().toISOString(),
    output: {
      title: summary.slice(0, 255),
      summary: summary.slice(0, 65000),
      text: text?.slice(0, 65000) || '',
    },
  };
  writeFileSync('/tmp/check-update.json', JSON.stringify(payload));
  execFileSync('gh', [
    'api', '--method', 'PATCH',
    '-H', 'Accept: application/vnd.github+json',
    `/repos/${REPO}/check-runs/${checkId}`,
    '--input', '/tmp/check-update.json',
  ], { encoding: 'utf8' });
}

// ── Ignore patterns ─────────────────────────────────────────────────────────
function loadIgnorePatterns() {
  const file = '.reviewignore';
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
}

function shouldIgnoreFile(filePath, patterns) {
  return patterns.some((pat) => {
    const regex = new RegExp(
      '^' +
      pat
        .replace(/\*\*/g, '{{GLOBSTAR}}')
        .replace(/\*/g, '[^/]*')
        .replace(/\?/g, '.')
        .replace(/\{\{GLOBSTAR\}\}/g, '.*')
        .replace(/\./g, '\\.')
      + '$'
    );
    return regex.test(filePath) || filePath.includes(pat.replace(/\*/g, ''));
  });
}

function filterDiff(diff, patterns) {
  if (!patterns.length) return diff;
  const hunks = diff.split(/^diff --git /m).filter(Boolean);
  const kept = hunks.filter((hunk) => {
    const header = hunk.split('\n')[0] || '';
    const m = header.match(/\s[ab]\/(.+?)(?:\s|$)/);
    if (!m) return true;
    return !shouldIgnoreFile(m[1], patterns);
  });
  return kept.length ? 'diff --git ' + kept.join('diff --git ') : '';
}

// ── Shell helpers ───────────────────────────────────────────────────────────
const run = (file, args) =>
  execFileSync(file, args, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });

const gh = (args) => run('gh', args);

// ── Fetch PR metadata ───────────────────────────────────────────────────────
const pr = JSON.parse(
  gh(['pr', 'view', PR_NUMBER, '--repo', REPO, '--json', 'title,body,headRefName,baseRefName,headRefOid']),
);

const headSha = pr.headRefOid;
const checkName = `Code Review — ${LABEL}`;
let checkId;
try {
  checkId = createCheckRun(checkName, headSha);
  console.log(`Created check run #${checkId}`);
} catch (e) {
  console.warn('Could not create check run:', e.message);
}

// ── Diff ────────────────────────────────────────────────────────────────────
let diff = gh(['pr', 'diff', PR_NUMBER, '--repo', REPO]);
const patterns = loadIgnorePatterns();
const beforeLen = diff.length;
diff = filterDiff(diff, patterns);
const afterLen = diff.length;
if (beforeLen !== afterLen) {
  console.log(`Filtered diff: ${beforeLen} → ${afterLen} chars (${patterns.length} ignore patterns)`);
}

let truncated = false;
if (!diff) {
  diff = '(no diff after filtering)';
  truncated = true;
}

// ── Prompts from files ──────────────────────────────────────────────────────
const systemPrompt = existsSync('.github/prompts/system-prompt.md')
  ? readFileSync('.github/prompts/system-prompt.md', 'utf8')
  : '';

const reviewInstructions = existsSync('.github/prompts/review-instructions.md')
  ? readFileSync('.github/prompts/review-instructions.md', 'utf8')
  : '';

const conventions = existsSync('CLAUDE.md') ? readFileSync('CLAUDE.md', 'utf8') : '';

const conventionsBlock = conventions
  ? `Project conventions to enforce (from CLAUDE.md):\n---\n${conventions}\n---\n\n`
  : '';

const promptParts = [
  systemPrompt,
  '',
  `Repository: ${REPO}`,
  `PR #${PR_NUMBER}: ${pr.title}`,
  '',
  `Description:\n${pr.body?.trim() || '(no description)'}`,
  '',
  conventionsBlock,
  'Unified diff (authoritative list of what changed):',
  '```diff',
  diff,
  '```',
  truncated ? '\n(NOTE: diff was empty after ignore-filtering.)' : '',
  '',
  reviewInstructions,
].filter(Boolean);

const prompt = promptParts.join('\n');

// ── Cost estimate ───────────────────────────────────────────────────────────
const costEst = estimateCost(MODEL, prompt.length);
if (costEst) {
  console.log(`Estimated cost: ~$${costEst.costUSD.toFixed(4)} (${costEst.inputTokens} input tokens)`);
}

// ── Write prompt to file inside workspace (Gemini CLI is sandboxed) ─────────
const promptFile = './.review-prompt.tmp.txt';
writeFileSync(promptFile, prompt);

// ── Invoke Gemini CLI ───────────────────────────────────────────────────────
console.log(`Invoking Gemini CLI (${MODEL})...`);
const result = spawnSync(
  'npx',
  [
    '-y',
    '@google/gemini-cli@0.38.2',
    '-p', `@{${promptFile}}`,
    '-m',
    MODEL,
    '--approval-mode',
    'default',
    '--allowed-tools',
    'read_file,list_directory,glob,search_file_content',
    '--output-format',
    'json',
  ],
  { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], maxBuffer: 50 * 1024 * 1024 },
);

if (result.status !== 0) {
  console.error(`Gemini CLI exited with status ${result.status}`);
  if (checkId) {
    updateCheckRun(checkId, 'failure', `${LABEL} review failed`, `Gemini CLI exited with status ${result.status}`);
  }
  process.exit(result.status ?? 1);
}

let modelText;
try {
  const wrapper = JSON.parse(result.stdout);
  modelText = typeof wrapper.response === 'string' ? wrapper.response : result.stdout;
} catch {
  modelText = result.stdout;
}

let raw = modelText.trim();
const fenceMatch = raw.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
if (fenceMatch) raw = fenceMatch[1].trim();

const firstBrace = raw.indexOf('{');
const lastBrace = raw.lastIndexOf('}');
const candidate = firstBrace !== -1 && lastBrace > firstBrace
  ? raw.slice(firstBrace, lastBrace + 1)
  : '';

const postPlainFallback = (reason, body) => {
  const fallback = [
    `## 🤖 Gemini CLI review — ${LABEL} (${MODEL})`,
    '',
    `_Note: ${reason}. Posting the agent's raw output as a single comment — no inline annotations this run._`,
    costEst ? `_Estimated cost: ~$${costEst.costUSD.toFixed(4)}_` : '',
    '',
    body.slice(0, 60000),
  ].join('\n');
  writeFileSync('/tmp/fallback.md', fallback);
  gh(['pr', 'comment', PR_NUMBER, '--repo', REPO, '--body-file', '/tmp/fallback.md']);
};

let review;
try {
  review = JSON.parse(candidate || raw);
} catch (err) {
  console.warn('Gemini output was not valid JSON:', err.message);
  console.warn('Raw (first 2000 chars):\n', raw.slice(0, 2000));
  postPlainFallback('Gemini returned free-form text instead of structured JSON', raw);
  if (checkId) {
    updateCheckRun(checkId, 'neutral', `${LABEL} review — parse error`, 'Could not parse agent output as JSON.');
  }
  process.exit(0);
}

if (typeof review.summary !== 'string' || !Array.isArray(review.comments)) {
  console.warn('Gemini response shape was invalid:', review);
  postPlainFallback('Gemini response shape was invalid', raw);
  if (checkId) {
    updateCheckRun(checkId, 'neutral', `${LABEL} review — invalid shape`, 'Agent response did not match expected JSON shape.');
  }
  process.exit(0);
}

review.comments = review.comments.filter(
  (c) =>
    c &&
    typeof c.path === 'string' &&
    Number.isInteger(c.line) &&
    c.line > 0 &&
    typeof c.body === 'string' &&
    c.body.trim().length > 0,
);

console.log(`Gemini returned: ${review.comments.length} inline comments`);

// ── Severity emojis ─────────────────────────────────────────────────────────
const SEVERITY_EMOJI = {
  critical: '🔴',
  warning: '🟡',
  suggestion: '🟢',
};

function formatComment(c) {
  const emoji = SEVERITY_EMOJI[c.severity] || '💬';
  const sev = c.severity ? `**${c.severity.toUpperCase()}** ` : '';
  return `${emoji} ${sev}${c.body}`;
}

const summary = [
  `## 🤖 Gemini CLI review — ${LABEL} (${MODEL})`,
  '',
  review.summary,
  truncated ? '\n_Note: the diff was empty after ignore-filtering._' : '',
  costEst ? `\n_Estimated cost: ~$${costEst.costUSD.toFixed(4)}_` : '',
].join('\n');

// ── Update check run ────────────────────────────────────────────────────────
const criticalCount = review.comments.filter((c) => c.severity === 'critical').length;
const warningCount = review.comments.filter((c) => c.severity === 'warning').length;
const suggestionCount = review.comments.filter((c) => c.severity === 'suggestion').length;

const checkConclusion = criticalCount > 0 ? 'failure' : warningCount > 0 ? 'neutral' : 'success';
const checkSummary = `${LABEL} review complete. ${criticalCount} critical, ${warningCount} warning, ${suggestionCount} suggestion.`;

const checkDetails = [
  `## Review Summary`,
  '',
  `- 🔴 Critical: ${criticalCount}`,
  `- 🟡 Warning: ${warningCount}`,
  `- 🟢 Suggestion: ${suggestionCount}`,
  costEst ? `- 💰 Estimated cost: ~$${costEst.costUSD.toFixed(4)}` : '',
  '',
  review.summary,
].join('\n');

if (checkId) {
  try {
    updateCheckRun(checkId, checkConclusion, checkSummary, checkDetails);
    console.log(`Updated check run #${checkId} → ${checkConclusion}`);
  } catch (e) {
    console.warn('Could not update check run:', e.message);
  }
}

// ── Post PR review ──────────────────────────────────────────────────────────
if (review.comments.length === 0) {
  writeFileSync('/tmp/summary.md', summary);
  gh(['pr', 'comment', PR_NUMBER, '--repo', REPO, '--body-file', '/tmp/summary.md']);
  console.log('Posted summary-only comment');
  process.exit(0);
}

const reviewBody = {
  body: summary,
  event: 'COMMENT',
  comments: review.comments.map((c) => ({
    path: c.path,
    line: c.line,
    side: 'RIGHT',
    body: formatComment(c),
  })),
};
writeFileSync('/tmp/review.json', JSON.stringify(reviewBody));

try {
  gh([
    'api',
    '--method',
    'POST',
    '-H',
    'Accept: application/vnd.github+json',
    `/repos/${REPO}/pulls/${PR_NUMBER}/reviews`,
    '--input',
    '/tmp/review.json',
  ]);
  console.log('Posted review with inline comments');
} catch (err) {
  console.warn('Inline review API rejected the request; falling back to summary comment.');
  console.warn(err.stderr?.toString?.() || err.message);
  const fallback = [
    summary,
    '',
    '---',
    '',
    '### Inline findings (could not attach to lines)',
    '',
    ...review.comments.map((c) => `- **\`${c.path}:${c.line}\`** — ${formatComment(c)}`),
  ].join('\n');
  writeFileSync('/tmp/fallback.md', fallback);
  gh(['pr', 'comment', PR_NUMBER, '--repo', REPO, '--body-file', '/tmp/fallback.md']);
}
