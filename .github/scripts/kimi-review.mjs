#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const { REPO, PR_NUMBER, MOONSHOT_API_KEY, GITHUB_TOKEN } = process.env;
const LABEL = 'Kimi';

if (!MOONSHOT_API_KEY) throw new Error('MOONSHOT_API_KEY is required');
if (!REPO) throw new Error('REPO is required');
if (!PR_NUMBER) throw new Error('PR_NUMBER is required');

if (!/^([\w.-]+\/){1,2}[\w.-]+$/.test(REPO)) {
  throw new Error(`REPO does not look like "owner/name": ${REPO}`);
}
if (!/^\d+$/.test(PR_NUMBER)) {
  throw new Error(`PR_NUMBER must be a positive integer, got: ${PR_NUMBER}`);
}

// ── Pricing table (per 1M tokens, USD) ──────────────────────────────────────
const PRICING = { 'moonshot-ai/kimi-k2.6': { input: 0.60, output: 0.60 } };

function estimateCost(promptChars, outputChars = 4000) {
  const p = PRICING['moonshot-ai/kimi-k2.6'];
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

// ── Shell helpers ───────────────────────────────────────────────────────────
const run = (file, args, opts = {}) =>
  execFileSync(file, args, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024, ...opts });

const gh = (args) => run('gh', args, { env: { ...process.env, GH_TOKEN: GITHUB_TOKEN } });

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
let truncated = false;
if (!diff) {
  diff = '(no diff)';
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
  truncated ? '\n(NOTE: no diff available.)' : '',
  '',
  reviewInstructions,
].filter(Boolean);

const prompt = promptParts.join('\n');

// ── Cost estimate ───────────────────────────────────────────────────────────
const costEst = estimateCost(prompt.length);
if (costEst) {
  console.log(`Estimated cost: ~$${costEst.costUSD.toFixed(4)} (${costEst.inputTokens} input tokens)`);
}

// ── Invoke Kimi CLI ─────────────────────────────────────────────────────────
// Pipe prompt via stdin --input-format text (avoids kimi treating @file as a
// file to analyse rather than the literal prompt).
console.log('Invoking Kimi CLI...');
const result = spawnSync(
  'kimi',
  ['--quiet', '--input-format', 'text', '-w', '.'],
  {
    encoding: 'utf8',
    input: prompt,
    stdio: ['pipe', 'pipe', 'inherit'],
    maxBuffer: 50 * 1024 * 1024,
    env: { ...process.env, MOONSHOT_API_KEY },
  },
);

if (result.status !== 0) {
  console.error(`Kimi CLI exited with status ${result.status}`);
  if (checkId) {
    updateCheckRun(checkId, 'failure', `${LABEL} review failed`, `Kimi CLI exited with status ${result.status}`);
  }
  process.exit(result.status ?? 1);
}

let raw = result.stdout.trim();

// Strip the "To resume this session" footer
const resumeLine = raw.indexOf('\nTo resume this session:');
if (resumeLine !== -1) {
  raw = raw.slice(0, resumeLine).trim();
}

const fenceMatch = raw.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
if (fenceMatch) raw = fenceMatch[1].trim();

const firstBrace = raw.indexOf('{');
const lastBrace = raw.lastIndexOf('}');
const candidate = firstBrace !== -1 && lastBrace > firstBrace
  ? raw.slice(firstBrace, lastBrace + 1)
  : '';

const postPlainFallback = (reason, body) => {
  const fallback = [
    `## 🤖 Kimi CLI review — ${LABEL}`,
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
  console.warn('Kimi CLI output was not valid JSON:', err.message);
  console.warn('Raw (first 2000 chars):\n', raw.slice(0, 2000));
  postPlainFallback('Kimi CLI returned free-form text instead of structured JSON', raw);
  if (checkId) {
    updateCheckRun(checkId, 'neutral', `${LABEL} review — parse error`, 'Could not parse agent output as JSON.');
  }
  process.exit(0);
}

if (typeof review.summary !== 'string' || !Array.isArray(review.comments)) {
  console.warn('Kimi response shape was invalid:', review);
  postPlainFallback('Kimi CLI response shape was invalid', raw);
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

console.log(`Kimi CLI returned: ${review.comments.length} inline comments`);

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
  `## 🤖 Kimi CLI review — ${LABEL}`,
  '',
  review.summary,
  truncated ? '\n_Note: no diff available for this PR._' : '',
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
