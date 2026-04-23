#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const { REPO, PR_NUMBER, MOONSHOT_API_KEY, GITHUB_TOKEN } = process.env;
const MODEL = process.env.MODEL || 'kimi-for-coding';
const LABEL = 'Kimi';
const BASE_URL = 'https://api.kimi.com/coding/v1';

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
// Kimi Code pricing is subscription-based; these are rough API estimates
const PRICING = {
  'kimi-for-coding': { input: 0.60, output: 0.60 },
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

const userPrompt = [
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
].filter(Boolean).join('\n');

// ── Tool definitions ────────────────────────────────────────────────────────
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Read the contents of a file',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative file path' },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_directory',
      description: 'List files in a directory',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Relative directory path' },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'grep',
      description: 'Search for a pattern in files',
      parameters: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Regex pattern to search' },
          path: { type: 'string', description: 'Directory or file to search (optional)' },
        },
        required: ['pattern'],
      },
    },
  },
];

function executeTool(call) {
  const name = call.function.name;
  const args = JSON.parse(call.function.arguments);
  console.log(`Tool call: ${name}(${JSON.stringify(args)})`);

  try {
    switch (name) {
      case 'read_file': {
        const p = args.path;
        if (!existsSync(p)) return { error: `File not found: ${p}` };
        const content = readFileSync(p, 'utf8');
        return { content: content.slice(0, 50000) };
      }
      case 'list_directory': {
        const p = args.path || '.';
        if (!existsSync(p)) return { error: `Directory not found: ${p}` };
        const entries = readdirSync(p).map((e) => {
          const s = statSync(join(p, e));
          return { name: e, type: s.isDirectory() ? 'dir' : 'file' };
        });
        return { entries };
      }
      case 'grep': {
        const pattern = args.pattern;
        const path = args.path || '.';
        try {
          const results = run('grep', ['-rn', pattern, path]);
          return { matches: results.split('\n').filter(Boolean).slice(0, 50) };
        } catch (e) {
          return { matches: [] };
        }
      }
      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (err) {
    return { error: err.message };
  }
}

// ── Kimi agent loop ─────────────────────────────────────────────────────────
async function runKimiAgent() {
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  let totalInputChars = systemPrompt.length + userPrompt.length;
  let totalOutputChars = 0;
  const maxRounds = 10;

  for (let round = 0; round < maxRounds; round++) {
    console.log(`Agent round ${round + 1}/${maxRounds}...`);

    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MOONSHOT_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        tools: TOOLS,
        tool_choice: 'auto',
        temperature: 0.2,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Kimi API error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const choice = data.choices[0];
    const message = choice.message;

    totalOutputChars += message.content?.length || 0;

    if (message.tool_calls && message.tool_calls.length > 0) {
      messages.push(message);

      for (const toolCall of message.tool_calls) {
        const result = executeTool(toolCall);
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
          content: JSON.stringify(result),
        });
        totalInputChars += JSON.stringify(result).length;
      }
      continue;
    }

    const costEst = estimateCost(MODEL, totalInputChars, totalOutputChars);
    return { content: message.content || '', costEst };
  }

  throw new Error(`Agent exceeded ${maxRounds} rounds without returning final review`);
}

// ── Run the agent ───────────────────────────────────────────────────────────
console.log(`Starting Kimi agent (${MODEL}) via ${BASE_URL}...`);
let result;
try {
  result = await runKimiAgent();
} catch (err) {
  console.error('Kimi agent failed:', err.message);
  if (checkId) {
    updateCheckRun(checkId, 'failure', `${LABEL} review failed`, err.message);
  }
  process.exit(1);
}

const { content: raw, costEst } = result;
console.log(`Kimi response length: ${raw.length} chars`);
if (costEst) {
  console.log(`Estimated cost: ~$${costEst.costUSD.toFixed(4)} (${costEst.inputTokens} input / ${costEst.outputTokens} output tokens)`);
}

// ── Parse JSON ──────────────────────────────────────────────────────────────
let cleaned = raw.trim();
const fenceMatch = cleaned.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
if (fenceMatch) cleaned = fenceMatch[1].trim();

const firstBrace = cleaned.indexOf('{');
const lastBrace = cleaned.lastIndexOf('}');
const candidate = firstBrace !== -1 && lastBrace > firstBrace
  ? cleaned.slice(firstBrace, lastBrace + 1)
  : '';

const postPlainFallback = (reason, body) => {
  const fallback = [
    `## 🤖 Kimi agent review — ${LABEL} (${MODEL})`,
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
  review = JSON.parse(candidate || cleaned);
} catch (err) {
  console.warn('Kimi output was not valid JSON:', err.message);
  console.warn('Raw (first 2000 chars):\n', cleaned.slice(0, 2000));
  postPlainFallback('Kimi returned free-form text instead of structured JSON', raw);
  if (checkId) {
    updateCheckRun(checkId, 'neutral', `${LABEL} review — parse error`, 'Could not parse agent output as JSON.');
  }
  process.exit(0);
}

if (typeof review.summary !== 'string' || !Array.isArray(review.comments)) {
  console.warn('Kimi response shape was invalid:', review);
  postPlainFallback('Kimi response shape was invalid', raw);
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

console.log(`Kimi returned: ${review.comments.length} inline comments`);

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
  `## 🤖 Kimi agent review — ${LABEL} (${MODEL})`,
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
