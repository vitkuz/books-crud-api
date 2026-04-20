#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const { OPENAI_API_KEY, REPO, PR_NUMBER } = process.env;
const MODEL = process.env.MODEL || 'gpt-4.1';
const MAX_DIFF_CHARS = 150000;

if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is required');
if (!REPO) throw new Error('REPO is required');
if (!PR_NUMBER) throw new Error('PR_NUMBER is required');

const sh = (cmd) =>
  execSync(cmd, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });

const pr = JSON.parse(
  sh(`gh pr view ${PR_NUMBER} --repo ${REPO} --json title,body,headRefName,baseRefName`),
);

let diff = sh(`gh pr diff ${PR_NUMBER} --repo ${REPO}`);
let truncated = false;
if (diff.length > MAX_DIFF_CHARS) {
  diff = diff.slice(0, MAX_DIFF_CHARS);
  truncated = true;
}

const conventions = existsSync('CLAUDE.md') ? readFileSync('CLAUDE.md', 'utf8') : '';

const system = [
  'You are a senior software engineer performing a code review on a pull request.',
  'Find concrete, actionable issues: correctness bugs, security issues, and violations of stated project conventions.',
  'Do NOT comment on style, formatting, or minor preferences.',
  'If the PR is clean, return an empty comments array and a summary saying so.',
  '',
  'Every inline comment MUST reference a line that was added or modified in the diff (right side of the hunk).',
  'Use the exact file path from the diff header (e.g. "src/features/books/books.service.ts").',
  'Line numbers must refer to the NEW file after the change (the right-hand side).',
  'If you cannot be confident the line is present in the diff, omit that comment.',
  'Write each comment as a concrete suggestion or question, not generic advice.',
].join('\n');

const conventionsBlock = conventions
  ? `Project conventions to enforce (from CLAUDE.md):\n---\n${conventions}\n---\n\n`
  : '';

const user = [
  `Repository: ${REPO}`,
  `PR #${PR_NUMBER}: ${pr.title}`,
  '',
  `Description:\n${pr.body?.trim() || '(no description)'}`,
  '',
  conventionsBlock,
  'Unified diff:',
  '```diff',
  diff,
  '```',
  truncated ? '\n(NOTE: diff was truncated for review.)' : '',
].join('\n');

const schema = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    comments: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          line: { type: 'integer' },
          body: { type: 'string' },
        },
        required: ['path', 'line', 'body'],
        additionalProperties: false,
      },
    },
  },
  required: ['summary', 'comments'],
  additionalProperties: false,
};

const resp = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${OPENAI_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: MODEL,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'review', schema, strict: true },
    },
  }),
});

if (!resp.ok) {
  const text = await resp.text();
  console.error(`OpenAI API error ${resp.status}: ${text}`);
  process.exit(1);
}

const data = await resp.json();
const review = JSON.parse(data.choices[0].message.content);
console.log(`Model returned: ${review.comments.length} inline comments`);

const summary = [
  `## 🤖 OpenAI review (${MODEL})`,
  '',
  review.summary,
  truncated ? '\n_Note: the diff was truncated to fit the model context; later changes were not reviewed._' : '',
].join('\n');

const postSummaryOnly = () => {
  writeFileSync('/tmp/summary.md', summary);
  sh(`gh pr comment ${PR_NUMBER} --repo ${REPO} --body-file /tmp/summary.md`);
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
  sh(
    `gh api --method POST -H "Accept: application/vnd.github+json" ` +
      `/repos/${REPO}/pulls/${PR_NUMBER}/reviews --input /tmp/review.json`,
  );
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
  sh(`gh pr comment ${PR_NUMBER} --repo ${REPO} --body-file /tmp/fallback.md`);
}
