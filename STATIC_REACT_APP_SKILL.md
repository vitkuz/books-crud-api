# Static React App Starter (Vite + TanStack Query + Forms + Cognito) — with Deep‑Linked Modals, Toasts, and S3+CloudFront

This doc is a “skill document” / starter blueprint for a **static** React app (build → `dist/`), using:

- **Vite + React + TypeScript**
- **React Router v6**
- **TanStack Query** (`@tanstack/react-query`) for server state
- **react-hook-form + zod** for forms
- **AWS Cognito Hosted UI (OAuth2 code + PKCE)** for login in a static SPA
- **Global modal manager**, including **deep-linked modals** like `?modal=users.edit&id=123`
- **Toasts** for failing requests / mutation errors
- **Deploy to S3 + CloudFront**, with SPA routing support

---

## 0) Create project (CLI)

```bash
npm create vite@latest my-static-react-app -- --template react-ts
cd my-static-react-app
npm install
npm run dev
```

---

## 1) Install packages

```bash
npm i @tanstack/react-query @tanstack/react-query-devtools
npm i react-router-dom
npm i react-hook-form zod @hookform/resolvers
npm i aws-amplify
npm i sonner
```

---

## 2) Suggested folder structure (minimum but scalable)

```
src/
  app/
    config/
      env.ts
      amplify.ts
      queryClient.ts
    providers/
      AppProviders.tsx
      ModalProvider.tsx
    routes/
      routes.tsx
    modals/
      ModalRoot.tsx
      registry.ts
      modalStore.ts
      modalUrlSync.ts

  features/
    auth/
      actions.ts
      RequireAuth.tsx
      pages/
        AuthCallbackPage.tsx
        LoginPage.tsx

    users/
      api/
        users.api.ts
      queries/
        users.queries.ts
      mutations/
        users.mutations.ts
      forms/
        user.schema.ts
        user.mappers.ts
      modals/
        EditUserModal.tsx
      pages/
        UsersListPage.tsx

  shared/
    lib/
      http/
        errors.ts
        fetchJson.ts
        fetchJsonAuthed.ts
      query/
        keys.ts
    ui/
      Button.tsx
      Input.tsx
      Modal.tsx

  main.tsx
  App.tsx
```

---

## 3) App wiring (Query + Router + Modals + Toasts + Cognito config)

### 3.1 `src/main.tsx`

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AppProviders } from "@/app/providers/AppProviders";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </React.StrictMode>
);
```

### 3.2 `src/app/providers/AppProviders.tsx`

Single place to wire all global providers.

```tsx
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "sonner";

import { queryClient } from "@/app/config/queryClient";
import { router } from "@/app/routes/routes";
import { ModalProvider } from "@/app/providers/ModalProvider";
import { ModalRoot } from "@/app/modals/ModalRoot";
import { configureAmplify } from "@/app/config/amplify";

configureAmplify();

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ModalProvider>
        <RouterProvider router={router} />
        <ModalRoot />
        <Toaster richColors />
        <ReactQueryDevtools initialIsOpen={false} />
        {children}
      </ModalProvider>
    </QueryClientProvider>
  );
}
```

> `Toaster` enables toast notifications anywhere.

---

## 4) TanStack Query base

### 4.1 `src/app/config/queryClient.ts`

```ts
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});
```

### 4.2 Query key factory: `src/shared/lib/query/keys.ts`

```ts
export const qk = {
  users: {
    all: ["users"] as const,
    list: (params: { q?: string; page?: number } = {}) =>
      ["users", "list", params] as const,
    detail: (id: string) => ["users", "detail", id] as const,
  },
};
```

Rule: **queryKey = request identity**.

---

## 5) HTTP layer + toast on request failure

### 5.1 Error type: `src/shared/lib/http/errors.ts`

```ts
export class HttpError extends Error {
  constructor(
    public status: number,
    public bodyText: string,
    message = `HTTP ${status}`
  ) {
    super(message);
  }
}
```

### 5.2 Fetch wrapper: `src/shared/lib/http/fetchJson.ts`

```ts
import { HttpError } from "./errors";

export async function fetchJson<T>(
  url: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    throw new HttpError(res.status, bodyText, `HTTP ${res.status}`);
  }

  // if 204 No Content, you can return null or {} if you want.
  return res.json() as Promise<T>;
}
```

### 5.3 Toast helper (for consistent user messages)

`src/shared/lib/http/toastErrors.ts`

```ts
import { toast } from "sonner";
import { HttpError } from "./errors";

