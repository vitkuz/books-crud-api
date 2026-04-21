# books-crud-api

Minimal Books + Authors CRUD REST API built with TypeScript + Express, using in-memory storage (no database).

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

## Data Model

`Book` references an `Author` by `authorId`. Book responses embed the full author object.

```ts
type Author = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

// Internal book shape
type Book = {
  id: string;
  title: string;
  authorId: string;
  year: number;
  createdAt: string;
  updatedAt: string;
};

// API response shape (author populated)
type BookResponse = {
  id: string;
  title: string;
  author: Author;
  year: number;
  createdAt: string;
  updatedAt: string;
};
```

## Endpoints

### Authors

| Method | Path            | Body                 | Returns         |
| ------ | --------------- | -------------------- | --------------- |
| GET    | `/authors`      | —                    | `Author[]`      |
| GET    | `/authors/:id`  | —                    | `Author`        |
| POST   | `/authors`      | `{ name }`           | `Author` (201)  |
| PUT    | `/authors/:id`  | `{ name? }`          | `Author`        |
| DELETE | `/authors/:id`  | —                    | 204             |

`DELETE /authors/:id` returns **409 Conflict** if any book references the author.

### Books

| Method | Path          | Body                                      | Returns             |
| ------ | ------------- | ----------------------------------------- | ------------------- |
| GET    | `/books`      | —                                         | `BookResponse[]`    |
| GET    | `/books/:id`  | —                                         | `BookResponse`      |
| POST   | `/books`      | `{ title, authorId, year }`               | `BookResponse` (201)|
| PUT    | `/books/:id`  | partial `{ title?, authorId?, year? }`    | `BookResponse`      |
| DELETE | `/books/:id`  | —                                         | 204                 |

`POST /books` and `PUT /books/:id` return **400 InvalidAuthor** if `authorId` doesn't match an existing author.

### Other

| Method | Path       | Returns        |
| ------ | ---------- | -------------- |
| GET    | `/health`  | `{ ok: true }` |

## Quick smoke test

```bash
# Create an author first
AUTHOR=$(curl -s -X POST localhost:3000/authors \
  -H 'content-type: application/json' \
  -d '{"name":"Frank Herbert"}')
AUTHOR_ID=$(echo "$AUTHOR" | jq -r .id)

# Create a book referencing that author
curl -s -X POST localhost:3000/books \
  -H 'content-type: application/json' \
  -d "{\"title\":\"Dune\",\"authorId\":\"$AUTHOR_ID\",\"year\":1965}"

# List books (author is populated)
curl -s localhost:3000/books
```

## Project Structure

```
src/
├── index.ts                    # bootstrap
├── app.ts                      # express app factory
├── shared/
│   ├── config/env.ts
│   └── utils/logger.ts
└── features/
    ├── authors/
    │   ├── authors.types.ts
    │   ├── authors.schema.ts
    │   ├── authors.store.ts
    │   ├── routes/
    │   ├── controllers/
    │   └── services/
    └── books/
        ├── books.types.ts
        ├── books.schema.ts
        ├── books.store.ts
        ├── books.utils.ts      # toBookResponse (populates author)
        ├── routes/
        ├── controllers/
        └── services/
```

Feature-first layout with a 3-layer architecture: routes → controllers → services.
