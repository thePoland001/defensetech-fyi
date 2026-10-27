import pg from 'pg';
import { COMPANY_ROWS } from './data/companies.js';
import { ESTIMATES_VERSION, buildEstimates } from './data/estimates.js';
import { slugify } from '../shared/options.js';

// Uses Postgres when DATABASE_URL is set (Render), otherwise an embedded PGlite database
// on disk so the app runs locally with zero setup. Both speak the same SQL dialect.
let client;

export async function query(text, params = []) {
  return client.query(text, params);
}

function sslFor(url) {
  if (process.env.DATABASE_SSL === 'false') return false;
  if (process.env.DATABASE_SSL === 'true') return { rejectUnauthorized: false };
  // Render's internal hostnames have no dots (e.g. dpg-abc123-a); external ones need SSL.
  const host = new URL(url).hostname;
  return host.includes('.') && host !== 'localhost' && host !== '127.0.0.1' ? { rejectUnauthorized: false } : false;
}

export async function initDb() {
  if (process.env.DATABASE_URL) {
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: sslFor(process.env.DATABASE_URL), max: 10 });
    client = pool;
    console.log('[db] using Postgres');
  } else {
    const { PGlite } = await import('@electric-sql/pglite');
    const dir = process.env.PGLITE_DIR || './.data/pglite';
    const db = new PGlite(dir);
    await db.waitReady;
    client = db;
    console.log(`[db] using embedded PGlite at ${dir}`);
  }
  await migrate();
  await seedCompanies();
  await seedEstimates();
}

async function migrate() {
  const statements = [
    `CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS companies (
      id SERIAL PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      size TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '',
      area TEXT NOT NULL DEFAULT '',
      hq BOOLEAN NOT NULL DEFAULT FALSE,
      description TEXT NOT NULL DEFAULT '',
      domain TEXT NOT NULL DEFAULT '',
      user_added BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS salaries (
      id SERIAL PRIMARY KEY,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      specialization TEXT NOT NULL DEFAULT '',
      level TEXT NOT NULL,
      level_name TEXT NOT NULL DEFAULT '',
      employment_type TEXT NOT NULL,
      years_exp INTEGER NOT NULL DEFAULT 0,
      years_at_company INTEGER NOT NULL DEFAULT 0,
      base INTEGER NOT NULL DEFAULT 0,
      bonus INTEGER NOT NULL DEFAULT 0,
      stock INTEGER NOT NULL DEFAULT 0,
      signing INTEGER NOT NULL DEFAULT 0,
      hourly REAL,
      total_comp INTEGER,
      clearance_required BOOLEAN NOT NULL DEFAULT FALSE,
      clearance_level TEXT,
      clearance_sponsored TEXT NOT NULL DEFAULT 'na',
      work_arrangement TEXT NOT NULL DEFAULT 'onsite',
      location_detail TEXT NOT NULL DEFAULT '',
      education TEXT NOT NULL DEFAULT '',
      nine_eighty BOOLEAN NOT NULL DEFAULT FALSE,
      notes TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT 'user',
      ip_hash TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS salaries_company_idx ON salaries(company_id)`,
    `CREATE INDEX IF NOT EXISTS salaries_created_idx ON salaries(created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS salaries_title_idx ON salaries(title)`,
  ];
  for (const s of statements) await query(s);
}

async function seedCompanies() {
  for (const [name, size, tags, area, hq, description, domain] of COMPANY_ROWS) {
    await query(
      `INSERT INTO companies (slug, name, size, tags, area, hq, description, domain)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (slug) DO UPDATE SET name=$2, size=$3, tags=$4, area=$5, hq=$6, description=$7, domain=$8`,
      [slugify(name), name, size, tags, area, Boolean(hq), description, domain || ''],
    );
  }
}

async function seedEstimates() {
  const { rows } = await query(`SELECT value FROM meta WHERE key='estimates_version'`);
  if (rows[0]?.value === String(ESTIMATES_VERSION)) return;

  const { rows: companies } = await query(`SELECT id, slug FROM companies`);
  const ids = Object.fromEntries(companies.map((c) => [c.slug, c.id]));
  const estimates = buildEstimates();

  await query(`DELETE FROM salaries WHERE source='estimate'`);
  const cols = ['company_id', 'title', 'level', 'level_name', 'employment_type', 'years_exp', 'years_at_company', 'base', 'bonus', 'stock', 'signing', 'hourly', 'total_comp', 'clearance_required', 'clearance_level', 'clearance_sponsored', 'work_arrangement', 'education', 'nine_eighty', 'created_at', 'source'];
  const CHUNK = 100;
  for (let i = 0; i < estimates.length; i += CHUNK) {
    const chunk = estimates.slice(i, i + CHUNK);
    const params = [];
    const tuples = chunk.map((r) => {
      const vals = [ids[r.slug], r.title, r.level, r.level_name, r.employment_type, r.years_exp, r.years_at_company, r.base, r.bonus, r.stock, r.signing, r.hourly, r.total_comp, r.clearance_required, r.clearance_level, r.clearance_sponsored, r.work_arrangement, r.education, r.nine_eighty, r.created_at.toISOString(), 'estimate'];
      const start = params.length;
      params.push(...vals);
      return `(${vals.map((_, j) => `$${start + j + 1}`).join(',')})`;
    });
    await query(`INSERT INTO salaries (${cols.join(',')}) VALUES ${tuples.join(',')}`, params);
  }
  await query(
    `INSERT INTO meta (key, value) VALUES ('estimates_version', $1) ON CONFLICT (key) DO UPDATE SET value=$1`,
    [String(ESTIMATES_VERSION)],
  );
  console.log(`[db] seeded ${estimates.length} baseline estimates (v${ESTIMATES_VERSION})`);
}
