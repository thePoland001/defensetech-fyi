import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Public market data compiled by data-pipeline/build.mjs: posted pay ranges from Huntsville job
// postings and BLS wage percentiles for the Huntsville MSA. Read once at startup; it only changes
// when the pipeline is re-run and the app redeployed.

const FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data', 'market.json');
const data = fs.existsSync(FILE)
  ? JSON.parse(fs.readFileSync(FILE, 'utf8'))
  : { generated: null, postings: [], benchmarks: [] };

const isIntern = (p) => p.employment_type === 'intern';
const byCompany = new Map();
for (const p of data.postings) {
  if (!byCompany.has(p.company_slug)) byCompany.set(p.company_slug, []);
  byCompany.get(p.company_slug).push(p);
}

export const MARKET_GENERATED = data.generated;

export function postingCount(slug) {
  return byCompany.get(slug)?.length ?? 0;
}

function median(values) {
  const v = values.filter((x) => x != null).sort((a, b) => a - b);
  if (!v.length) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

const publicPosting = (p) => ({
  title: p.title,
  job_family: p.job_family,
  level: p.level,
  employment_type: p.employment_type,
  clearance_level: p.clearance_level,
  clearance_note: p.clearance_note,
  pay_min: p.pay_min,
  pay_max: p.pay_max,
  hourly_min: p.hourly_min,
  hourly_max: p.hourly_max,
  pay_period_posted: p.pay_period_posted,
  pay_is_indeed_estimate: p.pay_is_indeed_estimate,
  posted_date: p.posted_date,
  location: p.location,
  source: p.source,
  source_url: p.source_url,
});

// Posted ranges for one company. Counts and job families are public; the ranges themselves
// are pay data and follow the give-to-get gate.
export function companyPostings(slug, unlocked) {
  const list = byCompany.get(slug) ?? [];
  const families = {};
  for (const p of list) families[p.job_family] = (families[p.job_family] || 0) + 1;
  return {
    generated: data.generated,
    total: list.length,
    ft_count: list.filter((p) => !isIntern(p)).length,
    intern_count: list.filter(isIntern).length,
    families: Object.entries(families).map(([family, n]) => ({ family, n })).sort((a, b) => b.n - a.n),
    items: unlocked
      ? list
          .map(publicPosting)
          .sort((a, b) => Number(isIntern(a)) - Number(isIntern(b)) || a.job_family.localeCompare(b.job_family) || a.level.localeCompare(b.level) || a.pay_min - b.pay_min)
      : [],
  };
}

// Which BLS occupations best describe each job family on the site. OEWS has no "systems
// engineer" code; BLS counts them under Engineers, All Other (17-2199).
const FAMILY_OCCUPATIONS = {
  'Software Engineer': ['15-1252'],
  'Embedded Software Engineer': ['15-1252', '17-2061'],
  'Systems Engineer': ['17-2199', '17-2011'],
  'Electrical Engineer': ['17-2071', '17-2072'],
  'Hardware / FPGA Engineer': ['17-2061', '17-2072'],
  'RF / Antenna Engineer': ['17-2072', '17-2071'],
  'Mechanical Engineer': ['17-2141'],
  'Aerospace Engineer': ['17-2011'],
  'Test Engineer': ['17-2199', '15-1253'],
  'Cybersecurity Engineer': ['15-1212'],
  'Data Scientist / ML': ['15-2051', '15-1221'],
  'Modeling & Simulation Engineer': ['15-2031', '17-2011'],
  'Manufacturing Engineer': ['17-2112'],
  'Quality / Reliability Engineer': ['17-2112'],
  'Program Manager': ['11-9041', '11-9199'],
  'Project Manager': ['13-1082'],
  'Product Manager': ['13-1082'],
  'Business / Financial Analyst': ['13-2051', '13-1111'],
  'Logistics / Supply Chain': ['13-1081'],
  'IT / Network Engineer': ['15-1244', '15-1241'],
  'Engineering Technician': ['17-3023', '17-3021', '17-3027'],
  'Contracts / Procurement': ['13-1199'],
};

const PCTS = ['annual_p10', 'annual_p25', 'annual_median', 'annual_p75', 'annual_p90'];

export function familyBenchmark(family, unlocked) {
  const occupations = (FAMILY_OCCUPATIONS[family] ?? [])
    .map((code) => data.benchmarks.find((b) => b.occ_code === code))
    .filter(Boolean)
    .map((b) => ({
      occ_code: b.occ_code,
      occ_title: b.occ_title,
      employment: b.employment,
      year: b.year,
      ...Object.fromEntries(PCTS.map((k) => [k, unlocked && typeof b[k] === 'number' ? b[k] : null])),
      top_coded: PCTS.filter((k) => b[k] === 'top-coded'),
    }));

  const posted = data.postings.filter((p) => p.job_family === family && !isIntern(p));
  const levels = [...new Set(posted.map((p) => p.level))].sort().map((level) => {
    const rows = posted.filter((p) => p.level === level);
    return {
      level,
      n: rows.length,
      median_min: unlocked ? median(rows.map((p) => p.pay_min)) : null,
      median_max: unlocked ? median(rows.map((p) => p.pay_max)) : null,
    };
  });

  return {
    family,
    generated: data.generated,
    occupations,
    postings: {
      n: posted.length,
      companies: new Set(posted.map((p) => p.company_slug)).size,
      median_min: unlocked ? median(posted.map((p) => p.pay_min)) : null,
      median_max: unlocked ? median(posted.map((p) => p.pay_max)) : null,
      levels,
    },
  };
}
