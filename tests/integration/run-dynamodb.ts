import { v4 as uuidv4 } from 'uuid';
import {
  createDynamoDbClient,
  createSdkDocClient,
  DynamoDbClient,
  DynamoItem,
  DynamoKey,
} from '../../src/shared/clients/dynamo-db';
import env from './env';

type Step = {
  name: string;
  run: () => Promise<void>;
};

const expect = (cond: boolean, msg: string): void => {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
};

const log = (msg: string, ctx?: unknown): void => {
  if (ctx === undefined) {
    console.log(msg);
    return;
  }
  console.log(msg, JSON.stringify(ctx));
};

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

const SK_VALUE = `SMOKE_${uuidv4().slice(0, 8)}`;

const main = async (): Promise<void> => {
  console.log(`Running DynamoDB smoke against ${env.DYNAMODB_TABLE_NAME} (${env.AWS_REGION})\n`);

  const docClient = createSdkDocClient({ region: env.AWS_REGION });
  const db: DynamoDbClient = createDynamoDbClient({
    tableName: env.DYNAMODB_TABLE_NAME,
    client: docClient,
    logger: log,
  });

  const key1: DynamoKey = { pk: `TEST#${uuidv4()}`, sk: SK_VALUE };
  const key2: DynamoKey = { pk: `TEST#${uuidv4()}`, sk: SK_VALUE };
  const key3: DynamoKey = { pk: `TEST#${uuidv4()}`, sk: SK_VALUE };
  const allKeys: DynamoKey[] = [key1, key2, key3];

  const steps: Step[] = [
    {
      name: 'createOne',
      run: async (): Promise<void> => {
        const created: DynamoItem = await db.createOne({
          ...key1,
          value: 'hello',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        expect(created.pk === key1.pk, 'createOne returns the item');
      },
    },
    {
      name: 'getOneById (existing)',
      run: async (): Promise<void> => {
        const found: DynamoItem | undefined = await db.getOneById(key1);
        expect(found !== undefined, 'getOneById finds the item');
        expect(found?.value === 'hello', 'getOneById returns correct value');
      },
    },
    {
      name: 'patchOneById',
      run: async (): Promise<void> => {
        await sleep(20); // ensure updatedAt advances
        const updated: DynamoItem = await db.patchOneById(key1, {
          value: 'world',
          updatedAt: new Date().toISOString(),
        });
        expect(updated.value === 'world', 'patchOneById applied new value');
      },
    },
    {
      name: 'createMany',
      run: async (): Promise<void> => {
        const now: string = new Date().toISOString();
        const items: DynamoItem[] = [
          { ...key2, value: 'two', createdAt: now, updatedAt: now },
          { ...key3, value: 'three', createdAt: now, updatedAt: now },
        ];
        const written: DynamoItem[] = await db.createMany(items);
        expect(written.length === 2, 'createMany returns 2 items');
      },
    },
    {
      name: 'getManyByIds',
      run: async (): Promise<void> => {
        const found: DynamoItem[] = await db.getManyByIds(allKeys);
        expect(found.length === 3, `getManyByIds returns 3 items, got ${found.length}`);
      },
    },
    {
      name: 'listAll (default sort by pk via GSI1)',
      run: async (): Promise<void> => {
        const items: DynamoItem[] = await db.listAll(SK_VALUE);
        expect(items.length === 3, `listAll returns 3 items, got ${items.length}`);
      },
    },
    {
      name: 'listAll sortBy=updatedAt descending via GSI2',
      run: async (): Promise<void> => {
        const items: DynamoItem[] = await db.listAll(SK_VALUE, {
          sortBy: 'updatedAt',
          descending: true,
        });
        expect(items.length === 3, 'listAll GSI2 returns 3 items');
        const updatedAts: string[] = items.map((i: DynamoItem): string => String(i.updatedAt));
        const sorted = updatedAts.every(
          (v: string, idx: number): boolean => idx === 0 || updatedAts[idx - 1] >= v,
        );
        expect(sorted, `items not in descending updatedAt order: ${updatedAts.join(', ')}`);
      },
    },
    {
      name: 'listAll sortBy=createdAt via GSI3',
      run: async (): Promise<void> => {
        const items: DynamoItem[] = await db.listAll(SK_VALUE, { sortBy: 'createdAt' });
        expect(items.length === 3, 'listAll GSI3 returns 3 items');
      },
    },
    {
      name: 'patchManyByIds',
      run: async (): Promise<void> => {
        const updated: DynamoItem[] = await db.patchManyByIds([
          { key: key2, patch: { value: 'TWO' } },
          { key: key3, patch: { value: 'THREE' } },
        ]);
        expect(updated.length === 2, 'patchManyByIds returns 2 items');
        expect(updated[0]?.value === 'TWO', 'patchManyByIds[0] applied');
        expect(updated[1]?.value === 'THREE', 'patchManyByIds[1] applied');
      },
    },
    {
      name: 'deleteManyByIds (cleanup)',
      run: async (): Promise<void> => {
        await db.deleteManyByIds(allKeys);
      },
    },
    {
      name: 'getOneById (after delete) returns undefined',
      run: async (): Promise<void> => {
        const found: DynamoItem | undefined = await db.getOneById(key1);
        expect(found === undefined, 'item is gone after delete');
      },
    },
    {
      name: 'listAll (after cleanup) returns empty',
      run: async (): Promise<void> => {
        const items: DynamoItem[] = await db.listAll(SK_VALUE);
        expect(items.length === 0, `listAll empty after cleanup, got ${items.length}`);
      },
    },
  ];

  let passed = 0;
  let failed = 0;
  for (const step of steps) {
    console.log(`\n=== ${step.name} ===`);
    try {
      await step.run();
      console.log(`[PASS] ${step.name}`);
      passed += 1;
    } catch (err) {
      const msg: string = err instanceof Error ? err.message : String(err);
      console.error(`[FAIL] ${step.name}: ${msg}`);
      failed += 1;
    }
  }

  console.log(`\n--- summary ---\n${passed} passed, ${failed} failed`);
  if (failed > 0) {
    // Best-effort cleanup so we don't leave items behind on partial failure
    try {
      await db.deleteManyByIds(allKeys);
    } catch (cleanupErr) {
      const cleanupMsg: string =
        cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr);
      console.error(`cleanup failed (original test failure preserved): ${cleanupMsg}`);
    }
    process.exit(1);
  }
};

main();
