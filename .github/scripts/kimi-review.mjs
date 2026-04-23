#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import * as log from './logger.mjs';

const { REPO, PR_NUMBER, MOONSHOT_API_KEY, GITHUB_TOKEN } = process.env;
const LABEL = 'Kimi';

log.startGroup('Setup & validation');

if (!MOONSHOT_API_KEY) {
  log.setFailed('MOONSHOT_API_KEY is required');
  process.exit(1);
}
if (!REPO) {
  log.setFailed('REPO is required');
  process.exit(1);
}
if (!PR_NUMBER) {
  log.setFailed('PR_NUMBER is required');
  process.exit(1);
}
if (!/^([\w.-]+\/){1,2}[\w.-]+$/.test(REPO)) {
  log.setFailed(`REPO does not look like "owner/name": ${REPO}`);
  process.exit(1);
}
if (!/^\d+$/.test(PR_NUMBER)) {
  log.setFailed(`PR_NUMBER must be a positive integer, got: ${PR_NUMBER}`);
  process.exit(1);
}

log.info(`REPO=${REPO} PR_NUMBER=${PR_NUMBER}`);
log.endGroup();

// ── Pricing table (per 1M tokens, USD) ──────────────────────────────────────
const PRICING = { 'moonshot-ai/kimi-k2.6': { input: 0.60, output: 0.60 } };
function estimateCost(promptChars, outputChars = 4000) {
  const p = PRICING['moonshot-ai/kimi-k2.6'];
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

// ── Shell helpers ───────────────────────────────────────────────────────────
const run = (file, args, opts = {}) =>
  execFileSync(file, args, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024, ...opts });

const gh = (args) => run('gh', args, { env: { ...process.env, GH_TOKEN: GITHUB_TOKEN } });

// ── Fetch PR metadata ───────────────────────────────────────────────────────
log.startGroup('Fetch PR metadata');
const pr = JSON.parse(
  gh(['pr', 'view', PR_NUMBER, '--repo', REPO, '--json', 'title,body,headRefName,baseRefName,headRefOid']),
);
log.info(`PR: #${PR_NUMBER} "${pr.title}"`);
log.info(`SHA: ${pr.headRefOid}`);
log.endGroup();

// ── Create check run ────────────────────────────────────────────────────────
const headSha = pr.headRefOid;
const checkName = `Code Review — ${LABEL}`;
let checkId;
try {
  checkId = createCheckRun(checkName, headSha);
  log.info(`Created check run #${checkId}`);
} catch (e) {
  log.warn(`Could not create check run: ${e.message}`);
}

// ── Diff ────────────────────────────────────────────────────────────────────
log.startGroup('Fetch diff');
let diff = gh(['pr', 'diff', PR_NUMBER, '--repo', REPO]);
let truncated = false;
if (!diff) {
  diff = '(no diff)';
  truncated = true;
}
log.info(`Diff length: ${diff.length} chars`);
log.endGroup();

// ── Prompts from files ──────────────────────────────────────────────────────
log.startGroup('Build prompt');
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
log.info(`Prompt length: ${prompt.length} chars`);
log.endGroup();

// ── Cost estimate ───────────────────────────────────────────────────────────
const costEst = estimateCost(prompt.length);
if (costEst) {
  log.info(`Estimated cost: ~$${costEst.costUSD.toFixed(4)} (${costEst.inputTokens} input tokens)`);
}

// ── Invoke Kimi CLI ─────────────────────────────────────────────────────────
log.startGroup('Invoke Kimi CLI');
log.info('Command: kimi --quiet --input-format text -w .');
const result = spawnSync(
  'kimi',
  ['--quiet', '--input-format', 'text', '-w', '.', '--model', 'moonshot-ai/kimi-k2.6'],
  {
    encoding: 'utf8',
    input: prompt,
    stdio: ['pipe', 'pipe', 'pipe'],
    maxBuffer: 50 * 1024 * 1024,
    env: { ...process.env, MOONSHOT_API_KEY },
  },
);

log.info(`Exit code: ${result.status}`);
log.info(`Stdout length: ${result.stdout?.length ?? 0}`);
log.info(`Stderr length: ${result.stderr?.length ?? 0}`);

if (result.stderr) {
  const stderrLines = result.stderr.trim().split('\n').filter(Boolean);
  for (const line of stderrLines.slice(0, 20)) {
    log.warn(`stderr: ${line}`);
  }
  if (stderrLines.length > 20) {
    log.warn(`stderr: ... (${stderrLines.length - 20} more lines)`);
  }
}

let raw = result.stdout?.trim() || '';

if (!raw && result.status !== 0) {
  log.error('Kimi CLI failed with empty stdout');
  if (checkId) {
    updateCheckRun(checkId, 'failure', `${LABEL} review failed`, 'Kimi CLI returned empty stdout');
  }
  log.endGroup();
  process.exit(result.status ?? 1);
}

if (result.status !== 0) {
  log.warn(`Kimi exited ${result.status} but stdout is non-empty; attempting to parse`);
}

// Strip the "To resume this session" footer
const resumeLine = raw.indexOf('\nTo resume this session:');
if (resumeLine !== -1) {
  raw = raw.slice(0, resumeLine).trim();
  log.info('Stripped session-resume footer');
}

log.info(`Response preview (first 200 chars): ${raw.slice(0, 200).replace(/\n/g, '\\n')}`);
log.endGroup();

// ── Parse JSON ──────────────────────────────────────────────────────────────
log.startGroup('Parse response');
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
  log.info('JSON parsed successfully');
} catch (err) {
  log.error(`JSON parse error: ${err.message}`);
  log.warn(`Raw first 500 chars: ${raw.slice(0, 500).replace(/\n/g, '\\n')}`);
  postPlainFallback('Kimi returned free-form text instead of structured JSON', raw);
  if (checkId) {
    updateCheckRun(checkId, 'neutral', `${LABEL} review — parse error`, 'Could not parse agent output as JSON.');
  }
  log.endGroup();
  process.exit(0);
}

if (typeof review.summary !== 'string' || !Array.isArray(review.comments)) {
  log.error(`Invalid response shape: summary=${typeof review.summary}, comments=${typeof review.comments}`);
  postPlainFallback('Kimi response shape was invalid', raw);
  if (checkId) {
    updateCheckRun(checkId, 'neutral', `${LABEL} review — invalid shape`, 'Agent response did not match expected JSON shape.');
  }
  log.endGroup();
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

log.info(`Comments: ${review.comments.length}`);
log.endGroup();

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
    log.info(`Updated check run #${checkId} → ${checkConclusion}`);
  } catch (e) {
    log.warn(`Could not update check run: ${e.message}`);
  }
}

// ── Post PR review ──────────────────────────────────────────────────────────
log.startGroup('Post review to PR');
if (review.comments.length === 0) {
  writeFileSync('/tmp/summary.md', summary);
  gh(['pr', 'comment', PR_NUMBER, '--repo', REPO, '--body-file', '/tmp/summary.md']);
  log.info('Posted summary-only comment');
  log.endGroup();
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
  log.info('Posted review with inline comments');
} catch (err) {
  log.warn('Inline review API rejected the request; falling back to summary comment.');
  log.warn(err.stderr?.toString?.() || err.message);
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
log.endGroup();
