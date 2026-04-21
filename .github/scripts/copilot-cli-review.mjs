#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const { REPO, PR_NUMBER, COPILOT_PAT, GITHUB_TOKEN } = process.env;
const MODEL = process.env.MODEL || 'claude-opus-4.7';
const LABEL = 'GitHub Copilot CLI';
const MAX_DIFF_CHARS = 150000;

if (!COPILOT_PAT) throw new Error('COPILOT_PAT is required (fine-grained PAT with "Copilot Requests" permission)');
if (!GITHUB_TOKEN) throw new Error('GITHUB_TOKEN is required (for gh CLI operations)');
if (!REPO) throw new Error('REPO is required');
if (!PR_NUMBER) throw new Error('PR_NUMBER is required');

if (!/^[\w.-]+\/[\w.-]+$/.test(REPO)) {
  throw new Error(`REPO does not look like "owner/name": ${REPO}`);
}
if (!/^\d+$/.test(PR_NUMBER)) {
  throw new Error(`PR_NUMBER must be a positive integer, got: ${PR_NUMBER}`);
}

const run = (file, args, opts = {}) =>
  execFileSync(file, args, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024, ...opts });

const gh = (args) => run('gh', args, { env: { ...process.env, GH_TOKEN: GITHUB_TOKEN } });

const pr = JSON.parse(
  gh(['pr', 'view', PR_NUMBER, '--repo', REPO, '--json', 'title,body,headRefName,baseRefName']),
);

let diff = gh(['pr', 'diff', PR_NUMBER, '--repo', REPO]);
let truncated = false;
if (diff.length > MAX_DIFF_CHARS) {
  diff = diff.slice(0, MAX_DIFF_CHARS);
  truncated = true;
}

const conventions = existsSync('CLAUDE.md') ? readFileSync('CLAUDE.md', 'utf8') : '';
const conventionsBlock = conventions
  ? `Project conventions to enforce (from CLAUDE.md):\n---\n${conventions}\n---\n\n`
  : '';

const prompt = [
  'You are a senior software engineer performing a code review on a pull request.',
  'The full source tree is available in your current working directory — you may use your read-only shell tools (cat, grep, ls, find, git) to open any file whose definition or call sites you need to understand. Look things up on demand; do not scan the whole repo.',
  'You must NOT modify any files and must NOT run destructive commands.',
  '',
  'Report concrete, actionable issues: correctness bugs, security problems, violations of stated project conventions.',
  'Do NOT comment on style, formatting, or minor preferences.',
  'Every inline comment MUST reference a line that was ADDED or MODIFIED in the diff below (right side of the hunk). Use the exact file path from the diff header. Line numbers refer to the new file.',
  'If you cannot be confident a line is in the diff, omit that comment.',
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
  truncated ? '\n(NOTE: diff was truncated for review.)' : '',
  '',
  'OUTPUT CONTRACT — read carefully:',
  'Your FINAL assistant message must be a single JSON object and NOTHING ELSE.',
  'The first character must be `{` and the last must be `}`. No markdown fences. No prose before or after. No "Here is the review:" preamble.',
  'Exact shape:',
  '{',
  '  "summary": "<one-paragraph overall review>",',
  '  "comments": [',
  '    { "path": "<file path>", "line": <integer>, "body": "<comment text>" }',
  '  ]',
  '}',
  'If the PR is clean, return { "summary": "...", "comments": [] }.',
].join('\n');

console.log(`Invoking GitHub Copilot CLI (${MODEL})...`);
const result = spawnSync(
  'copilot',
  [
    '-p',
    prompt,
    '--model',
    MODEL,
    '--allow-all-tools',
    '--deny-tool',
    'write',
    '--deny-tool',
    'shell(rm)',
    '--deny-tool',
    'shell(mv)',
    '--deny-tool',
    'shell(curl)',
    '--deny-tool',
    'shell(wget)',
  ],
  {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
    maxBuffer: 50 * 1024 * 1024,
    env: { ...process.env, GH_TOKEN: COPILOT_PAT },
  },
);

if (result.status !== 0) {
  console.error(`copilot CLI exited with status ${result.status}`);
  process.exit(result.status ?? 1);
}

let raw = result.stdout.trim();
const fenceMatch = raw.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
if (fenceMatch) raw = fenceMatch[1].trim();

const firstBrace = raw.indexOf('{');
const lastBrace = raw.lastIndexOf('}');
const candidate = firstBrace !== -1 && lastBrace > firstBrace
  ? raw.slice(firstBrace, lastBrace + 1)
  : '';

const postPlainFallback = (reason, body) => {
  const fallback = [
    `## 🤖 ${LABEL} review (${MODEL})`,
    '',
    `_Note: ${reason}. Posting the agent's raw output as a single comment — no inline annotations this run._`,
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
  console.warn('Copilot CLI output was not valid JSON:', err.message);
  console.warn('Raw (first 2000 chars):\n', raw.slice(0, 2000));
  postPlainFallback('Copilot CLI returned free-form text instead of structured JSON', raw);
  process.exit(0);
}

if (typeof review.summary !== 'string' || !Array.isArray(review.comments)) {
  console.warn('Copilot response shape was invalid:', review);
  postPlainFallback('Copilot CLI response shape was invalid', raw);
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

console.log(`Copilot CLI returned: ${review.comments.length} inline comments`);

const summary = [
  `## 🤖 ${LABEL} review (${MODEL})`,
  '',
  review.summary,
  truncated ? '\n_Note: the diff was truncated to fit the model context; later changes were not reviewed._' : '',
].join('\n');

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
    body: c.body,
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
    ...review.comments.map((c) => `- **\`${c.path}:${c.line}\`** — ${c.body}`),
  ].join('\n');
  writeFileSync('/tmp/fallback.md', fallback);
  gh(['pr', 'comment', PR_NUMBER, '--repo', REPO, '--body-file', '/tmp/fallback.md']);
}
