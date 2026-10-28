// Pulls Huntsville MSA (area 26620) wage percentiles from the BLS public API (OEWS survey).
//
//   node data-pipeline/fetch_bls.mjs
//
// The v1 API needs no key but allows 25 requests a day with 25 series each, so this makes
// ~11 requests per run. Writes raw/bls_oews_huntsville.json.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const AREA = '0026620'; // Huntsville, AL MSA

export const OCCUPATIONS = {
  '172011': 'Aerospace Engineers',
  '172061': 'Computer Hardware Engineers',
  '172071': 'Electrical Engineers',
  '172072': 'Electronics Engineers, Except Computer',
  '172112': 'Industrial Engineers',
  '172141': 'Mechanical Engineers',
  '172131': 'Materials Engineers',
  '172041': 'Chemical Engineers',
  '172051': 'Civil Engineers',
  '172199': 'Engineers, All Other',
  '173021': 'Aerospace Engineering and Operations Technologists and Technicians',
  '173023': 'Electrical and Electronic Engineering Technologists and Technicians',
  '173027': 'Mechanical Engineering Technologists and Technicians',
  '151252': 'Software Developers',
  '151253': 'Software Quality Assurance Analysts and Testers',
  '151211': 'Computer Systems Analysts',
  '151212': 'Information Security Analysts',
  '151241': 'Computer Network Architects',
  '151244': 'Network and Computer Systems Administrators',
  '151221': 'Computer and Information Research Scientists',
  '151299': 'Computer Occupations, All Other',
  '152051': 'Data Scientists',
  '152031': 'Operations Research Analysts',
  '152041': 'Statisticians',
  '192012': 'Physicists',
  '119041': 'Architectural and Engineering Managers',
  '113021': 'Computer and Information Systems Managers',
  '119199': 'Managers, All Other',
  '131082': 'Project Management Specialists',
  '131081': 'Logisticians',
  '131023': 'Purchasing Agents, Except Wholesale, Retail, and Farm Products',
  '131111': 'Management Analysts',
  '132011': 'Accountants and Auditors',
  '132051': 'Financial and Investment Analysts',
  '131041': 'Compliance Officers',
  '131199': 'Business Operations Specialists, All Other',
};

// OEWS datatype codes
export const DATATYPES = {
  '01': 'employment',
  '04': 'annual_mean',
  '11': 'annual_p10',
  '12': 'annual_p25',
  '13': 'annual_median',
  '14': 'annual_p75',
  '15': 'annual_p90',
};

const series = [];
for (const occ of Object.keys(OCCUPATIONS)) {
  for (const dt of Object.keys(DATATYPES)) series.push(`OEUM${AREA}000000${occ}${dt}`);
}

const results = {};
for (let i = 0; i < series.length; i += 25) {
  const chunk = series.slice(i, i + 25);
  const res = await fetch('https://api.bls.gov/publicAPI/v1/timeseries/data/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ seriesid: chunk }),
  });
  const body = await res.json();
  if (body.status !== 'REQUEST_SUCCEEDED') {
    console.error('BLS request failed:', body.status, body.message);
    process.exit(1);
  }
  for (const s of body.Results.series) {
    const latest = s.data.find((d) => d.latest === 'true') ?? s.data[0];
    if (latest) results[s.seriesID] = { year: latest.year, value: latest.value };
  }
  process.stdout.write(`.${''}`);
}

const rows = [];
for (const [occ, title] of Object.entries(OCCUPATIONS)) {
  const row = { occ_code: `${occ.slice(0, 2)}-${occ.slice(2)}`, occ_title: title, area: 'Huntsville, AL MSA', year: null };
  for (const [dt, name] of Object.entries(DATATYPES)) {
    const r = results[`OEUM${AREA}000000${occ}${dt}`];
    // BLS uses "-" for suppressed and "#" for values above the $239,200 top-code.
    row[name] = r && /^\d/.test(r.value) ? Number(r.value) : r?.value === '#' ? 'top-coded' : null;
    if (r) row.year = r.year;
  }
  rows.push(row);
}

fs.writeFileSync(path.join(here, 'raw', 'bls_oews_huntsville.json'), JSON.stringify(rows, null, 2) + '\n');
console.log(`\n${rows.filter((r) => r.annual_median).length}/${rows.length} occupations with data`);
