import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { COMPANY_ROWS } from './data/companies.js';
import { ESTIMATES_VERSION, buildEstimates } from './data/estimates.js';
import { slugify } from '../shared/options.js';

// Uses Postgres when DATABASE_URL is set (production), otherwise an embedded PGlite database
// on disk so the app runs locally with zero setup. Both speak the same SQL dialect.
let client;
let isPglite = false;
let epoch = null;

// pg reports affected rows as rowCount, PGlite as affectedRows; callers always get rowCount.
const normalize = (result) => {
  if (result.rowCount == null) result.rowCount = result.affectedRows ?? 0;
  return result;
};

export async function query(text, params = []) {
  return normalize(await client.query(text, params));
}

// Runs fn(q) inside one transaction, where q has the same signature as query().
export async function transaction(fn) {
  if (isPglite) return client.transaction((tx) => fn(async (text, params = []) => normalize(await tx.query(text, params))));
  const conn = await client.connect();
  try {
    await conn.query('BEGIN');
    const result = await fn(async (text, params = []) => normalize(await conn.query(text, params)));
    await conn.query('COMMIT');
    return result;
  } catch (err) {
    await conn.query('ROLLBACK');
    throw err;
  } finally {
    conn.release();
  }
}

export async function closeDb() {
  if (isPglite) await client.close();
  else await client.end();
}

// A random ID minted when this database was created. Unlock cookies carry it, so a cookie
// issued against an older (wiped or replaced) database no longer unlocks anything.
export const dbEpoch = () => epoch;

function sslFor(url) {
  if (process.env.DATABASE_SSL === 'false') return false;
  if (process.env.DATABASE_SSL === 'true') return { rejectUnauthorized: false };
  // Render's internal hostnames have no dots (e.g. dpg-abc123-a); external ones (Neon,
  // Supabase, Render external URLs) need SSL.
  const host = new URL(url).hostname;
  return host.includes('.') && host !== 'localhost' && host !== '127.0.0.1' ? { rejectUnauthorized: false } : false;
}

export async function initDb() {
  if (process.env.DATABASE_URL) {
    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: sslFor(process.env.DATABASE_URL),
      max: Number(process.env.DATABASE_POOL_MAX) || 5,
      // Serverless Postgres (Neon) drops idle connections; recycle ours before it does.
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 15_000,
    });
    pool.on('error', (err) => console.error('[db] idle client error:', err.message));
    client = pool;
    console.log('[db] using Postgres');
  } else {
    // Render's disk is wiped on every deploy, so an embedded database there would silently
    // lose every submission. Refuse to start rather than pretend to save data.
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_EPHEMERAL_DB !== 'true') {
      throw new Error('DATABASE_URL is not set. Point it at a persistent Postgres database (see README → Database).');
    }
    const { PGlite } = await import('@electric-sql/pglite');
    const dir = process.env.PGLITE_DIR || './.data/pglite';
    // PGlite creates only the last path segment, so make sure the parent exists on a fresh clone.
    fs.mkdirSync(path.dirname(path.resolve(dir)), { recursive: true });
    const db = new PGlite(dir);
    await db.waitReady;
    client = db;
    isPglite = true;
    console.log(`[db] using embedded PGlite at ${dir}`);
  }
  await migrate();
  await seedCompanies();
  await seedEstimates();
  epoch = (await query(`SELECT value FROM meta WHERE key='db_epoch'`)).rows[0].value;
}

// ------------------------------------------------------------------------------- migrations

// Append-only. Each entry runs once, in order, and the highest applied version is stored in
// meta.schema_version. Never edit a migration that has shipped; add a new one.
const MIGRATIONS = [
  {
    version: 1,
    name: 'initial schema',
    sql: [
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
    ],
  },
  {
    version: 2,
    name: 'moderation and database epoch',
    sql: [
      // Hidden rows stay in the table for review but are excluded everywhere via live_salaries.
      // The view's column list is fixed when it's created: a later migration that adds a
      // column to salaries must CREATE OR REPLACE this view again.
      `ALTER TABLE salaries ADD COLUMN IF NOT EXISTS hidden BOOLEAN NOT NULL DEFAULT FALSE`,
      `ALTER TABLE salaries ADD COLUMN IF NOT EXISTS reviewed BOOLEAN NOT NULL DEFAULT FALSE`,
      `CREATE OR REPLACE VIEW live_salaries AS SELECT * FROM salaries WHERE NOT hidden`,
      `CREATE TABLE IF NOT EXISTS flags (
        id SERIAL PRIMARY KEY,
        salary_id INTEGER NOT NULL REFERENCES salaries(id) ON DELETE CASCADE,
        reason TEXT NOT NULL,
        details TEXT NOT NULL DEFAULT '',
        ip_hash TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (salary_id, ip_hash)
      )`,
      `CREATE INDEX IF NOT EXISTS flags_salary_idx ON flags(salary_id)`,
      `CREATE INDEX IF NOT EXISTS salaries_source_idx ON salaries(source)`,
      () => [`INSERT INTO meta (key, value) VALUES ('db_epoch', $1) ON CONFLICT (key) DO NOTHING`, [crypto.randomBytes(9).toString('base64url')]],
    ],
  },
];

export const SCHEMA_VERSION = MIGRATIONS.at(-1).version;

async function migrate() {
  await query(`CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);
  const current = Number((await query(`SELECT value FROM meta WHERE key='schema_version'`)).rows[0]?.value || 0);
  for (const m of MIGRATIONS) {
    if (m.version <= current) continue;
    await transaction(async (q) => {
      for (const s of m.sql) await (typeof s === 'function' ? q(...s()) : q(s));
      await q(
        `INSERT INTO meta (key, value) VALUES ('schema_version', $1) ON CONFLICT (key) DO UPDATE SET value=$1`,
        [String(m.version)],
      );
    });
    console.log(`[db] applied migration ${m.version}: ${m.name}`);
  }
}

// ------------------------------------------------------------------------------- seed data

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
  const estimates = buildEstimates().filter((r) => ids[r.slug]);

  // One transaction, so a crash mid-seed never leaves a half-replaced set of estimates.
  await transaction(async (q) => {
    await q(`DELETE FROM salaries WHERE source='estimate'`);
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
      await q(`INSERT INTO salaries (${cols.join(',')}) VALUES ${tuples.join(',')}`, params);
    }
    await q(
      `INSERT INTO meta (key, value) VALUES ('estimates_version', $1) ON CONFLICT (key) DO UPDATE SET value=$1`,
      [String(ESTIMATES_VERSION)],
    );
  });
  console.log(`[db] seeded ${estimates.length} baseline estimates (v${ESTIMATES_VERSION})`);
}
