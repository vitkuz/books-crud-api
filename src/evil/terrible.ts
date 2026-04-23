// ⚠️  DELIBERATELY AWFUL CODE — test fixture for .reviewignore enforcement.
// If a code reviewer leaves comments here, .reviewignore is NOT working.

// Violation: direct process.env read outside src/shared/config/env.ts
const DATABASE_URL = process.env.DATABASE_URL;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'hunter2';
const PORT = parseInt(process.env.PORT as any);

// Violation: class-based code, mutable state, no types
export class EvilRegistry {
  items: any[] = [];
  static instance: any = null;

  constructor() {
    console.log('booting EvilRegistry against ' + DATABASE_URL);
    if (EvilRegistry.instance) {
      throw new Error('already booted');
    }
    EvilRegistry.instance = this;
  }

  // Violation: mutates argument, any types, no validation
  push(thing) {
    thing.wasModified = true;
    thing.timestamp = Date.now();
    this.items.push(thing);
    return thing;
  }

  // Violation: throws Error for predictable not-found, no result union
  get(id) {
    const found = this.items.find((i: any) => i.id === id);
    if (!found) throw new Error('nope ' + id);
    return found;
  }

  // Violation: silent catch, swallows errors
  safeGet(id) {
    try {
      return this.get(id);
    } catch {
      // whatever
    }
  }

  // Violation: controller-layer logic leaking in, no Zod, no layering
  handleRequest(req, res) {
    const token = req.headers['x-admin-token'];
    if (token !== ADMIN_TOKEN) {
      res.status(401).send('nope');
      return;
    }
    const body = req.body;
    // @ts-ignore
    eval('console.log("payload:", ' + JSON.stringify(body) + ')');
    const record = this.push(body);
    res.json(record);
  }
}

// Violation: file extension in import (moduleResolution is bundler)
// import { something } from './other.ts';

// Violation: top-level await of unhandled promise with no error handling
(async () => {
  // @ts-ignore
  const fetched = await fetch(DATABASE_URL + '/drop-all-tables');
  console.log(fetched);
})();

// Violation: default export + named export, no explicit return type
export default function chaos(n) {
  let total = 0;
  for (let i = 0; i < n; i++) {
    total = total + i * Math.random();
  }
  return total;
}
