// Builds the market-data database from the raw files in data-pipeline/raw/.
//
//   node data-pipeline/build.mjs
//
// Inputs (tab-separated, collected through the Indeed connector):
//   raw/indeed_postings.tsv          Huntsville job postings and the pay shown on them
//   raw/indeed_company_salaries.tsv  Indeed's reported average pay per company + title, localized to Huntsville
//   raw/careers_*.tsv                Employer-posted ranges read from company career sites (same columns
//                                    plus source_url, and clearance_note for internships)
//   raw/bls_oews_huntsville.json     BLS OEWS wage percentiles for the Huntsville MSA (fetch_bls.mjs)
//
// Outputs:
//   out/postings.csv, out/company_title_averages.csv, out/bls_oews_huntsville.csv, out/unmatched.csv
//   out/market.db                    SQLite with the same tables plus summary views
//   ../server/data/market.json       Compact file the web server seeds from

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { COMPANY_ROWS } from '../server/data/companies.js';
import { slugify } from '../shared/options.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const RAW = path.join(here, 'raw');
const OUT = path.join(here, 'out');
fs.mkdirSync(OUT, { recursive: true });

// ---------- company matching ----------

const directory = COMPANY_ROWS.map(([name, size]) => ({ name, size, slug: slugify(name) }));
const bySlug = new Map(directory.map((c) => [c.slug, c]));

// Names as Indeed shows them → directory slug. Anything not listed falls through to a
// normalized-name match against the directory.
const ALIASES = {
  'raytheon': 'raytheon-rtx',
  'rtx': 'raytheon-rtx',
  'l3harris': 'l3harris-technologies',
  'bae systems usa': 'bae-systems',
  'general dynamics information technology': 'general-dynamics-information-technology-gdit',
  'gdit': 'general-dynamics-information-technology-gdit',
  'radiance technologies inc': 'radiance-technologies',
  'colsa': 'colsa-corporation',
  'mtsi': 'modern-technology-solutions-mtsi',
  'caci international': 'caci-international',
  'caci': 'caci-international',
  'aerospace': 'the-aerospace-corporation',
  'kratos defense and security solutions': 'kratos-defense-security-solutions',
  'rtx (raytheon)': 'raytheon-rtx',
  'odyssey systems consulting group ltd': 'odyssey-systems',
  'davidson': 'davidson-technologies',
  'yulista management services': 'yulista',
  'teledyne flir': null, // not in the directory (FLIR's Huntsville site is outside the defense list)
  'kratos': 'kratos-defense-security-solutions',
  'palantir': 'palantir-technologies',
  'anduril': 'anduril-industries',
  'sierra nevada corporation': 'sierra-nevada-company',
  'aerovironment': 'aerovironment-av',
  'hii': 'hii-mission-technologies-camber',
};

const norm = (s) =>
  s.toLowerCase().replace(/[.,]/g, '').replace(/\b(inc|llc|corp|corporation|co|company|usa|us)\b/g, '').replace(/\s+/g, ' ').trim();

const normIndex = new Map();
for (const c of directory) {
  normIndex.set(norm(c.name), c);
  normIndex.set(norm(c.name.replace(/\s*\(.*\)\s*/g, ' ')), c);
}

function matchCompany(raw) {
  const key = norm(raw);
  if (key in ALIASES) return ALIASES[key] ? bySlug.get(ALIASES[key]) ?? null : null;
  return normIndex.get(key) ?? null;
}

// ---------- title parsing ----------

