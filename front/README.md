# Books — frontend

Static React SPA for managing books, authors, and categories. Built with
Vite + TypeScript + TanStack Query + React Router. Talks to the deployed
Lambda + DynamoDB backend.

## Run

```bash
cd front
npm install
cp .env.example .env   # adjust VITE_API_BASE_URL if needed
npm run dev
```

App boots at <http://localhost:5173>.

## Stack

- **Vite + React 18 + TypeScript**
- **TanStack Query** (server state, caching, invalidation)
- **React Router v6** (browser router, deep-linkable URLs)
- **react-hook-form + zod** (typed form validation)
- **sonner** (toasts)
- Native React Context for auth + modal state (no Redux, no global store)

## Architecture

```
src/
├── app/
│   ├── config/         # env (zod-validated), queryClient
│   ├── providers/      # AppProviders, AuthProvider, ModalProvider
│   ├── routes/         # router definition + ShellLayout
│   └── modals/         # registry, store, ModalRoot, URL-sync hook
├── features/
│   ├── auth/           # login/register pages + AuthContext consumer
│   ├── books/          # api / queries / mutations / forms / modals / pages
│   ├── authors/        # same shape
│   └── categories/     # same shape
├── shared/
│   ├── lib/
│   │   ├── http/       # fetchJson + Authed wrapper, errors, toastErrors, tokenStore
│   │   └── query/      # query key factory
│   ├── ui/             # Button, Input, Card, Modal, PageShell
│   └── types/          # Mirror of backend API types
└── styles/             # tokens.css (design system) + globals.css + auth.css
```

## Auth

Bearer token persisted in `localStorage` under `books-api/token`. The
`AuthProvider` keeps an in-memory `tokenStore` singleton in sync; the
module-level `fetchJsonAuthed` reads from there to avoid pulling React
context into HTTP utilities.

On mount, if a token exists, the provider hits `/auth/me` to rehydrate the
user. On 401, the token is cleared and the user becomes a guest.

## Modals

Two patterns, both deep-linkable via `?modal=…`:

| Modal name | Usage |
|---|---|
| `?modal=books.form` | Create a new book |
| `?modal=books.form&id=<uuid>` | Edit an existing book |
| `?modal=books.delete&id=<uuid>` | Delete confirmation |

Same pattern for `authors.*` and `categories.*`. The `useModalUrlSync` hook
reads the query string and opens the right modal; closing the modal strips
`?modal` and `?id` so back/forward works naturally.

To open a modal in code:

```tsx
const open = useOpenModalLink();
// ...
open('books.form', { id: book.id });
```

## Brand

Design tokens live in `src/styles/tokens.css`. **No hex literals should
appear outside that file** — components reference `var(--color-…)` etc.

Library Modern palette:
- Background: parchment (`--color-bg`)
- Accent: deep oxblood (`--color-accent`)
- Headings: Crimson Pro (serif)
- Body / UI: Inter (sans)
- IDs / timestamps: JetBrains Mono

## Build

```bash
npm run build       # → front/dist/
npm run preview     # serve the build locally
```

## Deploy (later)

Skill doc covers the S3 + CloudFront recipe with SPA-friendly 404→`/index.html`
mapping. Not done in this PR.
