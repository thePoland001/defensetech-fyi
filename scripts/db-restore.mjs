// Restores a backup made by db-backup.mjs (or the admin page's "Download backup") into the
// database at DATABASE_URL (or local PGlite). Safe to run twice: rows already present are
// skipped, so it can also merge a backup into a database that has newer submissions.
//
//   node scripts/db-restore.mjs backups/defensetech-2026-10-28.json

import fs from 'node:fs';
import { closeDb, initDb, transaction } from '../server/db.js';

const file = process.argv[2];
if (!file) {
  console.error('usage: node scripts/db-restore.mjs <backup.json>');
  process.exit(1);
}
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
if (data.format !== 'defensetech-backup') {
  console.error(`${file} isn't a defensetech.fyi backup`);
  process.exit(1);
}

const SALARY_COLS = ['title', 'specialization', 'level', 'level_name', 'employment_type', 'years_exp', 'years_at_company',
  'base', 'bonus', 'stock', 'signing', 'hourly', 'total_comp', 'clearance_required', 'clearance_level', 'clearance_sponsored',
  'work_arrangement', 'location_detail', 'education', 'nine_eighty', 'notes', 'source', 'ip_hash', 'created_at', 'hidden', 'reviewed'];

await initDb();
const stats = { companies: 0, salaries: 0, skipped: 0, flags: 0 };

await transaction(async (q) => {
  for (const c of data.companies) {
    const { rowCount } = await q(
      `INSERT INTO companies (slug, name, size, tags, area, hq, description, domain, user_added, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,TRUE,$9) ON CONFLICT (slug) DO NOTHING`,
      [c.slug, c.name, c.size, c.tags, c.area, c.hq, c.description, c.domain, c.created_at],
    );
    stats.companies += rowCount;
  }

  const { rows: companies } = await q(`SELECT id, slug FROM companies`);
  const companyId = Object.fromEntries(companies.map((c) => [c.slug, c.id]));
  const newId = {};

  for (const s of data.salaries) {
    const cid = companyId[s.company_slug];
    if (!cid) { stats.skipped++; continue; }
    // Same company, timestamp and submitter means it's already here.
    const { rows: [existing] } = await q(
      `SELECT id FROM salaries WHERE company_id=$1 AND created_at=$2 AND ip_hash=$3 AND title=$4`,
      [cid, s.created_at, s.ip_hash, s.title],
    );
    if (existing) { newId[s.old_id] = existing.id; stats.skipped++; continue; }
    const vals = SALARY_COLS.map((k) => s[k] ?? null);
    const { rows: [row] } = await q(
      `INSERT INTO salaries (company_id, ${SALARY_COLS.join(', ')}) VALUES ($1, ${SALARY_COLS.map((_, i) => `$${i + 2}`).join(', ')}) RETURNING id`,
      [cid, ...vals],
    );
    newId[s.old_id] = row.id;
    stats.salaries++;
  }

  for (const f of data.flags) {
    const sid = newId[f.salary_id];
    if (!sid) continue;
    const { rowCount } = await q(
      `INSERT INTO flags (salary_id, reason, details, ip_hash, created_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (salary_id, ip_hash) DO NOTHING`,
      [sid, f.reason, f.details, f.ip_hash, f.created_at],
    );
    stats.flags += rowCount;
  }
});

await closeDb();
console.log(`restored ${stats.salaries} salaries, ${stats.companies} companies, ${stats.flags} reports (${stats.skipped} already present or unmatched)`);