const FAMILY_RULES = [
  [/technician/i, 'Engineering Technician'],
  [/cyber|security engineer|isso|issm|information system security|soc analyst|rmf/i, 'Cybersecurity Engineer'],
  [/program manager|manager programs|program director|capture manager|program information|business development|program coordinator/i, 'Program Manager'],
  [/project (manager|management|engineer)|project analyst|configuration management/i, 'Project Manager'],
  [/planner|scheduling|cost schedule|financ|business analyst|data analyst|program\/data|business intelligence/i, 'Business / Financial Analyst'],
  [/subcontract|procure|purchas|contracts/i, 'Contracts / Procurement'],
  [/sourcing|supply chain|supplier|logistic|\bbom\b/i, 'Logistics / Supply Chain'],
  [/data scien|data engineer|machine learning|\bml\b|reinforcement|\bai engineer/i, 'Data Scientist / ML'],
  [/embedded/i, 'Embedded Software Engineer'],
  [/fpga|digital hardware|hardware (engineer|lead)|power design|semiconductor/i, 'Hardware / FPGA Engineer'],
  [/\brf\b|antenna|radar|datalink/i, 'RF / Antenna Engineer'],
  [/model(ing)?,? (and |& )?sim|simulation|m&s|operations research|afsim|weapon system analyst|engineering analyst|technology analysis/i, 'Modeling & Simulation Engineer'],
  [/system administrator|systems administrator|server|cloud engineer|database|enterprise architect|linux|network|it software|computer specialist/i, 'IT / Network Engineer'],
  [/test|integration|iv&v/i, 'Test Engineer'],
  [/software|developer|devops|programmer|\btak\b|full.?stack|python/i, 'Software Engineer'],
  [/systems? engineer|engineer systems|systems? architect|systems director|mbse|digital engineer|obsolescence|systems integrator|c2\/|fire control|field engineer|engineer field/i, 'Systems Engineer'],
  [/electrical|electronics engineer|sensor/i, 'Electrical Engineer'],
  [/aerospace|aeronautical|propulsion|fluid systems|energetics|flight termination|range safety|interceptor/i, 'Aerospace Engineer'],
  [/mechanical|structural|stowage/i, 'Mechanical Engineer'],
  [/manufactur|production manager|materials (&|and) processes/i, 'Manufacturing Engineer'],
  [/quality|reliability|assurance|safety engineer|auditor/i, 'Quality / Reliability Engineer'],
];

function family(title) {
  for (const [re, fam] of FAMILY_RULES) if (re.test(title) && fam) return fam;
  return 'Other';
}

// Company ladders differ (Lockheed E1–E6, Northrop 1–6, L3Harris Specialist < Associate < Senior
// Associate…), so map the common markers onto the site's L1–L6. Explicit numerals win over words.
function levelOf(t, company) {
  t = t.replace(/IV&V/gi, '');
  if (/fellow|distinguished/i.test(t)) return 6;
  if (/executive|director/i.test(t)) return 5;
  if (/\bE([1-6])\b/.test(t)) return Number(t.match(/\bE([1-6])\b/)[1]);
  if (/\b(level|engineer) ([1-6])\b/i.test(t)) return Number(t.match(/\b(?:level|engineer) ([1-6])\b/i)[1]);
  const roman = t.match(/\b(I{1,3}|IV|V)\b(?!&)/);
  if (roman) return { I: 1, II: 2, III: 3, IV: 4, V: 5 }[roman[1]];
  if (/sr\.? principal|senior principal|principal/i.test(t)) return 5;
  if (/staff|lead|manager|sme|architect/i.test(t)) return 4;
  if (/senior|sr\.?\s|experienced/i.test(t)) return 3;
  if (company === 'l3harris-technologies' && /^associate/i.test(t)) return 3;
  if (company === 'l3harris-technologies' && /^specialist/i.test(t)) return 2;
  if (/entry|junior|jr\.?|associate|\basc\b|university|basic/i.test(t)) return 1;
  return 2;
}

// Postings that cover two levels ("Level 3 or 4", "Senior or Principal", "Associate / Software
// Engineer") are filed under the lower one, since the posted range starts there.
function level(title, company) {
  const parts = title.split(/\s+or\s+|\s*\/\s*(?=[A-Z])/).filter((p) => p.length > 2);
  const lv = parts.length > 1 ? Math.min(...parts.map((p) => levelOf(p, company))) : levelOf(title, company);
  return `L${lv}`;
}

function clearance(title) {
  if (/poly/i.test(title)) return 'TS/SCI + Poly';
  if (/ts\/sci|ts\/ci/i.test(title)) return 'TS/SCI';
  if (/top secret/i.test(title)) return 'Top Secret';
  if (/secret|cleared|classified/i.test(title)) return 'Secret';
  return null;
}

// "$90,000 - $108,000 a year" | "$24 - $34 an hour" | "N/A"
function parseComp(s) {
  const m = s.match(/\$([\d,.]+)(?:\s*-\s*\$([\d,.]+))?\s+(?:a|an)\s+(year|hour)/);
  if (!m) return null;
  const lo = Number(m[1].replace(/,/g, ''));
  const hi = m[2] ? Number(m[2].replace(/,/g, '')) : lo;
  // Indeed fills in its own estimate when an employer leaves pay off a posting. Those come
  // back with cents ("$75,904.37"), while employer-posted ranges are whole dollars.
  const indeedEstimate = /\.\d\d/.test(m[1]) || (m[2] ? /\.\d\d/.test(m[2]) : false);
  return { lo, hi, period: m[3], indeedEstimate };
}