export function toastRequestError(err: unknown, fallback = "Request failed") {
  if (err instanceof HttpError) {
    if (err.status === 401) return toast.error("Please sign in again.");
    if (err.status === 403) return toast.error("You don’t have access.");
    if (err.status >= 500) return toast.error("Server error. Try again.");
    return toast.error(fallback);
  }
  if (err instanceof Error) return toast.error(err.message || fallback);
  return toast.error(fallback);
}
```

### 5.4 Show toast automatically from mutations
Inside your mutation hook, call the toast helper in `onError`.

Example:

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toastRequestError } from "@/shared/lib/http/toastErrors";
import { qk } from "@/shared/lib/query/keys";
import { usersApi } from "../api/users.api";

export function useUpdateUser() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (args: { id: string; patch: { name?: string; email?: string } }) =>
      usersApi.update(args.id, args.patch),

    onSuccess: (updated) => {
      qc.setQueryData(qk.users.detail(updated.id), updated);
      qc.invalidateQueries({ queryKey: qk.users.all });
    },

    onError: (err) => toastRequestError(err, "Failed to save user"),
  });
}
```

> For **queries**, you usually show an inline error state in the page (and optionally toast on “background refetch” errors if you want).

---

## 6) Forms (react-hook-form + zod) and “Edit” modal pattern

### 6.1 Schema: `src/features/users/forms/user.schema.ts`

```ts
import { z } from "zod";

export const userSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
});

export type UserFormValues = z.infer<typeof userSchema>;
```

### 6.2 Mapper: `src/features/users/forms/user.mappers.ts`
Keep mapping logic out of UI.

```ts
import type { UserFormValues } from "./user.schema";

export function toUserFormValues(user: { name?: string; email?: string }): UserFormValues {
  return { name: user.name ?? "", email: user.email ?? "" };
}
```

### 6.3 Modal component: `src/features/users/modals/EditUserModal.tsx`

```tsx
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { userSchema, type UserFormValues } from "../forms/user.schema";
import { toUserFormValues } from "../forms/user.mappers";
import { useUserDetail } from "../queries/users.queries";
import { useUpdateUser } from "../mutations/users.mutations";

export function EditUserModal({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const userQuery = useUserDetail(id);
  const updateUser = useUpdateUser();

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: { name: "", email: "" },
    mode: "onChange",
  });

  useEffect(() => {
    if (userQuery.data) form.reset(toUserFormValues(userQuery.data));
  }, [userQuery.data, form]);

  const onSubmit = form.handleSubmit((values) => {
    updateUser.mutate(
      { id, patch: values },
      { onSuccess: () => onClose() }
    );
  });

  if (userQuery.isLoading) return <div>Loading…</div>;
  if (userQuery.isError) return <div>Failed to load user</div>;

  return (
    <div>
      <h2>Edit user</h2>

      <form onSubmit={onSubmit}>
        <label>
          Name
          <input {...form.register("name")} />
        </label>
        {form.formState.errors.name && <div>{form.formState.errors.name.message}</div>}

        <label>
          Email
          <input {...form.register("email")} />
        </label>
        {form.formState.errors.email && <div>{form.formState.errors.email.message}</div>}

        <button type="button" onClick={onClose} disabled={updateUser.isPending}>
          Cancel
        </button>

        <button type="submit" disabled={!form.formState.isValid || updateUser.isPending}>
          {updateUser.isPending ? "Saving…" : "Save"}
        </button>
      </form>
    </div>
  );
}
```

---

## 7) Global Modals + Deep‑Linked Modals (`?modal=...`)

Goal: allow links like:
- `/users?modal=users.edit&id=123`
- or from anywhere you can open modals that **also update the URL** so back/forward works.

### 7.1 Modal registry: `src/app/modals/registry.ts`

```ts
import { EditUserModal } from "@/features/users/modals/EditUserModal";

export const modalRegistry = {
  "users.edit": EditUserModal,
} as const;

export type ModalName = keyof typeof modalRegistry;
```

### 7.2 Modal store: `src/app/modals/modalStore.ts`

```ts
import { createContext, useContext, useState } from "react";
import type { ModalName } from "./registry";

export type ModalState =
  | { isOpen: false }
  | { isOpen: true; name: ModalName; props?: Record<string, unknown> };

const ModalContext = createContext<{
  state: ModalState;
  open: (name: ModalName, props?: Record<string, unknown>) => void;
  close: () => void;
} | null>(null);

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ModalState>({ isOpen: false });

  const open = (name: ModalName, props?: Record<string, unknown>) =>
    setState({ isOpen: true, name, props });

  const close = () => setState({ isOpen: false });

  return (
    <ModalContext.Provider value={{ state, open, close }}>
      {children}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error("useModal must be used inside ModalProvider");
  return ctx;
}
```

### 7.3 Modal root: `src/app/modals/ModalRoot.tsx`

