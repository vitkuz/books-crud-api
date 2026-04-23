#!/usr/bin/env node
import { execFileSync, spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';

const {
  REPO,
  PR_NUMBER,
  ANTHROPIC_API_KEY,
  GITHUB_TOKEN,
  BASE_REF,
  HEAD_SHA,
} = process.env;

const MODEL = process.env.CLAUDE_MODEL || 'claude-opus-4-7';
const LABEL = 'Claude (CLI)';

if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is required');
if (!GITHUB_TOKEN) throw new Error('GITHUB_TOKEN is required');
if (!REPO) throw new Error('REPO is required');
if (!PR_NUMBER) throw new Error('PR_NUMBER is required');
if (!BASE_REF) throw new Error('BASE_REF is required');
if (!HEAD_SHA) throw new Error('HEAD_SHA is required');

if (!/^([\w.-]+\/){1,2}[\w.-]+$/.test(REPO)) {
  throw new Error(`REPO does not look like "owner/name": ${REPO}`);
}
if (!/^\d+$/.test(PR_NUMBER)) {
  throw new Error(`PR_NUMBER must be a positive integer, got: ${PR_NUMBER}`);
}

// ── Pricing (Anthropic list price per 1M tokens, used only if the CLI does
//    not report total_cost_usd in its final result event) ───────────────────
const PRICING = {
  'claude-opus-4-7':           { input: 15, output: 75 },
  'claude-sonnet-4-6':         { input:  3, output: 15 },
  'claude-haiku-4-5-20251001': { input:  1, output:  5 },
};

const estimateCost = (model, inputTokens, outputTokens) => {
  const p = PRICING[model] || PRICING['claude-opus-4-7'];
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
};

// ── Shell helpers ───────────────────────────────────────────────────────────
const run = (file, args, opts = {}) =>
  execFileSync(file, args, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024, ...opts });

const gh = (args) => run('gh', args, { env: { ...process.env, GH_TOKEN: GITHUB_TOKEN } });

// Read any file at its state on the PR base ref, so a malicious PR cannot
// rewrite the review rules used for its own review.
const readFromBase = (path) => {
  try {
    return run('git', ['show', `origin/${BASE_REF}:${path}`]);
  } catch {
    return '';
  }
};

// ── GitHub Checks API ──────────────────────────────────────────────────────
const createCheckRun = (name, headSha) => {
  const payload = {
    name,
    head_sha: headSha,
    status: 'in_progress',
    started_at: new Date().toISOString(),
  };
  writeFileSync('/tmp/cc-check-create.json', JSON.stringify(payload));
  const out = gh([
    'api', '--method', 'POST',
    '-H', 'Accept: application/vnd.github+json',
    `/repos/${REPO}/check-runs`,
    '--input', '/tmp/cc-check-create.json',
  ]);
  return JSON.parse(out).id;
};

const updateCheckRun = (checkId, conclusion, summary, text) => {
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
  writeFileSync('/tmp/cc-check-update.json', JSON.stringify(payload));
  gh([
    'api', '--method', 'PATCH',
    '-H', 'Accept: application/vnd.github+json',
    `/repos/${REPO}/check-runs/${checkId}`,
    '--input', '/tmp/cc-check-update.json',
  ]);
};

// ── .reviewignore (from BASE ref) ───────────────────────────────────────────
const loadIgnorePatterns = () => {
  const raw = readFromBase('.reviewignore');
  if (!raw) return [];
  return raw.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
};