// Postings that aren't defense employers or aren't real full-time roles.
const EXCLUDE_COMPANY = /dataannotation|recruit|personnel|staffing|system one|liberty jobs|deshazo|explore engineering|bristol bay construction/i;
const ALLOWED_LOCATIONS = /huntsville|redstone arsenal/i;

// ---------- postings ----------

function readTsv(file) {
  const p = path.join(RAW, file);
  if (!fs.existsSync(p)) return [];
  const [head, ...lines] = fs.readFileSync(p, 'utf8').trim().split('\n');
  const cols = head.split('\t');
  return lines.filter(Boolean).map((l) => Object.fromEntries(l.split('\t').map((v, i) => [cols[i], v])));
}

const careerFiles = fs.existsSync(RAW) ? fs.readdirSync(RAW).filter((f) => /^careers_.*\.tsv$/.test(f)).sort() : [];
const rawPostings = [
  ...readTsv('indeed_postings.tsv').map((r) => ({ ...r, source: 'indeed_posting' })),
  ...careerFiles.flatMap((f) => readTsv(f).map((r) => ({ ...r, source: 'career_site' }))),
];
const seen = new Set();
const postings = [];
const unmatched = [];
const dropped = { duplicate: 0, excluded: 0, location: 0, noPay: 0, implausible: 0, unmatched: 0, partTime: 0 };

for (const r of rawPostings) {
  if (!r.title || !r.company || !r.compensation) { dropped.noPay++; continue; }
  const dedupeKey = `${norm(r.company)}|${r.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()}|${r.compensation.replace(/\.\d\d/g, '')}`;
  if (seen.has(dedupeKey)) { dropped.duplicate++; continue; }
  seen.add(dedupeKey);
  if (EXCLUDE_COMPANY.test(r.company)) { dropped.excluded++; continue; }
  if (!ALLOWED_LOCATIONS.test(r.location)) { dropped.location++; continue; }
  if (/part-time/i.test(r.job_type)) { dropped.partTime++; continue; }
  const comp = parseComp(r.compensation);
  if (!comp) { dropped.noPay++; continue; }
  const company = matchCompany(r.company);
  if (!company) { dropped.unmatched++; unmatched.push(r); continue; }

  const annual = comp.period === 'hour' ? (x) => Math.round(x * 2080) : (x) => Math.round(x);
  // Indeed's fill-in estimates are occasionally nonsense (an M&S engineer at $8–22/hr).
  const floor = /engineer|developer|scientist/i.test(r.title) ? 50000 : 30000;
  if (annual(comp.hi) < floor && !/technician|intern|co-?op/i.test(r.title)) { dropped.implausible++; continue; }
  const intern = /\bintern(ship)?s?\b|\bco-?op\b/i.test(r.title) || /internship|co-?op/i.test(r.job_type);
  postings.push({
    job_id: r.job_id,
    company_slug: company.slug,
    company_name: company.name,
    company_size: company.size,
    posted_company_name: r.company,
    title: r.title,
    job_family: family(intern ? r.title.replace(/\b(intern(ship)?s?|co-?op|summer \d{4}|university|undergraduate|graduate)\b/gi, '') : r.title),
    level: level(r.title, company.slug),
    employment_type: intern ? 'intern' : /contract/i.test(r.job_type) ? 'contract' : 'full_time',
    clearance_level: clearance(`${r.title} ${r.clearance_note || ''}`),
    pay_min: annual(comp.lo),
    pay_max: annual(comp.hi),
    pay_mid: annual((comp.lo + comp.hi) / 2),
    pay_period_posted: comp.period,
    // Internships are compared hourly on the site; annualized ranges assume 2,080 hours.
    hourly_min: comp.period === 'hour' ? comp.lo : Math.round((comp.lo / 2080) * 100) / 100,
    hourly_max: comp.period === 'hour' ? comp.hi : Math.round((comp.hi / 2080) * 100) / 100,
    pay_is_indeed_estimate: r.source === 'indeed_posting' && comp.indeedEstimate,
    location: r.location,
    posted_date: r.posted || '',
    clearance_note: r.clearance_note || '',
    source: r.source,
    source_url: r.source_url || '',
  });
}

// ---------- company/title averages ----------