```tsx
import { modalRegistry } from "./registry";
import { useModal } from "./modalStore";

export function ModalRoot() {
  const { state, close } = useModal();

  if (!state.isOpen) return null;

  const Component = modalRegistry[state.name];
  return <Component {...(state.props as any)} onClose={close} />;
}
```

### 7.4 URL sync hook: `src/app/modals/modalUrlSync.ts`
This connects modal state ↔ querystring.

```ts
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useModal } from "./modalStore";
import { modalRegistry, type ModalName } from "./registry";

function isModalName(x: string): x is ModalName {
  return x in modalRegistry;
}

/**
 * Sync rules:
 * - If URL has ?modal=users.edit -> open it (with extra params like id)
 * - If modal is opened in UI -> write to URL (optional helper shown below)
 * - If modal closes -> remove ?modal=...
 */
export function useModalUrlSync() {
  const { state, open, close } = useModal();
  const location = useLocation();
  const navigate = useNavigate();

  // 1) URL -> modal
  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const modal = sp.get("modal");
    if (!modal) {
      if (state.isOpen) close();
      return;
    }

    if (!isModalName(modal)) return;

    // Collect props from URL params (example: id=123)
    const id = sp.get("id") ?? undefined;
    const props: Record<string, unknown> = {};
    if (id) props.id = id;

    if (!state.isOpen || state.name !== modal) {
      open(modal, props);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  // 2) modal -> URL (when user closes modal using UI)
  useEffect(() => {
    if (!state.isOpen) {
      const sp = new URLSearchParams(location.search);
      if (sp.has("modal")) {
        sp.delete("modal");
        sp.delete("id");
        navigate({ pathname: location.pathname, search: sp.toString() }, { replace: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isOpen]);
}
```

### 7.5 Use URL sync in a “route shell”
Create a small component that runs the sync hook.

`src/App.tsx`:

```tsx
import { useModalUrlSync } from "@/app/modals/modalUrlSync";

export default function App() {
  useModalUrlSync();
  return null; // RouterProvider renders routes; this component just wires side effects.
}
```

### 7.6 Convenience helper: open modal *and* update URL
In any page:

```tsx
import { useLocation, useNavigate } from "react-router-dom";

function useOpenModalLink() {
  const navigate = useNavigate();
  const location = useLocation();

  return (name: string, params: Record<string, string>) => {
    const sp = new URLSearchParams(location.search);
    sp.set("modal", name);
    Object.entries(params).forEach(([k, v]) => sp.set(k, v));
    navigate({ pathname: location.pathname, search: sp.toString() });
  };
}

// usage:
// openModalLink("users.edit", { id: user.id });
```

Now your modal is deep-linkable and browser back closes it naturally.

---

## 8) Cognito login for static app (Hosted UI)

### 8.1 Environment vars (Vite)
Create `.env`:

```
VITE_COGNITO_USER_POOL_ID=...
VITE_COGNITO_APP_CLIENT_ID=...
VITE_COGNITO_DOMAIN=your-domain.auth.region.amazoncognito.com
VITE_COGNITO_REDIRECT_SIGNIN=http://localhost:5173/auth/callback
VITE_COGNITO_REDIRECT_SIGNOUT=http://localhost:5173/
```

In production, set redirect URLs to your real domain callback.

### 8.2 Configure Amplify: `src/app/config/amplify.ts`

```ts
import { Amplify } from "aws-amplify";

export function configureAmplify() {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
        userPoolClientId: import.meta.env.VITE_COGNITO_APP_CLIENT_ID,
        loginWith: {
          oauth: {
            domain: import.meta.env.VITE_COGNITO_DOMAIN,
            scopes: ["openid", "email", "profile"],
            redirectSignIn: [import.meta.env.VITE_COGNITO_REDIRECT_SIGNIN],
            redirectSignOut: [import.meta.env.VITE_COGNITO_REDIRECT_SIGNOUT],
            responseType: "code",
          },
        },
      },
    },
  });
}
```

### 8.3 Auth actions: `src/features/auth/actions.ts`

```ts
import { signInWithRedirect, signOut } from "aws-amplify/auth";

export const authActions = {
  login: () => signInWithRedirect(),
  logout: () => signOut({ global: true }),
};
```

### 8.4 Callback page: `src/features/auth/pages/AuthCallbackPage.tsx`

```tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "aws-amplify/auth";

export function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      await getCurrentUser();
      navigate("/", { replace: true });
    })().catch(() => navigate("/login", { replace: true }));
  }, [navigate]);

  return <div>Signing you in…</div>;
}
```

### 8.5 Protect routes: `src/features/auth/RequireAuth.tsx`

