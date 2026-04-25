# Integration tests

Sequential, end-to-end HTTP tests against a running books-crud-api. No mocks,
no jest — just axios calls that exercise the real surface.

## Why sequential

The deployed Lambda uses in-memory `Map` storage per container. Concurrent
requests can hit different warm containers with isolated state, so the tests
must run **one request at a time**. The runner enforces this by `await`-ing
each call.

## How to run

```bash
# against `npm run dev` on localhost:3000
npm run test:integration:local

# against the deployed Lambda
npm run test:integration:deploy
```

Targets are configured in the root `.env`:

```
LOCAL_BASE_URL=http://localhost:3000
DEPLOY_BASE_URL=https://<api-id>.execute-api.us-east-1.amazonaws.com
```

## What it covers

- `GET /health`
- `POST /init` — bootstrap admin user (idempotent: 409 on subsequent runs)
- `POST /auth/register` → `GET /auth/me` (with token, then without — expects 401)
- `/authors` CRUD: create, get, update, missing → 404
- `/books` CRUD: create, list, count, update, delete, get-after-delete → 404
- `/users` CRUD: get, list, partial update, empty patch → 400
- `POST /auth/logout` → `GET /auth/me` (401 after logout)
- 404 for unknown route

Each request is logged with a short `x-request-id` for correlation:

```
-> [a1b2c3d4] POST /auth/register {"email":"...","password":"...","name":"..."}
<- [a1b2c3d4] 201 (12ms) {"user":{"id":"...","email":"..."},"token":"..."}
[PASS] auth: register
```

The runner exits non-zero on any failure.
