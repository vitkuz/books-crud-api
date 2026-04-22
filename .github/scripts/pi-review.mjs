#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const {
  REPO,
  PR_NUMBER,
  PI_PROVIDER,
  PI_MODEL,
  LABEL,
  PI_WRITE_MODELS_JSON,
  OPENAI_API_KEY,
  DEEPSEEK_API_KEY,
  GITHUB_TOKEN,
} = process.env;

const required = { REPO, PR_NUMBER, PI_PROVIDER, PI_MODEL, LABEL };
for (const [k, v] of Object.entries(required)) {
  if (!v) throw new Error(`${k} env var is required`);
}

if (!/^([\w.-]+\/){1,2}[\w.-]+$/.test(REPO)) {
  throw new Error(`REPO does not look like "owner/name": ${REPO}`);
}
if (!/^\d+$/.test(PR_NUMBER)) {
  throw new Error(`PR_NUMBER must be a positive integer, got: ${PR_NUMBER}`);
}

if (PI_PROVIDER === 'openai' && !OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is required for PI_PROVIDER=openai');
}
if (PI_PROVIDER === 'deepseek' && !DEEPSEEK_API_KEY) {
  throw new Error('DEEPSEEK_API_KEY is required for PI_PROVIDER=deepseek');
}

// ── Pricing table (per 1M tokens, USD) ──────────────────────────────────────
const PRICING = {
  'gpt-4.1': { input: 2.00, output: 8.00 },
  'gpt-4.1-mini': { input: 0.40, output: 1.60 },
  'gpt-4.1-nano': { input: 0.10, output: 0.40 },
  'deepseek-chat': { input: 0.27, output: 1.10 },
  'deepseek-reasoner': { input: 0.55, output: 2.19 },
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
    // Simple glob-like matching
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
    // Extract file path from "a/path b/path"
    const m = header.match(/\s[ab]\/(.+?)(?:\s|$)/);
    if (!m) return true;
    return !shouldIgnoreFile(m[1], patterns);
  });
  return kept.length ? 'diff --git ' + kept.join('diff --git ') : '';
}

// ── pi models.json setup (DeepSeek only) ────────────────────────────────────
if (PI_WRITE_MODELS_JSON === '1') {
  if (PI_PROVIDER !== 'deepseek') {
    throw new Error('PI_WRITE_MODELS_JSON=1 only supported for PI_PROVIDER=deepseek');
  }
  const agentDir = join(homedir(), '.pi', 'agent');
  execFileSync('mkdir', ['-p', agentDir]);
  const modelsConfig = {
    providers: {
      deepseek: {
        baseUrl: 'https://api.deepseek.com/v1',
        api: 'openai-completions',
        apiKey: DEEPSEEK_API_KEY,
        models: [
          { id: 'deepseek-chat', contextWindow: 64000, maxTokens: 8192 },
          { id: 'deepseek-reasoner', reasoning: true, contextWindow: 64000, maxTokens: 8192 },
        ],
      },
    },
  };
  writeFileSync(join(agentDir, 'models.json'), JSON.stringify(modelsConfig));
  console.log('Wrote ~/.pi/agent/models.json for deepseek custom provider');
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
const costEst = estimateCost(PI_MODEL, prompt.length);
if (costEst) {
  console.log(`Estimated cost: ~$${costEst.costUSD.toFixed(4)} (${costEst.inputTokens} input tokens)`);
}

// ── Write prompt to file (avoid leaking in ps) ─────────────────────────────
const promptFile = '/tmp/pi-review-prompt.txt';
writeFileSync(promptFile, prompt);

// ── Invoke pi agent ─────────────────────────────────────────────────────────
console.log(`Invoking pi agent (${PI_PROVIDER}/${PI_MODEL})...`);
const piResult = spawnSync(
  'npx',
  [
    '-y',
    '@mariozechner/pi-coding-agent',
    '-p', `@{${promptFile}}`,
    '--provider',
    PI_PROVIDER,
    '--model',
    PI_MODEL,
    '--tools',
    'read,grep,find,ls',
    '--no-session',
    '--no-extensions',
    '--no-skills',
  ],
  { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], maxBuffer: 50 * 1024 * 1024 },
);

if (piResult.status !== 0) {
  console.error(`pi exited with status ${piResult.status}`);
  if (checkId) {
    updateCheckRun(checkId, 'failure', `${LABEL} review failed`, `pi agent exited with status ${piResult.status}`);
  }
  process.exit(piResult.status ?? 1);
}

let raw = piResult.stdout.trim();

const fenceMatch = raw.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
if (fenceMatch) raw = fenceMatch[1].trim();

const firstBrace = raw.indexOf('{');
const lastBrace = raw.lastIndexOf('}');
const candidate = firstBrace !== -1 && lastBrace > firstBrace
  ? raw.slice(firstBrace, lastBrace + 1)
  : '';

const postPlainFallback = (reason, body) => {
  const fallback = [
    `## 🤖 pi agent review — ${LABEL} (${PI_MODEL})`,
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
  console.warn('pi output was not valid JSON:', err.message);
  console.warn('Raw stdout (first 2000 chars):\n', raw.slice(0, 2000));
  postPlainFallback('pi returned free-form text instead of structured JSON', raw);
  if (checkId) {
    updateCheckRun(checkId, 'neutral', `${LABEL} review — parse error`, 'Could not parse agent output as JSON.');
  }
  process.exit(0);
}

if (typeof review.summary !== 'string' || !Array.isArray(review.comments)) {
  console.warn('pi output did not match expected shape:', review);
  postPlainFallback('pi response shape was invalid', raw);
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

console.log(`pi returned: ${review.comments.length} inline comments`);

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
  `## 🤖 pi agent review — ${LABEL} (${PI_MODEL})`,
  '',
  review.summary,
  truncated ? '\n_Note: the diff was empty after ignore-filtering._' : '',
  costEst ? `\n_Estimated cost: ~$${costEst.costUSD.toFixed(4)}_` : '',
].join('\n');

const postSummaryOnly = () => {
  writeFileSync('/tmp/summary.md', summary);
  gh(['pr', 'comment', PR_NUMBER, '--repo', REPO, '--body-file', '/tmp/summary.md']);
  console.log('Posted summary-only comment');
};

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
  postSummaryOnly();
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
