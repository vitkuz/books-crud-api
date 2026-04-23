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

// Internal book shape
type Book = {
  id: string;
  title: string;
  authorId: string;
  categoryIds: string[];
  year: number;
  createdAt: string;
  updatedAt: string;
};

// API response shape (author + categories populated)
type BookResponse = {
  id: string;
  title: string;
  author: Author;
  categories: Category[];
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

### Books

| Method | Path             | Body                                                   | Returns              |
| ------ | ---------------- | ------------------------------------------------------ | -------------------- |
| GET    | `/books`         | —                                                      | `BookResponse[]`     |
| GET    | `/books/:id`     | —                                                      | `BookResponse`       |
| POST   | `/books`         | `{ title, authorId, categoryIds?, year }`              | `BookResponse` (201) |
| POST   | `/books/batch`   | `{ ids: string[] }`                                    | `BookResponse[]`     |
| PUT    | `/books/:id`     | partial `{ title?, authorId?, categoryIds?, year? }`   | `BookResponse`       |
| DELETE | `/books/:id`     | —                                                      | 204                  |

- `categoryIds` is optional on POST (defaults to `[]`). Duplicates are silently deduped.
- On PUT, omitting `categoryIds` leaves existing categories unchanged; sending `[]` clears them.
- Returns **400 InvalidAuthor** if `authorId` doesn't reference an existing author.
- Returns **400 InvalidCategoryIds** if any `categoryIds` entry doesn't reference an existing category.
- `POST /books/batch` silently skips unknown ids; enforces 1 ≤ `ids.length` ≤ 100. Response is already populated with `author` and `categories`.

### Users

| Method | Path          | Body                                   | Returns         |
| ------ | ------------- | -------------------------------------- | --------------- |
| GET    | `/users`      | —                                      | `UserResponse[]` |
| POST   | `/users`      | `{ email, password, name? }`           | `UserResponse`   |
| GET    | `/users/:id`  | —                                      | `UserResponse`   |
| PUT    | `/users/:id`  | partial `{ email?, password?, name? }` | `UserResponse`   |
| DELETE | `/users/:id`  | —                                      | 204              |

`passwordHash` is never serialized. Email must be unique (case-insensitive).

### Auth

| Method | Path             | Body                          | Returns                         |
| ------ | ---------------- | ----------------------------- | ------------------------------- |
| POST   | `/auth/register` | `{ email, password, name? }`  | `{ user: UserResponse, token }` |
| POST   | `/auth/login`    | `{ email, password }`         | `{ user: UserResponse, token }` |
| POST   | `/auth/logout`   | —                             | 204                             |
| GET    | `/auth/me`       | —                             | `UserResponse`                  |

`POST /auth/logout` and `GET /auth/me` require `Authorization: Bearer <token>`. Sessions are in-memory and have no expiry. Invalid credentials on `/auth/login` return 401 with no distinction between "unknown email" and "wrong password".

### Bootstrap

| Method | Path    | Body | Returns                                      |
| ------ | ------- | ---- | -------------------------------------------- |
| POST   | `/init` | —    | `{ user: UserResponse, password, token }` \| 409 |

Generates a random first admin when the system has zero users. The password is returned in the response **once** — there is no way to recover it afterward. Subsequent calls return 409.

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
