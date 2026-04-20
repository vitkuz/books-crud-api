# Project conventions (enforced in code review)

A minimal CRUD API in TypeScript + Express with in-memory storage (`Map`).
This file tells the Claude code reviewer what standards to enforce. Inline-comment
concrete violations of these rules; don't waste comments on style preferences that
aren't listed here.

## Architecture

- Feature-first layout under `src/features/<feature>/`.
- Three layers per feature: `routes/` → `controllers/` → `services/`.
- `src/shared/` for cross-cutting code (`config/env.ts`, `utils/logger.ts`).
- A service **may** import another feature's `*.store.ts` for read-only data access.
- A service **must not** import another feature's `controllers/` or `routes/`.
- Routes only bind paths to controllers; no logic.
- Controllers parse input (Zod), call services, and shape the HTTP response. No
  business rules.
- Services hold business logic and touch stores.

## Coding style

- **No classes.** Functional / curried only. Factory functions over constructors.
- **Explicit types** on function parameters, return types, and non-primitive
  variables. Do not type primitive values (`string`, `number`, `boolean`).
- Pure helpers live in `*.utils.ts`. Types live in `*.types.ts`. Validation
  lives in `*.schema.ts` (Zod).
- Types are **derived** from Zod schemas via `z.infer<typeof schema>`; do not
  hand-duplicate them.
- Use `uuid` (v4) for IDs.
- No file-extension imports (`.ts`/`.js`). Project uses `moduleResolution: node`.
- Prefer `import * as fooService from './services'` for barrel imports.

## Validation

- Every request body and every path/query param is parsed with Zod `safeParse`
  in the controller, not in the service.
- A failed parse yields `400` with body `{ error: 'ValidationError', issues: … }`.
- `update*` schemas are `base.partial().refine(keys.length > 0, …)` so empty
  bodies are rejected.

## Error model

- Services that can fail for more than one reason return a **discriminated union**,
  not exceptions:
  ```ts
  type Result = { ok: true; data: T } | { ok: false; error: 'SOME_CODE' };
  ```
- Services with a single failure mode (e.g. "not found") may return `T | undefined`
  — the controller maps `undefined` to `404`.
- Controllers translate result codes to HTTP status codes. Typical mapping:
  - Validation failure → `400 ValidationError`
  - Referenced entity missing → `400 InvalidReference` (or similar)
  - Not found → `404 NotFound`
  - Conflict / preconditions → `409 Conflict`
  - Only unreachable / data-integrity bugs → `500 InternalServerError`

## HTTP responses

- Success bodies are JSON.
- Error body shape: `{ error: string, message?: string, issues?: ZodIssue[] }`.
- `DELETE` returns `204` with empty body on success.

## Logging

- Use the shared Winston logger at `src/shared/utils/logger.ts`.
- Each service logs: **start**, **success**, and each distinct **failure branch**
  at `debug` level.
- Do not log full request bodies if they might contain secrets (not currently
  applicable but a rule).

## Environment

- Env vars are read exclusively through `src/shared/config/env.ts`, which uses
  `dotenv/config` + a Zod schema. Never read `process.env` directly from feature
  code.

## Things to flag in review

- An endpoint without a Zod schema.
- A service throwing an `Error` where a result union would fit.
- A controller doing business logic instead of delegating to a service.
- Cross-feature import at the `controllers/` or `routes/` level.
- Missing explicit return type on an exported function.
- Adding a dependency for something a one-liner could do.
- Silent `catch` blocks.
- Direct `process.env.*` reads outside `src/shared/config/env.ts`.
- Mutation of function arguments / shared state outside the `*.store.ts` files.

## Things NOT to flag

- Missing tests. This project is intentionally untested for now.
- "Use a real database." In-memory is the chosen design.
- Pretty-printing, trailing whitespace, comment style.
- Suggestions to add helmet / cors / rate-limiting / OpenAPI / Swagger / auth
  **unless** the PR itself introduces a surface that demands them.
- Renaming existing files or folders for style reasons alone.

## Out of scope for review

- The GitHub Actions workflow file at `.github/workflows/claude-review.yml`,
  unless the PR itself modifies it.

## Review voice

- Direct and specific. Quote the offending line.
- Prefer inline comments pinned to the exact line for code issues. Use a single
  top-level summary comment at the end for high-level feedback.
- If the PR is clean, say so in the summary and leave no inline comments.
