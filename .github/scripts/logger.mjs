#!/usr/bin/env node
/**
 * Structured logger for GitHub Actions review scripts.
 *
 * Uses @actions/core when available (annotations + groups in Actions UI),
 * falls back to console with prefixed levels locally.
 */

let core;
try {
  core = await import('@actions/core');
} catch {
  core = null;
}

const PREFIX = {
  debug: '\x1b[90m[DEBUG]\x1b[0m',
  info:  '\x1b[36m[INFO]\x1b[0m',
  warn:  '\x1b[33m[WARN]\x1b[0m',
  error: '\x1b[31m[ERROR]\x1b[0m',
  group: '\x1b[35m[GROUP]\x1b[0m',
};

export const debug = (msg) => {
  if (core) core.debug(String(msg));
  else if (process.env.DEBUG === '1') console.error(PREFIX.debug, msg);
};

export const info = (msg) => {
  if (core) core.info(String(msg));
  else console.log(PREFIX.info, msg);
};

export const warn = (msg) => {
  if (core) core.warning(String(msg));
  else console.error(PREFIX.warn, msg);
};

export const error = (msg) => {
  if (core) core.error(String(msg));
  else console.error(PREFIX.error, msg);
};

export const startGroup = (title) => {
  if (core) core.startGroup(title);
  else console.log(PREFIX.group, `━━ ${title} ━━`);
};

export const endGroup = () => {
  if (core) core.endGroup();
  else console.log(PREFIX.group, '━━ end ━━');
};

export const setFailed = (msg) => {
  if (core) core.setFailed(String(msg));
  else {
    console.error(PREFIX.error, msg);
    process.exitCode = 1;
  }
};
