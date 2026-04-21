#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const { REPO, PR_NUMBER, GEMINI_API_KEY } = process.env;
const MODEL = process.env.MODEL || 'gemini-3-pro';
const LABEL = 'Gemini';
const MAX_DIFF_CHARS = 150000;

if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is required');
if (!REPO) throw new Error('REPO is required');
if (!PR_NUMBER) throw new Error('PR_NUMBER is required');

if (!/^[\w.-]+\/[\w.-]+$/.test(REPO)) {
  throw new Error(`REPO does not look like "owner/name": ${REPO}`);
}
if (!/^\d+$/.test(PR_NUMBER)) {
  throw new Error(`PR_NUMBER must be a positive integer, got: ${PR_NUMBER}`);
}

const run = (file, args) =>
  execFileSync(file, args, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });

const gh = (args) => run('gh', args);

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
  'The full source tree is available in your current working directory — use your read/glob/search_file_content tools to open any file whose definition or call sites you need to understand. Look things up on demand; do not scan the whole repo.',
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

console.log(`Invoking Gemini CLI (${MODEL})...`);
const result = spawnSync(
  'npx',
  [
    '-y',
    '@google/gemini-cli@0.38.2',
    '-p',
    prompt,
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
  console.error(`gemini CLI exited with status ${result.status}`);
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
  process.exit(0);
}

if (typeof review.summary !== 'string' || !Array.isArray(review.comments)) {
  console.warn('Gemini response shape was invalid:', review);
  postPlainFallback('Gemini response shape was invalid', raw);
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

const summary = [
  `## 🤖 Gemini CLI review — ${LABEL} (${MODEL})`,
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
