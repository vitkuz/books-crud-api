import { AxiosResponse } from 'axios';
import { HttpAdapter } from '../http.adapter';
import { SeedBook, seedAuthors, seedBooks, seedCategories } from './data';

const SEEDER_EMAIL = 'seeder@books.local';
const SEEDER_PASSWORD = 'seed-password-1';

type AuthHeaders = { authorization: string };

type ExistingAuthor = { id: string; name: string };
type ExistingCategory = { id: string; name: string };
type ExistingBookResponse = {
  id: string;
  title: string;
  author: { id: string };
};

const ensureSeederToken = async (http: HttpAdapter): Promise<string> => {
  console.log(`\n[seed] ensuring seeder identity ${SEEDER_EMAIL}`);
  const loginRes: AxiosResponse = await http.client.post('/auth/login', {
    email: SEEDER_EMAIL,
    password: SEEDER_PASSWORD,
  });
  if (loginRes.status === 200 && typeof loginRes.data?.token === 'string') {
    console.log('[seed] login succeeded — reusing existing seeder');
    return loginRes.data.token;
  }
  console.log('[seed] login failed; registering seeder');
  const registerRes: AxiosResponse = await http.client.post('/auth/register', {
    email: SEEDER_EMAIL,
    password: SEEDER_PASSWORD,
    name: 'Seeder',
  });
  if (registerRes.status !== 201 || typeof registerRes.data?.token !== 'string') {
    throw new Error(
      `failed to register seeder: ${registerRes.status} ${JSON.stringify(registerRes.data)}`,
    );
  }
  console.log('[seed] registered new seeder');
  return registerRes.data.token;
};

const seedCategoriesStep = async (
  http: HttpAdapter,
  auth: AuthHeaders,
): Promise<Map<string, string>> => {
  console.log('\n[seed] categories');
  const listRes: AxiosResponse = await http.client.get('/categories');
  const existing: ExistingCategory[] = (listRes.data ?? []) as ExistingCategory[];
  const byName: Map<string, string> = new Map(
    existing.map((c: ExistingCategory): [string, string] => [c.name, c.id]),
  );

  let created = 0;
  let skipped = 0;
  for (const name of seedCategories) {
    const cached: string | undefined = byName.get(name);
    if (cached !== undefined) {
      skipped += 1;
      continue;
    }
    const res: AxiosResponse = await http.client.post('/categories', { name }, { headers: auth });
    if (res.status !== 201) {
      throw new Error(`POST /categories ${name} → ${res.status} ${JSON.stringify(res.data)}`);
    }
    byName.set(name, res.data.id);
    created += 1;
  }
  console.log(`[seed] categories: ${created} created, ${skipped} already present`);
  return byName;
};

const seedAuthorsStep = async (
  http: HttpAdapter,
  auth: AuthHeaders,
): Promise<Map<string, string>> => {
  console.log('\n[seed] authors');
  const listRes: AxiosResponse = await http.client.get('/authors');
  const existing: ExistingAuthor[] = (listRes.data ?? []) as ExistingAuthor[];
  const byName: Map<string, string> = new Map(
    existing.map((a: ExistingAuthor): [string, string] => [a.name, a.id]),
  );

  let created = 0;
  let skipped = 0;
  for (const name of seedAuthors) {
    const cached: string | undefined = byName.get(name);
    if (cached !== undefined) {
      skipped += 1;
      continue;
    }
    const res: AxiosResponse = await http.client.post('/authors', { name }, { headers: auth });
    if (res.status !== 201) {
      throw new Error(`POST /authors ${name} → ${res.status} ${JSON.stringify(res.data)}`);
    }
    byName.set(name, res.data.id);
    created += 1;
  }
  console.log(`[seed] authors: ${created} created, ${skipped} already present`);
  return byName;
};

const seedBooksStep = async (
  http: HttpAdapter,
  auth: AuthHeaders,
  authorIdsByName: Map<string, string>,
  categoryIdsByName: Map<string, string>,
): Promise<void> => {
  console.log('\n[seed] books');
  const listRes: AxiosResponse = await http.client.get('/books');
  const existing: ExistingBookResponse[] = (listRes.data ?? []) as ExistingBookResponse[];
  const existingKeys: Set<string> = new Set(
    existing.map((b: ExistingBookResponse): string => `${b.title}::${b.author.id}`),
  );

  let created = 0;
  let skipped = 0;
  for (const book of seedBooks) {
    const authorId: string | undefined = authorIdsByName.get(book.author);
    if (authorId === undefined) {
      throw new Error(`author "${book.author}" missing from seedAuthors — fix data.ts`);
    }
    const key: string = `${book.title}::${authorId}`;
    if (existingKeys.has(key)) {
      skipped += 1;
      continue;
    }
    const categoryIds: string[] = book.categories.map((c: string): string => {
      const id: string | undefined = categoryIdsByName.get(c);
      if (id === undefined) {
        throw new Error(`category "${c}" missing from seedCategories — fix data.ts`);
      }
      return id;
    });
    const res: AxiosResponse = await http.client.post(
      '/books',
      {
        title: book.title,
        authorId,
        categoryIds,
        year: book.year,
      },
      { headers: auth },
    );
    if (res.status !== 201) {
      throw new Error(`POST /books "${book.title}" → ${res.status} ${JSON.stringify(res.data)}`);
    }
    created += 1;
  }
  console.log(`[seed] books: ${created} created, ${skipped} already present`);
};

const summarize = (b: SeedBook[]): string =>
  `${seedCategories.length} categories, ${seedAuthors.length} authors, ${b.length} books`;

export const runSeed = async (http: HttpAdapter): Promise<void> => {
  console.log(`Seeding ${http.baseUrl} with ${summarize(seedBooks)}`);

  const token: string = await ensureSeederToken(http);
  const auth: AuthHeaders = { authorization: `Bearer ${token}` };

  const categoryIdsByName: Map<string, string> = await seedCategoriesStep(http, auth);
  const authorIdsByName: Map<string, string> = await seedAuthorsStep(http, auth);
  await seedBooksStep(http, auth, authorIdsByName, categoryIdsByName);

  console.log('\n[seed] done');
};
