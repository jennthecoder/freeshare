import { createClient, Client } from '@libsql/client';
import dotenv from 'dotenv';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const url = process.env.TURSO_DATABASE_URL || 'file:local.db';
const authToken = process.env.TURSO_AUTH_TOKEN;

let db: Client | null = null;

export async function initDb(): Promise<Client> {
  if (db) return db;

  console.log(`🔌 Connecting to database at ${url}...`);
  db = createClient({
    url,
    authToken,
  });

  // We no longer auto-run setupSchema here because in prod (Turso) 
  // we assume schema is migrated via scripts/migrate.ts
  // For local dev with file:local.db, you must also run the migration script once.

  return db;
}

export function getDb(): Client {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export function generateId(): string {
  return crypto.randomUUID();
}

// Helper to run queries
export async function run(sql: string, params: any[] = []): Promise<void> {
  await getDb().execute({ sql, args: params });
}

export async function get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
  const rs = await getDb().execute({ sql, args: params });
  if (rs.rows.length === 0) return undefined;
  return rs.rows[0] as unknown as T;
}

export async function all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const rs = await getDb().execute({ sql, args: params });
  return rs.rows as unknown as T[];
}
