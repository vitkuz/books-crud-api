# books-crud-api

Minimal Books + Authors + Categories CRUD REST API built with TypeScript + Express, using in-memory storage (no database).

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

A `Book` references an `Author` by `authorId` and 0..N categories by `categoryIds`. Book responses embed the full author and the list of populated categories.

```ts
type Author = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

type Category = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

type Tag = {
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
  categoryIds: string[];
  tagIds: string[];
  year: number;
  createdAt: string;
  updatedAt: string;
};

// API response shape (author + categories + tags populated)
type BookResponse = {
  id: string;
  title: string;
  author: Author;
  categories: Category[];
  tags: Tag[];
  year: number;
  createdAt: string;
  updatedAt: string;
};
```

## Endpoints

### Authors

| Method | Path                 | Body                | Returns         |
| ------ | -------------------- | ------------------- | --------------- |
| GET    | `/authors`           | —                   | `Author[]`      |
| GET    | `/authors/:id`       | —                   | `Author`        |
| POST   | `/authors`           | `{ name }`          | `Author` (201)  |
| POST   | `/authors/batch`     | `{ ids: string[] }` | `Author[]`      |
| PUT    | `/authors/:id`       | `{ name? }`         | `Author`        |
| DELETE | `/authors/:id`       | —                   | 204             |

`DELETE /authors/:id` returns **409 Conflict** if any book references the author.
`POST /authors/batch` silently skips unknown ids; enforces 1 ≤ `ids.length` ≤ 100.

### Categories

| Method | Path                   | Body                | Returns           |
| ------ | ---------------------- | ------------------- | ----------------- |
| GET    | `/categories`          | —                   | `Category[]`      |
| GET    | `/categories/:id`      | —                   | `Category`        |
| POST   | `/categories`          | `{ name }`          | `Category` (201)  |
| POST   | `/categories/batch`    | `{ ids: string[] }` | `Category[]`      |
| PUT    | `/categories/:id`      | `{ name? }`         | `Category`        |
| DELETE | `/categories/:id`      | —                   | 204               |

`DELETE /categories/:id` returns **409 Conflict** if any book still references the category.
`POST /categories/batch` silently skips unknown ids; enforces 1 ≤ `ids.length` ≤ 100.

### Tags

| Method | Path             | Body             | Returns        |
| ------ | ---------------- | ---------------- | -------------- |
| GET    | `/tags`          | —                | `Tag[]`        |
| GET    | `/tags/:id`      | —                | `Tag`          |
| POST   | `/tags`          | `{ name }`       | `Tag` (201)    |
| POST   | `/tags/batch`    | `{ ids: string[] }` | `Tag[]`     |
| PUT    | `/tags/:id`      | `{ name? }`      | `Tag`          |
| DELETE | `/tags/:id`      | —                | 204            |

`DELETE /tags/:id` returns **409 Conflict** if any book still references the tag.
`POST /tags/batch` silently skips unknown ids; enforces 1 ≤ `ids.length` ≤ 100.

### Books

| Method | Path             | Body                                                   | Returns              |
| ------ | ---------------- | ------------------------------------------------------ | -------------------- |
| GET    | `/books`         | —                                                      | `BookResponse[]`     |
| GET    | `/books/:id`     | —                                                      | `BookResponse`       |
| POST   | `/books`         | `{ title, authorId, categoryIds?, tagIds?, year }`     | `BookResponse` (201) |
| POST   | `/books/batch`   | `{ ids: string[] }`                                    | `BookResponse[]`     |
| PUT    | `/books/:id`     | partial `{ title?, authorId?, categoryIds?, tagIds?, year? }` | `BookResponse` |
| DELETE | `/books/:id`     | —                                                      | 204                  |

- `categoryIds` and `tagIds` are optional on POST (both default to `[]`). Duplicates are silently deduped.
- On PUT, omitting `categoryIds` / `tagIds` leaves existing values unchanged; sending `[]` clears them.
- Returns **400 InvalidAuthor** if `authorId` doesn't reference an existing author.
- Returns **400 InvalidCategoryIds** if any `categoryIds` entry doesn't reference an existing category.
- Returns **400 InvalidTagIds** if any `tagIds` entry doesn't reference an existing tag.
- `POST /books/batch` silently skips unknown ids; enforces 1 ≤ `ids.length` ≤ 100. Response is already populated with `author` and `categories`.

### Other

| Method | Path       | Returns        |
| ------ | ---------- | -------------- |
| GET    | `/health`  | `{ ok: true }` |

## Quick smoke test

```bash
# Create an author and two categories
AUTHOR_ID=$(curl -s -X POST localhost:3000/authors \
  -H 'content-type: application/json' \
  -d '{"name":"Frank Herbert"}' | jq -r .id)

CAT1_ID=$(curl -s -X POST localhost:3000/categories \
  -H 'content-type: application/json' \
  -d '{"name":"Science Fiction"}' | jq -r .id)

CAT2_ID=$(curl -s -X POST localhost:3000/categories \
  -H 'content-type: application/json' \
  -d '{"name":"Classic"}' | jq -r .id)

# Create a book in both categories
curl -s -X POST localhost:3000/books \
  -H 'content-type: application/json' \
  -d "{\"title\":\"Dune\",\"authorId\":\"$AUTHOR_ID\",\"categoryIds\":[\"$CAT1_ID\",\"$CAT2_ID\"],\"year\":1965}"

# List books (author + categories populated)
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
    ├── categories/
    │   ├── categories.types.ts
    │   ├── categories.schema.ts
    │   ├── categories.store.ts
    │   ├── routes/
    │   ├── controllers/
    │   └── services/
    ├── tags/
    │   ├── tags.types.ts
    │   ├── tags.schema.ts
    │   ├── tags.store.ts
    │   ├── routes/
    │   ├── controllers/
    │   └── services/
    └── books/
        ├── books.types.ts
        ├── books.schema.ts
        ├── books.store.ts
        ├── books.utils.ts      # toBookResponse (populates author + categories)
        ├── routes/
        ├── controllers/
        └── services/
```

Feature-first layout with a 3-layer architecture: routes → controllers → services.
