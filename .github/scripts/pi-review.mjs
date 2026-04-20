#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
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
} = process.env;

const MAX_DIFF_CHARS = 150000;

const required = { REPO, PR_NUMBER, PI_PROVIDER, PI_MODEL, LABEL };
for (const [k, v] of Object.entries(required)) {
  if (!v) throw new Error(`${k} env var is required`);
}

if (!/^[\w.-]+\/[\w.-]+$/.test(REPO)) {
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

if (PI_WRITE_MODELS_JSON === '1') {
  if (PI_PROVIDER !== 'deepseek') {
    throw new Error('PI_WRITE_MODELS_JSON=1 only supported for PI_PROVIDER=deepseek for now');
  }
  const agentDir = join(homedir(), '.pi', 'agent');
  mkdirSync(agentDir, { recursive: true });
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
  'The full source tree is available in your current working directory — use your read/grep/find/ls tools to open any file whose definition or call sites you need to understand, but stay focused: look things up on demand, do not scan the whole repo.',
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
  'Your FINAL message must be exactly a JSON object with this shape, and nothing else:',
  '{',
  '  "summary": "<one-paragraph overall review>",',
  '  "comments": [',
  '    { "path": "<file path>", "line": <integer>, "body": "<comment text>" }',
  '  ]',
  '}',
  'Do not wrap the JSON in markdown code fences. Do not include any prose before or after the JSON.',
  'If the PR is clean, return { "summary": "...", "comments": [] }.',
].join('\n');

console.log(`Invoking pi agent (${PI_PROVIDER}/${PI_MODEL})...`);
const piResult = spawnSync(
  'npx',
  [
    '-y',
    '@mariozechner/pi-coding-agent',
    '-p',
    prompt,
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
  process.exit(piResult.status ?? 1);
}

let raw = piResult.stdout.trim();

const fenceMatch = raw.match(/^```(?:json)?\s*\n([\s\S]*?)\n```$/);
if (fenceMatch) raw = fenceMatch[1].trim();

let review;
try {
  review = JSON.parse(raw);
} catch (err) {
  console.error('pi output was not valid JSON:', err.message);
  console.error('Raw stdout (first 2000 chars):\n', raw.slice(0, 2000));
  process.exit(1);
}

if (typeof review.summary !== 'string' || !Array.isArray(review.comments)) {
  console.error('pi output did not match expected shape:', review);
  process.exit(1);
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

const summary = [
  `## 🤖 pi agent review — ${LABEL} (${PI_MODEL})`,
  '',
  review.summary,
  truncated ? '\n_Note: the diff was truncated to fit the model context; later changes were not reviewed._' : '',
].join('\n');

const postSummaryOnly = () => {
  writeFileSync('/tmp/summary.md', summary);
  gh(['pr', 'comment', PR_NUMBER, '--repo', REPO, '--body-file', '/tmp/summary.md']);
  console.log('Posted summary-only comment');
};

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