```tsx
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getCurrentUser } from "aws-amplify/auth";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<"loading" | "authed" | "nope">("loading");

  useEffect(() => {
    getCurrentUser()
      .then(() => setState("authed"))
      .catch(() => setState("nope"));
  }, []);

  if (state === "loading") return <div>Checking session…</div>;
  if (state === "nope") return <Navigate to="/login" replace />;
  return <>{children}</>;
}
```

### 8.6 Attach token to requests: `src/shared/lib/http/fetchJsonAuthed.ts`

```ts
import { fetchAuthSession } from "aws-amplify/auth";
import { fetchJson } from "./fetchJson";

export async function fetchJsonAuthed<T>(url: string, init?: RequestInit) {
  const session = await fetchAuthSession();
  const token = session.tokens?.accessToken?.toString();

  return fetchJson<T>(url, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}
```

---

## 9) Routing (React Router) + SPA hosting note

You need hosting to redirect unknown paths to `index.html` so refresh works on `/users`, `/auth/callback`, etc.

### Example router: `src/app/routes/routes.tsx`

```tsx
import { createBrowserRouter } from "react-router-dom";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { AuthCallbackPage } from "@/features/auth/pages/AuthCallbackPage";
import { UsersListPage } from "@/features/users/pages/UsersListPage";
import { RequireAuth } from "@/features/auth/RequireAuth";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/auth/callback", element: <AuthCallbackPage /> },

  {
    path: "/users",
    element: (
      <RequireAuth>
        <UsersListPage />
      </RequireAuth>
    ),
  },
]);
```

---

## 10) Deploy to S3 + CloudFront (SPA-friendly)

### 10.1 Build
```bash
npm run build
```
Vite outputs `dist/`.

### 10.2 S3 bucket (static hosting)
- Create an S3 bucket, e.g. `myapp.example.com` (or any name).
- **Block public access** (recommended) if you serve via CloudFront with OAC.
- Upload your `dist/` contents.

### 10.3 CloudFront distribution
- Origin: the S3 bucket
- Use **OAC (Origin Access Control)** so bucket remains private.
- Viewer protocol policy: Redirect HTTP → HTTPS
- Default root object: `index.html`

### 10.4 SPA routing (very important)
Because this is a single-page app, CloudFront must serve `index.html` for unknown routes.

**CloudFront Custom Error Responses:**
- Error code: **403** → Response page path: `/index.html` → HTTP response code: **200**
- Error code: **404** → Response page path: `/index.html` → HTTP response code: **200**

This makes `/users` and `/auth/callback` work on refresh.

### 10.5 Cache invalidation
After deploying new build:
- Invalidate CloudFront paths: `/*` (simple approach for small apps)

### 10.6 CORS (if you call APIs)
- If API is different domain, configure CORS on the API side:
  - Allow Origin: your CloudFront domain (or your custom domain)
  - Allow methods you need (GET/POST/PATCH/DELETE)
  - Allow headers: `Authorization`, `Content-Type`

### 10.7 Custom domain (optional)
- Route 53: create A/AAAA record pointing to CloudFront
- ACM certificate in **us-east-1** for CloudFront
- Add alternate domain name (CNAME) to distribution

---

## 11) Practical rules to keep the project sane

1. **No `fetch()` in components** — only in `features/*/api/`
2. **Queries read, mutations write**
3. **Forms use react-hook-form**, server state uses TanStack Query
4. **Query keys come only from one factory (`qk`)**
5. **Modals are global**, and can be deep-linked via `?modal=...`
6. **Toasts for mutation failures** (and optionally for auth failures)

---

## 12) Quick checklist

- [ ] Vite app runs and builds
- [ ] QueryClientProvider + router + toasts wired
- [ ] `fetchJson` and `HttpError` created
- [ ] Mutations show toast on error
- [ ] Modal registry + ModalRoot works
- [ ] `useModalUrlSync()` enables deep-linked modals
- [ ] Cognito Hosted UI set with callback URLs
- [ ] `AuthCallbackPage` route exists
- [ ] CloudFront 403/404 → `/index.html` mapping set

---

## 13) Minimal “hello” page idea (UsersListPage)
Example usage: open edit modal via deep link.

```tsx
import { useLocation, useNavigate } from "react-router-dom";

export function UsersListPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const openEdit = (id: string) => {
    const sp = new URLSearchParams(location.search);
    sp.set("modal", "users.edit");
    sp.set("id", id);
    navigate({ pathname: location.pathname, search: sp.toString() });
  };

  return (
    <div style={{ padding: 16 }}>
      <h1>Users</h1>
      <button onClick={() => openEdit("123")}>Edit user 123</button>
    </div>
  );
}
```

---