const averages = [];
for (const r of readTsv('indeed_company_salaries.tsv')) {
  if (!r.average || r.average === 'null') continue;
  const company = matchCompany(r.company);
  if (!company) { unmatched.push({ ...r, title: r.job_title, compensation: r.average }); continue; }
  const avg = Number(r.average);
  averages.push({
    company_slug: company.slug,
    company_name: company.name,
    job_title: r.job_title,
    job_family: family(r.job_title),
    location: r.location,
    average_pay: r.salary_type === 'HOURLY' ? Math.round(avg * 100) / 100 : Math.round(avg),
    salary_type: r.salary_type,
    report_count: Number(r.count) || 0,
    retrieved: r.retrieved,
    source: 'indeed_company_salaries',
  });
}

// ---------- BLS benchmarks ----------

const blsPath = path.join(RAW, 'bls_oews_huntsville.json');
const benchmarks = fs.existsSync(blsPath)
  ? JSON.parse(fs.readFileSync(blsPath, 'utf8')).filter((r) => r.annual_median != null)
  : [];

// ---------- write outputs ----------

function toCsv(rows) {
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]);
  const esc = (v) => (v == null ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n') + '\n';
}

fs.writeFileSync(path.join(OUT, 'postings.csv'), toCsv(postings));
fs.writeFileSync(path.join(OUT, 'company_title_averages.csv'), toCsv(averages));
fs.writeFileSync(path.join(OUT, 'unmatched.csv'), toCsv(unmatched));
fs.writeFileSync(path.join(OUT, 'bls_oews_huntsville.csv'), toCsv(benchmarks));

const dbPath = path.join(OUT, 'market.db');
fs.rmSync(dbPath, { force: true });
const sql = `
.mode csv
.import '${path.join(OUT, 'postings.csv')}' postings
${averages.length ? `.import '${path.join(OUT, 'company_title_averages.csv')}' company_title_averages` : ''}
${benchmarks.length ? `.import '${path.join(OUT, 'bls_oews_huntsville.csv')}' bls_oews_huntsville` : ''}
CREATE VIEW company_summary AS
  SELECT company_name, company_size, COUNT(*) AS postings,
         CAST(AVG(CAST(pay_min AS INT)) AS INT) AS avg_min,
         CAST(AVG(CAST(pay_mid AS INT)) AS INT) AS avg_mid,
         CAST(AVG(CAST(pay_max AS INT)) AS INT) AS avg_max,
         SUM(pay_is_indeed_estimate = 'false') AS employer_posted
  FROM postings WHERE employment_type = 'full_time' GROUP BY company_name ORDER BY postings DESC;
CREATE VIEW intern_summary AS
  SELECT company_name, COUNT(*) AS postings,
         MIN(CAST(hourly_min AS REAL)) AS hourly_low, MAX(CAST(hourly_max AS REAL)) AS hourly_high,
         GROUP_CONCAT(DISTINCT NULLIF(clearance_note, '')) AS clearance_notes
  FROM postings WHERE employment_type = 'intern' GROUP BY company_name ORDER BY postings DESC;
CREATE VIEW family_level_summary AS
  SELECT job_family, level, COUNT(*) AS postings,
         CAST(AVG(CAST(pay_mid AS INT)) AS INT) AS avg_mid
  FROM postings WHERE employment_type = 'full_time'
  GROUP BY job_family, level ORDER BY job_family, level;
`;
execFileSync('sqlite3', [dbPath], { input: sql });

fs.writeFileSync(
  path.join(here, '..', 'server', 'data', 'market.json'),
  JSON.stringify({ generated: new Date().toISOString().slice(0, 10), postings, averages, benchmarks }, null, 0) + '\n',
);

console.log(`raw postings:      ${rawPostings.length}`);
console.log(`by source:         ${JSON.stringify(postings.reduce((a, p) => ((a[p.source] = (a[p.source] || 0) + 1), a), {}))}`);
console.log(`kept postings:     ${postings.length} (${postings.filter((p) => !p.pay_is_indeed_estimate).length} employer-posted pay, ${postings.filter((p) => p.pay_is_indeed_estimate).length} Indeed-estimated)`);
console.log(`dropped:           ${JSON.stringify(dropped)}`);
console.log(`company averages:  ${averages.length}`);
console.log(`BLS occupations:   ${benchmarks.length}`);
console.log(`companies covered: ${new Set([...postings, ...averages].map((r) => r.company_slug)).size}`);
console.log(`wrote ${path.relative(process.cwd(), OUT)}/{postings.csv,company_title_averages.csv,unmatched.csv,market.db} and server/data/market.json`);
