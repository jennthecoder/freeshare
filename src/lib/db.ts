import initSqlJs, { Database } from 'sql.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, '../../data/freeshare.db');
const DATA_DIR = join(__dirname, '../../data');

let db: Database | null = null;
let SQL: any = null;

export async function initDb(): Promise<Database> {
  if (db) return db;

  SQL = await initSqlJs();

  // On Vercel, use in-memory DB (non-persistent)
  if (process.env.VERCEL) {
    db = new SQL.Database();
    setupSchema(db!);
    console.log('⚠️ Running in Vercel mode: Database is in-memory and will reset on deploy.');
    return db!;
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
    setupSchema(db!);
    saveDb();
  }

  return db!;
}

export function getDb(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return db;
}

export function saveDb(): void {
  // Don't save to FS on Vercel
  if (!db || process.env.VERCEL) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

export function closeDb(): void {
  if (db) {
    saveDb();
    db.close();
    db = null;
  }
}

export function generateId(): string {
  return crypto.randomUUID();
}

// Helper to run queries
export function run(sql: string, params: any[] = []): void {
  getDb().run(sql, params);
  saveDb();
}

export function get<T = any>(sql: string, params: any[] = []): T | undefined {
  const stmt = getDb().prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row as T;
  }
  stmt.free();
  return undefined;
}

export function all<T = any>(sql: string, params: any[] = []): T[] {
  const results: T[] = [];
  const stmt = getDb().prepare(sql);
  stmt.bind(params);
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

function setupSchema(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      avatar TEXT,
      bio TEXT,
      location_lat REAL,
      location_lng REAL,
      city TEXT,
      zip TEXT,
      auth_provider TEXT NOT NULL,
      auth_provider_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_active TEXT NOT NULL,
      UNIQUE(auth_provider, auth_provider_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      images TEXT NOT NULL DEFAULT '[]',
      category TEXT NOT NULL,
      condition TEXT NOT NULL,
      location_lat REAL NOT NULL,
      location_lng REAL NOT NULL,
      city TEXT NOT NULL,
      zip TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'available',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      participant_ids TEXT NOT NULL,
      last_message_content TEXT,
      last_message_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      content TEXT NOT NULL,
      read_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS saved_items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(user_id, item_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  console.log('✅ Database schema created successfully');
}
