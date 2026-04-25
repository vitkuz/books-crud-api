import { AxiosResponse } from 'axios';
import { HttpAdapter } from './http.adapter';

type State = {
  adminToken: string | undefined;
  userToken: string | undefined;
  userId: string | undefined;
  authorId: string | undefined;
  bookId: string | undefined;
};

type Context = {
  http: HttpAdapter;
  state: State;
};

type Step = {
  name: string;
  run: (ctx: Context) => Promise<void>;
};

const expectStatus = (res: AxiosResponse, expected: number, label: string): void => {
  if (res.status !== expected) {
    throw new Error(`${label}: expected status ${expected}, got ${res.status}`);
  }
};

const expectKey = (obj: unknown, key: string, label: string): void => {
  if (typeof obj !== 'object' || obj === null || !(key in obj)) {
    throw new Error(`${label}: response body missing key "${key}"`);
  }
};

const authHeader = (token: string | undefined): { authorization: string } => {
  if (!token) throw new Error('no token in state');
  return { authorization: `Bearer ${token}` };
};

const testHealth = async (ctx: Context): Promise<void> => {
  const res: AxiosResponse = await ctx.http.client.get('/health');
  expectStatus(res, 200, 'GET /health');
  expectKey(res.data, 'ok', 'GET /health');
};

const testInit = async (ctx: Context): Promise<void> => {
  const res: AxiosResponse = await ctx.http.client.post('/init');
  // 201 on first run; 409 if a previous test run left state in a warm container.
  if (res.status === 409) {
    console.log('   (skipping init: a prior bootstrap is still warm in the Lambda)');
    return;
  }
  expectStatus(res, 201, 'POST /init');
  expectKey(res.data, 'token', 'POST /init');
  expectKey(res.data, 'user', 'POST /init');
  ctx.state.adminToken = res.data.token;
};

const testRegister = async (ctx: Context): Promise<void> => {
  const email = `test-${Date.now()}@example.com`;
  const res: AxiosResponse = await ctx.http.client.post('/auth/register', {
    email,
    password: 'correct-horse-battery-staple',
    name: 'Integration Test User',
  });
  expectStatus(res, 201, 'POST /auth/register');
  expectKey(res.data, 'token', 'POST /auth/register');
  ctx.state.userToken = res.data.token;
  ctx.state.userId = res.data.user.id;
};

const testLoginAndMe = async (ctx: Context): Promise<void> => {
  const meRes: AxiosResponse = await ctx.http.client.get('/auth/me', {
    headers: authHeader(ctx.state.userToken),
  });
  expectStatus(meRes, 200, 'GET /auth/me');
  expectKey(meRes.data, 'id', 'GET /auth/me');
  if (meRes.data.id !== ctx.state.userId) {
    throw new Error(`GET /auth/me: returned id mismatched the registered user`);
  }
  if ('passwordHash' in meRes.data) {
    throw new Error(`GET /auth/me: response leaked passwordHash`);
  }

  const noTokenRes: AxiosResponse = await ctx.http.client.get('/auth/me');
  expectStatus(noTokenRes, 401, 'GET /auth/me without token');
};

const testAuthorsCrud = async (ctx: Context): Promise<void> => {
  const auth = { headers: authHeader(ctx.state.userToken) };

  const list1: AxiosResponse = await ctx.http.client.get('/authors');
  expectStatus(list1, 200, 'GET /authors');
  if (!Array.isArray(list1.data)) throw new Error('GET /authors: body is not an array');

  const create: AxiosResponse = await ctx.http.client.post(
    '/authors',
    { name: 'Test Author' },
    auth,
  );
  expectStatus(create, 201, 'POST /authors');
  expectKey(create.data, 'id', 'POST /authors');
  ctx.state.authorId = create.data.id;

  const get: AxiosResponse = await ctx.http.client.get(`/authors/${ctx.state.authorId}`);
  expectStatus(get, 200, 'GET /authors/:id');

  const update: AxiosResponse = await ctx.http.client.put(
    `/authors/${ctx.state.authorId}`,
    { name: 'Test Author (renamed)' },
    auth,
  );
  expectStatus(update, 200, 'PUT /authors/:id');

  const missing: AxiosResponse = await ctx.http.client.get(
    '/authors/00000000-0000-0000-0000-000000000000',
  );
  expectStatus(missing, 404, 'GET /authors/<missing>');
};