const shouldIgnoreFile = (filePath, patterns) =>
  patterns.some((pat) => {
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

const filterDiff = (diff, patterns) => {
  if (!patterns.length) return diff;
  const hunks = diff.split(/^diff --git /m).filter(Boolean);
  const kept = hunks.filter((hunk) => {
    const header = hunk.split('\n')[0] || '';
    const m = header.match(/\s[ab]\/(.+?)(?:\s|$)/);
    if (!m) return true;
    return !shouldIgnoreFile(m[1], patterns);
  });
  return kept.length ? 'diff --git ' + kept.join('diff --git ') : '';
};

// Extract, per file, the right-side line numbers that were added or modified
// in the unified diff. This whitelist is the only (path, line) universe the
// model is allowed to anchor inline comments to.
const buildValidLines = (diff) => {
  const result = {};
  const lines = diff.split('\n');
  let currentFile = null;
  let newLine = 0;

  for (const line of lines) {
    if (line.startsWith('+++ /dev/null')) { currentFile = null; continue; }
    if (line.startsWith('+++ b/'))        { currentFile = line.slice(6).split('\t')[0]; result[currentFile] ??= []; newLine = 0; continue; }
    if (line.startsWith('+++ '))          { currentFile = null; continue; }
    if (line.startsWith('---'))           { continue; }
    if (line.startsWith('@@')) {
      const m = line.match(/@@\s+-\d+(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@/);
      if (m) newLine = Number(m[1]);
      continue;
    }
    if (!currentFile) continue;
    if (line.startsWith('+')) { result[currentFile].push(newLine); newLine++; }
    else if (line.startsWith(' ')) { newLine++; }
    // '-' lines advance only the old-side counter, not newLine.
  }

  for (const k of Object.keys(result)) {
    result[k] = [...new Set(result[k])].sort((a, b) => a - b);
    if (result[k].length === 0) delete result[k];
  }
  return result;
};

// ── Start check run ────────────────────────────────────────────────────────
const checkName = `Code Review — ${LABEL}`;
let checkId;
try {
  checkId = createCheckRun(checkName, HEAD_SHA);
  console.log(`Created check run #${checkId}`);
} catch (e) {
  console.warn('Could not create check run:', e.message);
}

// ── Read authority files from BASE ref ─────────────────────────────────────
const systemPrompt       = readFromBase('.github/prompts/system-prompt.md');
const reviewInstructions = readFromBase('.github/prompts/review-instructions.md');
const conventions        = readFromBase('CLAUDE.md');

if (!systemPrompt || !conventions) {
  console.warn('system-prompt.md or CLAUDE.md missing from base ref; continuing with whatever is available.');
}

// ── PR metadata ────────────────────────────────────────────────────────────
const pr = JSON.parse(
  gh(['pr', 'view', PR_NUMBER, '--repo', REPO, '--json', 'title,body,headRefName,baseRefName,headRefOid'])
);

// ── Diff ───────────────────────────────────────────────────────────────────
let diff = gh(['pr', 'diff', PR_NUMBER, '--repo', REPO]);
const patterns = loadIgnorePatterns();
const beforeLen = diff.length;
diff = filterDiff(diff, patterns);
if (diff.length !== beforeLen) {
  console.log(`Filtered diff: ${beforeLen} → ${diff.length} chars (${patterns.length} ignore patterns)`);
}

if (!diff.trim()) {
  const msg = `## 🤖 ${LABEL} review\n\nNothing to review — diff is empty after \`.reviewignore\` filtering.`;
  writeFileSync('/tmp/cc-empty.md', msg);
  gh(['pr', 'comment', PR_NUMBER, '--repo', REPO, '--body-file', '/tmp/cc-empty.md']);
  if (checkId) try { updateCheckRun(checkId, 'neutral', `${LABEL}: nothing to review`, ''); } catch {}
  process.exit(0);
}

// ── Whitelist ──────────────────────────────────────────────────────────────
const validLines = buildValidLines(diff);
const whitelistJson = JSON.stringify(validLines, null, 2);
const validFileCount = Object.keys(validLines).length;
const validLineCount = Object.values(validLines).reduce((a, b) => a + b.length, 0);

// ── Prompt assembly ────────────────────────────────────────────────────────
const prompt = [
  systemPrompt,
  '',
  `Repository: ${REPO}`,
  `PR #${PR_NUMBER}: ${pr.title}`,
  '',
  `Description:\n${pr.body?.trim() || '(no description)'}`,
  '',
  conventions
    ? `Project conventions to enforce (from CLAUDE.md, read from base ref \`${BASE_REF}\`):\n---\n${conventions}\n---\n`
    : '',
  'Unified diff (authoritative list of what changed):',
  '```diff',
  diff,
  '```',
  '',
  'Valid inline-comment anchors (right-side line numbers present in the diff):',
  '```json',
  whitelistJson,
  '```',
  'Every inline comment you post MUST target a `(path, line)` pair that appears in this whitelist. If you have a finding you cannot anchor to a whitelisted line, put it in the summary comment instead — never attach it as an inline comment with a line that is not in the whitelist, or GitHub will reject the entire review body.',
  '',
  reviewInstructions,
  '',
  'How to post your review (mechanical instructions — follow exactly):',
  '',
  `1. Write a short top-level summary (markdown) to a file, e.g. \`/tmp/summary.md\`, then run:`,
  `   \`gh pr comment ${PR_NUMBER} --repo ${REPO} --body-file /tmp/summary.md\`.`,
  `2. If you have inline findings, assemble a JSON body to a file (e.g. \`/tmp/review.json\`) with this shape:`,
  '   ```json',
  '   {',
  '     "body": "<one-line header, e.g. \'Claude CLI review\'>",',
  '     "event": "COMMENT",',
  `     "commit_id": "${HEAD_SHA}",`,
  '     "comments": [',
  '       { "path": "<path>", "line": <int>, "side": "RIGHT", "body": "<markdown finding>" }',
  '     ]',
  '   }',
  '   ```',
  `   Then run: \`gh api --method POST /repos/${REPO}/pulls/${PR_NUMBER}/reviews --input /tmp/review.json\`.`,
  `3. If the PR is clean, post only the summary comment saying so — skip the inline review.`,
  `4. Do not print review text as chat output — it is invisible to the PR author. Only \`gh pr comment\` and \`gh api POST /pulls/${PR_NUMBER}/reviews\` actually deliver feedback.`,
].filter(Boolean).join('\n');

console.log(`Prompt: ${prompt.length.toLocaleString()} chars; ${validFileCount} files, ${validLineCount} valid lines in whitelist.`);

// ── Invoke claude CLI ──────────────────────────────────────────────────────
const ALLOWED_TOOLS = [
  'Read',
  'Glob',
  'Grep',
  'Bash(gh --version)',
  'Bash(gh --help)',
  'Bash(gh auth status)',
  'Bash(gh pr view:*)',
  'Bash(gh pr diff:*)',
  'Bash(gh pr comment:*)',
  'Bash(gh api:*)',
].join(',');

const DISALLOWED_TOOLS = [
  'Edit',
  'Write',
  'Bash(rm:*)',
  'Bash(mv:*)',
  'Bash(curl:*)',
  'Bash(wget:*)',
].join(',');

const claudeArgs = [
  '-p',
  'Perform the PR review using the context provided on stdin. Follow the "How to post your review" instructions exactly.',
  '--model', MODEL,
  '--output-format', 'stream-json',
  '--verbose',
  '--include-partial-messages',
  '--allowedTools', ALLOWED_TOOLS,
  '--disallowedTools', DISALLOWED_TOOLS,
];

console.log(`Invoking claude CLI (model=${MODEL})`);
const child = spawn('claude', claudeArgs, {
  stdio: ['pipe', 'pipe', 'inherit'],
  env: { ...process.env, GH_TOKEN: GITHUB_TOKEN, ANTHROPIC_API_KEY },
});

child.stdin.on('error', (err) => console.warn('claude stdin error:', err.message));
try {
  child.stdin.write(prompt);
  child.stdin.end();
} catch (e) {
  console.warn('Could not write prompt to claude stdin:', e.message);
}

// ── Stream pretty-printer ──────────────────────────────────────────────────
const truncate = (s, n = 240) =>
  (typeof s === 'string' && s.length > n ? `${s.slice(0, n)}… (+${s.length - n} chars)` : s);

const summarizeToolInput = (name, input) => {
  if (!input || typeof input !== 'object') return '';
  if (name === 'Read')  return input.file_path || '';
  if (name === 'Glob')  return input.pattern || '';
  if (name === 'Grep')  return `${input.pattern || ''}${input.path ? ` in ${input.path}` : ''}`;
  if (name === 'Bash')  return truncate(input.command || '', 200);
  return truncate(JSON.stringify(input), 200);
};

const usage = { inputTokens: 0, outputTokens: 0, costUSD: null, reportedCost: false };
let lastErrorText = null;
let launchFailed = false;

child.on('error', (err) => {
  launchFailed = true;
  console.error('Failed to launch claude CLI:', err.message);
});

const rl = createInterface({ input: child.stdout });

rl.on('line', (line) => {
  if (!line.trim()) return;

  let evt;
  try { evt = JSON.parse(line); } catch { console.log(line); return; }

  if (evt.type === 'system' && evt.subtype === 'init') {
    console.log(`🟢 session ${evt.session_id || '?'} — model=${evt.model || MODEL}`);
    return;
  }

  if (evt.type === 'assistant' && evt.message?.content) {
    for (const block of evt.message.content) {
      if (block.type === 'text' && block.text) {
        console.log(`💭 ${block.text}`);
      } else if (block.type === 'tool_use') {
        console.log(`🔧 ${block.name}(${summarizeToolInput(block.name, block.input)})`);
      } else if (block.type === 'thinking' && block.thinking) {
        console.log(`🧠 ${truncate(block.thinking, 500)}`);
      }
    }
    return;
  }

  if (evt.type === 'user' && evt.message?.content) {
    for (const block of evt.message.content) {
      if (block.type === 'tool_result') {
        const body = typeof block.content === 'string'
          ? block.content
          : Array.isArray(block.content)
            ? block.content.map((c) => (typeof c === 'string' ? c : c.text || '')).join('\n')
            : '';
        const indented = truncate(body, 320).split('\n').join('\n     ');
        console.log(`   ↳ ${indented}`);
      }
    }
    return;
  }

  if (evt.type === 'result') {
    if (evt.usage) {
      usage.inputTokens  = evt.usage.input_tokens  ?? 0;
      usage.outputTokens = evt.usage.output_tokens ?? 0;
    }
    if (typeof evt.total_cost_usd === 'number') {
      usage.costUSD = evt.total_cost_usd;
      usage.reportedCost = true;
    } else {
      usage.costUSD = estimateCost(MODEL, usage.inputTokens, usage.outputTokens);
    }
    if (evt.subtype && evt.subtype !== 'success') {
      lastErrorText = evt.result || evt.error || evt.subtype;
    }
    console.log(
      `🏁 ${evt.subtype || 'result'} — in=${usage.inputTokens}tok out=${usage.outputTokens}tok ` +
      `cost=$${(usage.costUSD ?? 0).toFixed(4)}${usage.reportedCost ? '' : ' (est.)'} ` +
      `duration=${evt.duration_ms || 0}ms`
    );
    return;
  }

  if (evt.type === 'stream_event') return; // partial deltas — keep log quiet

  console.log(`· ${evt.type}${evt.subtype ? ':' + evt.subtype : ''}`);
});

// ── Wait for both the stream to flush and the process to exit ──────────────
const [exitCode] = await Promise.all([
  new Promise((resolve) => {
    if (child.exitCode != null) return resolve(child.exitCode);
    if (launchFailed) return resolve(1);
    child.once('exit',  (code, signal) => resolve(code ?? (signal ? 1 : 0)));
    child.once('error', () => resolve(1));
  }),
  new Promise((resolve) => rl.once('close', resolve)),
]);

// ── Report out ─────────────────────────────────────────────────────────────
const costLine = usage.costUSD != null
  ? `model=\`${MODEL}\` · input=${usage.inputTokens.toLocaleString()}tok · output=${usage.outputTokens.toLocaleString()}tok · cost=$${usage.costUSD.toFixed(4)}${usage.reportedCost ? '' : ' _(estimated)_'}`
  : `model=\`${MODEL}\` · cost unavailable`;

if (exitCode !== 0 || launchFailed) {
  console.error(`claude CLI exited with code ${exitCode}${launchFailed ? ' (launch failure)' : ''}`);
  try {
    const body = [
      `## 🤖 ${LABEL} review — failed`,
      '',
      `The \`claude\` CLI exited with code \`${exitCode}\`${launchFailed ? ' (the binary could not be launched)' : ''}.`,
      lastErrorText ? `\nLast reported error: \`${truncate(lastErrorText, 500)}\`` : '',
      '',
      `_${costLine}_`,
      '',
      'Check the Actions run logs for details.',
    ].filter(Boolean).join('\n');
    writeFileSync('/tmp/cc-failed.md', body);
    gh(['pr', 'comment', PR_NUMBER, '--repo', REPO, '--body-file', '/tmp/cc-failed.md']);
  } catch {}
  if (checkId) {
    try { updateCheckRun(checkId, 'failure', `${LABEL}: failed (exit ${exitCode})`, costLine); } catch {}
  }
  process.exit(exitCode || 1);
}

if (checkId) {
  try {
    updateCheckRun(checkId, 'success', `${LABEL}: review complete`, costLine);
    console.log(`Updated check run #${checkId} → success`);
  } catch (e) {
    console.warn('Could not update check run:', e.message);
  }
}
