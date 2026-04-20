# books-crud-api

Minimal Books CRUD REST API built with TypeScript + Express, using in-memory storage (no database).

## Stack

- TypeScript, Node.js, Express 4
- Zod for validation
- Winston logger
- dotenv + Zod-validated env
- uuid for IDs

## Setup

```bash
npm install
cp .env.example .env
```

## Run

```bash
npm run dev      # ts-node
npm run build    # compile to dist/
npm start        # run compiled build
```

Server listens on `PORT` from `.env` (default 3000).

## Endpoints

| Method | Path          | Body                                 | Returns        |
| ------ | ------------- | ------------------------------------ | -------------- |
| GET    | `/health`     | —                                    | `{ ok: true }` |
| GET    | `/books`      | —                                    | `Book[]`       |
| GET    | `/books/:id`  | —                                    | `Book`         |
| POST   | `/books`      | `{ title, author, year }`            | `Book` (201)   |
| PUT    | `/books/:id`  | partial `{ title?, author?, year? }` | `Book`         |
| DELETE | `/books/:id`  | —                                    | 204            |

`Book` shape:

```ts
{
  id: string;
  title: string;
  author: string;
  year: number;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}
```

## Quick smoke test

```bash
curl -s localhost:3000/health
curl -s -X POST localhost:3000/books \
  -H 'content-type: application/json' \
  -d '{"title":"Dune","author":"Herbert","year":1965}'
curl -s localhost:3000/books
```

## Project Structure

```
src/
├── index.ts                   # bootstrap
├── app.ts                     # express app factory
├── shared/
│   ├── config/env.ts          # dotenv + zod env schema
│   └── utils/logger.ts        # winston singleton
└── features/
    └── books/
        ├── books.types.ts
        ├── books.schema.ts
        ├── books.store.ts     # in-memory Map
        ├── routes/
        ├── controllers/
        └── services/
```

Feature-first layout with a 3-layer architecture: routes → controllers → services.
