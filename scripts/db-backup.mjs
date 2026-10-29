// Writes a JSON backup of everything that can't be regenerated from code: community
// salaries, community-added companies and reports. Uses DATABASE_URL (or local PGlite).
//
//   node scripts/db-backup.mjs                 # → backups/defensetech-YYYY-MM-DD.json
//   node scripts/db-backup.mjs path/to/file.json

import fs from 'node:fs';
import path from 'node:path';
import { closeDb, initDb } from '../server/db.js';
import { exportData } from '../server/moderation.js';

await initDb();
const data = await exportData();
await closeDb();

const out = process.argv[2] || path.join('backups', `defensetech-${new Date().toISOString().slice(0, 10)}.json`);
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
fs.writeFileSync(out, JSON.stringify(data, null, 2) + '\n');
console.log(`wrote ${out}: ${data.salaries.length} salaries, ${data.companies.length} companies, ${data.flags.length} reports`);