const testBooksCrud = async (ctx: Context): Promise<void> => {
  if (!ctx.state.authorId) throw new Error('no author in state — run authors first');
  const auth = { headers: authHeader(ctx.state.userToken) };

  const create: AxiosResponse = await ctx.http.client.post(
    '/books',
    { title: 'The Test Manuscript', authorId: ctx.state.authorId, year: 2026 },
    auth,
  );
  expectStatus(create, 201, 'POST /books');
  expectKey(create.data, 'id', 'POST /books');
  ctx.state.bookId = create.data.id;

  const list: AxiosResponse = await ctx.http.client.get('/books');
  expectStatus(list, 200, 'GET /books');

  const count: AxiosResponse = await ctx.http.client.get('/books/count');
  expectStatus(count, 200, 'GET /books/count');

  const update: AxiosResponse = await ctx.http.client.put(
    `/books/${ctx.state.bookId}`,
    { title: 'The Test Manuscript (revised)' },
    auth,
  );
  expectStatus(update, 200, 'PUT /books/:id');

  const del: AxiosResponse = await ctx.http.client.delete(`/books/${ctx.state.bookId}`, auth);
  expectStatus(del, 204, 'DELETE /books/:id');

  const after: AxiosResponse = await ctx.http.client.get(`/books/${ctx.state.bookId}`);
  expectStatus(after, 404, 'GET /books/:id (after delete)');
};

const testUsersCrud = async (ctx: Context): Promise<void> => {
  if (!ctx.state.userId) throw new Error('no user in state — run register first');
  const auth = { headers: authHeader(ctx.state.userToken) };

  const get: AxiosResponse = await ctx.http.client.get(`/users/${ctx.state.userId}`);
  expectStatus(get, 200, 'GET /users/:id');
  if ('passwordHash' in get.data) {
    throw new Error('GET /users/:id leaked passwordHash');
  }

  const list: AxiosResponse = await ctx.http.client.get('/users');
  expectStatus(list, 200, 'GET /users');
  if (!Array.isArray(list.data)) throw new Error('GET /users: body is not an array');

  const update: AxiosResponse = await ctx.http.client.put(
    `/users/${ctx.state.userId}`,
    { name: 'Renamed Integration User' },
    auth,
  );
  expectStatus(update, 200, 'PUT /users/:id');

  const empty: AxiosResponse = await ctx.http.client.put(
    `/users/${ctx.state.userId}`,
    {},
    auth,
  );
  expectStatus(empty, 400, 'PUT /users/:id (empty body)');
};

const testLogout = async (ctx: Context): Promise<void> => {
  const out: AxiosResponse = await ctx.http.client.post('/auth/logout', undefined, {
    headers: authHeader(ctx.state.userToken),
  });
  expectStatus(out, 204, 'POST /auth/logout');

  const me: AxiosResponse = await ctx.http.client.get('/auth/me', {
    headers: authHeader(ctx.state.userToken),
  });
  expectStatus(me, 401, 'GET /auth/me after logout');
};

const testNotFound = async (ctx: Context): Promise<void> => {
  const res: AxiosResponse = await ctx.http.client.get('/this-route-does-not-exist');
  expectStatus(res, 404, 'GET /this-route-does-not-exist');
};

const steps: Step[] = [
  { name: 'health', run: testHealth },
  { name: 'init (bootstrap admin)', run: testInit },
  { name: 'auth: register', run: testRegister },
  { name: 'auth: me + unauthorized', run: testLoginAndMe },
  { name: 'authors: crud', run: testAuthorsCrud },
  { name: 'books: crud', run: testBooksCrud },
  { name: 'users: crud + empty patch', run: testUsersCrud },
  { name: 'auth: logout invalidates token', run: testLogout },
  { name: '404 for unknown route', run: testNotFound },
];

export const runScenarios = async (http: HttpAdapter): Promise<void> => {
  console.log(`Running integration scenarios against ${http.baseUrl}\n`);
  const ctx: Context = {
    http,
    state: {
      adminToken: undefined,
      userToken: undefined,
      userId: undefined,
      authorId: undefined,
      bookId: undefined,
    },
  };

  let passed = 0;
  let failed = 0;
  for (const step of steps) {
    console.log(`\n=== ${step.name} ===`);
    try {
      await step.run(ctx);
      console.log(`[PASS] ${step.name}`);
      passed += 1;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[FAIL] ${step.name}: ${msg}`);
      failed += 1;
    }
  }

  console.log(`\n--- summary ---\n${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
};
