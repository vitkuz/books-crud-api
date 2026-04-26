# Project conventions (enforced in code review)

A minimal CRUD API in TypeScript + Express. Persistence is a single DynamoDB
table reached through a shared client (`src/shared/clients/dynamo-db/`).
All five entities (users, sessions, books, authors, categories) are backed
by `shared/services/<entity>.service.ts` — no in-memory `Map`s remain.

This file tells the Claude code reviewer what standards to enforce.
Inline-comment concrete violations of these rules; don't waste comments on
style preferences that aren't listed here.

## Architecture

```
HTTP layer (per feature)
  routes/   ──►  controllers/   ──►   shared/usecases/    ──►   shared/services/<entity>.service.ts
                                       (compose 2+ services)     (entity CRUD wrappers)
                                                                   │
                                                                   ▼
                                                    shared/clients/dynamo-db/  (instance + ops)
```

- Feature-first folders for the **HTTP layer only**: `src/features/<feature>/`
  contains `routes/`, `controllers/`, `<feature>.schema.ts`, and any
  HTTP-only utility (e.g. `auth.utils.extractBearerToken`).
- **Data services** live in `src/shared/services/<entity>.service.ts`. They
  wrap the DynamoDB client with entity-specific CRUD (`create`, `findById`,
  `findAll`, etc.). Each service is exported as a module-level singleton
  built once at module load against the shared `DynamoDbClient` from
  `src/shared/clients/dynamo-db/instance.ts`.
- **Use cases** live in `src/shared/usecases/<action>.usecase.ts`. They
  compose **two or more** services. A controller calling a single service
  directly is fine — only reach for a usecase when there's real composition.
- **Entity types** (`User`, `Book`, `Author`, ...) live in `src/shared/types/`
  because services own the persisted shape.
- **Schemas** (`*.schema.ts`) are HTTP-payload validation and stay per
  feature.
- Routes only bind paths to controllers; no logic.
- Controllers parse input (Zod), call usecases or services, shape the HTTP
  response. No business rules.

### DynamoDB item shape

- Single table; `pk` + `sk` strings. Each entity picks a `pk` prefix
  (`USER#<id>`, `BOOK#<id>`, `SESSION#<token>`, ...) and a stable `sk`
  discriminator (`PROFILE`, `META`, `DATA`, ...).
- The store layer copies `metadata.createdAt` / `metadata.updatedAt` to
  top-level `createdAt` / `updatedAt` so GSI2 (sort by updatedAt) and GSI3
  (sort by createdAt) work. API response shapes keep the nested `metadata`
  block.

## Async controller error handling

All async controller handlers are wrapped with `asyncHandler` from
`src/shared/utils/async-handler.ts` at the route level. This forwards
rejected promises to Express's error middleware (which returns 500) so
controllers can `await` services without inlining try/catch. New routes
should follow this pattern:

```ts
booksRouter.post('/', requireAuth, asyncHandler(booksController.postBook));
```

Services are free to throw on infrastructure errors (DynamoDB
exceptions, etc.) — `asyncHandler` will route them to the global error
handler. Services still return discriminated unions for *expected*
domain failures (`EMAIL_TAKEN`, `BOOK_NOT_FOUND`, etc.).

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
