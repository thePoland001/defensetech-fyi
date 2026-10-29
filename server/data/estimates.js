// Baseline compensation estimates for large defense companies in Huntsville.
//
// These are NOT user submissions. They are generated from publicly reported compensation
// ranges (levels.fyi, company job postings with pay transparency ranges, and BLS data for
// the Huntsville MSA) and are always shown with an "Estimate" badge in the UI.
// Bump ESTIMATES_VERSION whenever this file changes so the server re-seeds them.

export const ESTIMATES_VERSION = 5;

// Base salary ladders are for a Software Engineer in Huntsville at levels L1-L5; the other
// titles are scaled by ROLE_FACTORS. bonus = fraction of base, stock = $/yr.
// Each company's mix of the four tracked titles. Repeats weight the mix (IT shops are mostly
// software and systems; space and rocket shops lean mechanical and aerospace).
const SW = 'Software Engineer';
const SYS = 'Systems Engineer';
const AERO = 'Aerospace Engineer';
const MECH = 'Mechanical Engineer';
const PRIME_ROLES = [SW, SYS, AERO, MECH, SW, SYS];
const IT_ROLES = [SW, SYS, SW];
const SERVICES_ROLES = [SYS, SW, AERO, SYS, MECH];
const SPACE_ROLES = [MECH, AERO, SW, SYS, MECH, AERO];
const TECH_ROLES = [SW, SW, SW, SYS, MECH];

const CLEAR_PRIME = { none: 0.12, 'Public Trust': 0.03, Secret: 0.6, 'Top Secret': 0.1, 'TS/SCI': 0.13, 'TS/SCI + Poly': 0.02 };
const CLEAR_IT = { none: 0.15, 'Public Trust': 0.1, Secret: 0.5, 'Top Secret': 0.1, 'TS/SCI': 0.15 };
const CLEAR_SPACE = { none: 0.72, Secret: 0.24, 'Top Secret': 0.04 };
const CLEAR_TECH = { none: 0.22, Secret: 0.45, 'Top Secret': 0.11, 'TS/SCI': 0.22 };

const L = (a, b, c, d, e) => [a, b, c, d, e].map((k) => k * 1000);
const B_PRIME = [0, 0.02, 0.03, 0.05, 0.08];
const B_SMALL = [0, 0.01, 0.03, 0.04, 0.07];

const LM = ['E1 (Associate)', 'E2', 'E3 (Senior)', 'E4 (Staff)', 'E5 (Principal)'];
const NG = ['Level 1 (Associate)', 'Level 2', 'Level 3 (Principal)', 'Level 4 (Sr. Principal)', 'Level 5 (Staff)'];
const NUM = ['Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5'];
const RTX = ['P1 (Engineer I)', 'P2 (Engineer II)', 'P3 (Engineer III)', 'P4 (Senior)', 'P5 (Principal)'];
const L3H = ['Associate', 'Specialist', 'Senior Specialist', 'Lead', 'Principal'];
const ROMAN = ['I', 'II', 'III (Senior)', 'IV (Lead)', 'V (Principal)'];
const BOOZ = ['Consultant', 'Senior Consultant', 'Lead Associate', 'Associate', 'Senior Associate'];
const TECH = ['New Grad', 'Mid', 'Senior', 'Staff', 'Senior Staff'];

// slug -> config
export const ESTIMATE_CONFIG = {
  'lockheed-martin': { base: L(87, 106, 130, 152, 180), bonus: [0, 0.02, 0.04, 0.06, 0.09], stock5: 8000, ladder: LM, roles: PRIME_ROLES, clear: CLEAR_PRIME, intern: [25, 33], sponsor: 0.5, n: 26 },
  'northrop-grumman': { base: L(84, 101, 123, 146, 172), bonus: [0, 0.01, 0.03, 0.05, 0.08], stock5: 6000, ladder: NG, roles: PRIME_ROLES, clear: CLEAR_PRIME, intern: [24, 32], sponsor: 0.45, n: 26 },
  boeing: { base: L(86, 103, 127, 152, 182), bonus: [0.03, 0.04, 0.05, 0.07, 0.1], stock5: 6000, ladder: NUM, roles: PRIME_ROLES, clear: CLEAR_PRIME, intern: [25, 34], sponsor: 0.35, n: 24 },
  'raytheon-rtx': { base: L(84, 101, 122, 145, 170), bonus: [0.02, 0.03, 0.04, 0.06, 0.09], stock5: 6000, ladder: RTX, roles: PRIME_ROLES, clear: CLEAR_PRIME, intern: [24, 33], sponsor: 0.4, n: 24 },
  'collins-aerospace-rtx': { base: L(82, 99, 119, 141, 165), bonus: [0.02, 0.03, 0.04, 0.06, 0.09], ladder: RTX, roles: PRIME_ROLES, clear: CLEAR_PRIME, intern: [24, 32], sponsor: 0.3, n: 14 },
  'l3harris-technologies': { base: L(82, 98, 118, 140, 165), bonus: [0.01, 0.02, 0.04, 0.06, 0.08], ladder: L3H, roles: PRIME_ROLES, clear: CLEAR_PRIME, intern: [23, 31], sponsor: 0.35, n: 20 },
  'aerojet-rocketdyne-l3harris': { base: L(84, 100, 121, 143, 168), bonus: [0.01, 0.02, 0.04, 0.06, 0.08], ladder: L3H, roles: [AERO, MECH, SYS, AERO], clear: CLEAR_PRIME, intern: [24, 32], sponsor: 0.3, n: 14 },
  'general-dynamics-mission-systems': { base: L(80, 97, 117, 138, 160), bonus: B_SMALL, ladder: ROMAN, roles: PRIME_ROLES, clear: CLEAR_PRIME, intern: [22, 30], sponsor: 0.35, n: 14 },
  'general-dynamics-information-technology-gdit': { base: L(80, 98, 118, 140, 162), bonus: B_SMALL, ladder: ROMAN, roles: IT_ROLES, clear: CLEAR_IT, intern: [21, 29], sponsor: 0.25, n: 16 },
  'bae-systems': { base: L(82, 98, 118, 140, 163), bonus: [0.01, 0.02, 0.03, 0.05, 0.07], ladder: ROMAN, roles: PRIME_ROLES, clear: CLEAR_PRIME, intern: [23, 31], sponsor: 0.35, n: 18 },
  leidos: { base: L(82, 100, 121, 145, 170), bonus: [0.01, 0.02, 0.04, 0.06, 0.09], ladder: NUM, roles: [SW, SYS, SW, AERO], clear: CLEAR_IT, intern: [22, 30], sponsor: 0.35, n: 20 },
  'dynetics-leidos': { base: L(85, 104, 126, 150, 176), bonus: [0.03, 0.04, 0.06, 0.08, 0.1], ladder: NUM, roles: [SW, SYS, AERO, MECH, SYS, AERO], clear: CLEAR_PRIME, intern: [23, 31], sponsor: 0.55, n: 24 },
  saic: { base: L(82, 100, 122, 147, 172), bonus: [0.01, 0.02, 0.03, 0.05, 0.08], ladder: NUM, roles: SERVICES_ROLES, clear: CLEAR_IT, intern: [22, 30], sponsor: 0.3, n: 20 },
  'booz-allen-hamilton': { base: L(84, 103, 127, 152, 182), bonus: [0.03, 0.04, 0.06, 0.08, 0.11], ladder: BOOZ, roles: IT_ROLES, clear: CLEAR_IT, intern: [24, 32], sponsor: 0.35, n: 20 },
  'caci-international': { base: L(80, 98, 119, 142, 166), bonus: [0.01, 0.02, 0.04, 0.05, 0.08], ladder: ROMAN, roles: IT_ROLES, clear: CLEAR_IT, intern: [22, 29], sponsor: 0.3, n: 16 },
  kbr: { base: L(80, 97, 117, 139, 162), bonus: B_SMALL, ladder: ROMAN, roles: SERVICES_ROLES, clear: CLEAR_PRIME, intern: [21, 28], sponsor: 0.3, n: 16 },
  parsons: { base: L(81, 98, 118, 140, 163), bonus: B_SMALL, ladder: ROMAN, roles: SERVICES_ROLES, clear: CLEAR_PRIME, intern: [22, 30], sponsor: 0.3, n: 16 },
  amentum: { base: L(77, 93, 113, 134, 156), bonus: B_SMALL, ladder: ROMAN, roles: [SYS, AERO, SW, MECH], clear: CLEAR_PRIME, intern: [20, 27], sponsor: 0.2, n: 16 },
  mantech: { base: L(80, 98, 118, 140, 163), bonus: B_SMALL, ladder: ROMAN, roles: IT_ROLES, clear: CLEAR_IT, intern: [21, 28], sponsor: 0.25, n: 14 },
  peraton: { base: L(81, 99, 120, 143, 167), bonus: B_SMALL, ladder: ROMAN, roles: [SW, SYS, SW, AERO], clear: CLEAR_IT, intern: [22, 30], sponsor: 0.3, n: 14 },
  'hii-mission-technologies-camber': { base: L(78, 95, 115, 137, 159), bonus: B_SMALL, ladder: ROMAN, roles: SERVICES_ROLES, clear: CLEAR_PRIME, intern: [21, 28], sponsor: 0.3, n: 14 },
  'teledyne-brown-engineering': { base: L(77, 93, 112, 133, 155), bonus: B_SMALL, ladder: ROMAN, roles: [SYS, MECH, AERO, SW], clear: CLEAR_PRIME, intern: [20, 27], sponsor: 0.35, n: 16 },
  'textron-systems': { base: L(81, 98, 118, 140, 163), bonus: [0.02, 0.03, 0.04, 0.06, 0.08], ladder: ROMAN, roles: PRIME_ROLES, clear: CLEAR_PRIME, intern: [23, 31], sponsor: 0.3, n: 12 },
  'bell-textron': { base: L(84, 101, 122, 146, 172), bonus: [0.02, 0.03, 0.05, 0.07, 0.09], ladder: ROMAN, roles: [AERO, SYS, MECH, SW], clear: CLEAR_PRIME, intern: [24, 33], sponsor: 0.25, n: 12 },
  'general-atomics-electromagnetic-systems': { base: L(86, 104, 126, 150, 176), bonus: [0.02, 0.03, 0.05, 0.07, 0.1], ladder: ROMAN, roles: [MECH, SYS, SW], clear: CLEAR_PRIME, intern: [24, 33], sponsor: 0.35, n: 14 },
  'general-atomics-aeronautical-systems': { base: L(85, 103, 124, 148, 174), bonus: [0.02, 0.03, 0.05, 0.07, 0.1], ladder: ROMAN, roles: [SYS, SW, AERO], clear: CLEAR_PRIME, intern: [24, 33], sponsor: 0.3, n: 12 },
  'blue-origin': { base: L(92, 112, 138, 165, 198), bonus: [0.02, 0.03, 0.05, 0.07, 0.1], ladder: ROMAN, roles: SPACE_ROLES, clear: CLEAR_SPACE, intern: [28, 38], sponsor: 0.04, n: 20 },
  'palantir-technologies': { base: L(145, 165, 190, 215, 245), bonus: [0, 0, 0, 0, 0], stock: [40000, 65000, 100000, 150000, 210000], signing: [15000, 10000, 0, 0, 0], ladder: TECH, roles: [SW], clear: CLEAR_TECH, intern: [50, 60], sponsor: 0.3, n: 16 },
  'anduril-industries': { base: L(140, 160, 185, 215, 245), bonus: [0, 0, 0, 0, 0], stock: [35000, 55000, 90000, 140000, 200000], signing: [10000, 10000, 0, 0, 0], ladder: ['Engineer I', 'Engineer II', 'Senior Engineer', 'Staff Engineer', 'Principal Engineer'], roles: TECH_ROLES, clear: CLEAR_TECH, intern: [45, 55], sponsor: 0.25, n: 18 },
  'accenture-federal-services': { base: L(80, 99, 122, 148, 178), bonus: [0.02, 0.03, 0.05, 0.07, 0.1], ladder: ['Analyst', 'Consultant', 'Senior Consultant', 'Manager', 'Senior Manager'], roles: IT_ROLES, clear: CLEAR_IT, intern: [24, 32], sponsor: 0.15, n: 12 },
  'cgi-federal': { base: L(76, 93, 113, 135, 158), bonus: [0.01, 0.02, 0.03, 0.04, 0.06], ladder: ['Associate Consultant', 'Consultant', 'Senior Consultant', 'Lead Analyst', 'Director'], roles: IT_ROLES, clear: CLEAR_IT, intern: [21, 28], sponsor: 0.1, n: 10 },
  v2x: { base: L(74, 90, 109, 130, 152), bonus: B_SMALL, ladder: ROMAN, roles: [SYS, SW], clear: CLEAR_PRIME, intern: [19, 26], sponsor: 0.2, n: 12 },
  moog: { base: L(80, 96, 115, 137, 160), bonus: [0.01, 0.02, 0.04, 0.05, 0.07], ladder: ROMAN, roles: [MECH, SYS, SW, AERO], clear: CLEAR_PRIME, intern: [22, 30], sponsor: 0.2, n: 12 },
};

export const ROLE_FACTORS = {
  [SW]: 1.0,
  [SYS]: 0.99,
  [AERO]: 0.97,
  [MECH]: 0.94,
};

// Typical Huntsville pay premium for holding (and using) a clearance, relative to uncleared.
const CLEARANCE_PREMIUM = { none: 1, 'Public Trust': 1.01, Secret: 1.04, 'Top Secret': 1.08, 'TS/SCI': 1.13, 'TS/SCI + Poly': 1.2 };

const YOE = [[0, 2], [2, 5], [5, 9], [9, 14], [14, 22]];
const LEVEL_WEIGHTS = [0.27, 0.3, 0.24, 0.13, 0.06];
// People-management rungs (Accenture's "Manager", CGI's "Director") are left out for now;
// estimates only cover individual-contributor engineering levels.
const isManagerRung = (name) => /manager|director/i.test(name);

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(str) {
  let h = 2166136261;
  for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

const round = (n, to) => Math.round(n / to) * to;

function pickWeighted(rand, weights) {
  const entries = Object.entries(weights);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [k, w] of entries) {
    if ((r -= w) <= 0) return k;
  }
  return entries[entries.length - 1][0];
}

// Returns rows ready to insert into `salaries`, keyed by company slug.
export function buildEstimates(now = new Date()) {
  const rows = [];
  for (const [slug, cfg] of Object.entries(ESTIMATE_CONFIG)) {
    const rand = mulberry32(hash(slug));
    const between = (a, b) => a + (b - a) * rand();
    const daysAgo = () => new Date(now.getTime() - Math.floor(between(5, 540)) * 86400000);

    for (let i = 0; i < cfg.n; i++) {
      const title = cfg.roles[i % cfg.roles.length];
      let lvl = Number(pickWeighted(rand, Object.fromEntries(LEVEL_WEIGHTS.map((w, j) => [j, w]))));
      while (lvl > 0 && isManagerRung(cfg.ladder[lvl])) lvl--;
      const factor = ROLE_FACTORS[title] ?? 0.95;
      const clearance = pickWeighted(rand, cfg.clear);
      const required = clearance !== 'none';
      const base = round(cfg.base[lvl] * factor * CLEARANCE_PREMIUM[clearance] * between(0.92, 1.08), 500);
      const bonusPct = cfg.bonus[lvl];
      const bonus = bonusPct && rand() > 0.2 ? round(base * bonusPct * between(0.6, 1.4), 500) : 0;
      let stock = cfg.stock ? round(cfg.stock[lvl] * between(0.75, 1.3), 1000) : 0;
      if (!cfg.stock && cfg.stock5 && lvl === 4 && rand() > 0.4) stock = round(cfg.stock5 * between(0.6, 1.5), 500);
      const signing = cfg.signing && cfg.signing[lvl] && rand() > 0.3 ? round(cfg.signing[lvl] * between(0.6, 1.5), 1000) : lvl === 0 && rand() > 0.7 ? round(between(2000, 6000), 500) : 0;
      const [y0, y1] = YOE[lvl];
      const yoe = Math.round(between(y0, y1));
      let sponsored = 'na';
      if (required) {
        const r = rand();
        const pYes = lvl === 0 ? 0.75 : lvl === 1 ? 0.5 : 0.3;
        sponsored = r < pYes ? 'yes' : r < 0.95 ? 'had' : 'no';
      }
      rows.push({
        slug,
        title,
        level: `L${lvl + 1}`,
        level_name: cfg.ladder[lvl],
        employment_type: 'full_time',
        years_exp: yoe,
        years_at_company: Math.min(yoe, Math.round(between(0, Math.max(1, yoe * 0.7)))),
        base,
        bonus,
        stock,
        signing,
        hourly: null,
        total_comp: base + bonus + stock,
        clearance_required: required,
        clearance_level: required ? clearance : null,
        clearance_sponsored: sponsored,
        work_arrangement: rand() < 0.68 ? 'onsite' : rand() < 0.9 ? 'hybrid' : 'remote',
        education: lvl >= 2 && rand() < 0.4 ? 'masters' : 'bachelors',
        nine_eighty: cfg.base[0] < 130000 && rand() < 0.55,
        created_at: daysAgo(),
      });
    }

    // Internships
    const internCount = Math.max(3, Math.round(cfg.n / 6));
    for (let i = 0; i < internCount; i++) {
      const title = cfg.roles[(i + 1) % cfg.roles.length];
      const hourly = Math.round(between(cfg.intern[0], cfg.intern[1]) * 2) / 2;
      const sponsoredYes = rand() < cfg.sponsor;
      const level = sponsoredYes ? (rand() < 0.85 ? 'Secret' : 'Top Secret') : null;
      rows.push({
        slug,
        title,
        level: 'Intern',
        level_name: 'Intern',
        employment_type: 'intern',
        years_exp: 0,
        years_at_company: 0,
        base: 0,
        bonus: 0,
        stock: 0,
        signing: 0,
        hourly,
        total_comp: null,
        clearance_required: sponsoredYes,
        clearance_level: level,
        clearance_sponsored: sponsoredYes ? 'yes' : 'no',
        work_arrangement: rand() < 0.85 ? 'onsite' : 'hybrid',
        education: 'bachelors',
        nine_eighty: false,
        created_at: daysAgo(),
      });
    }
  }
  return rows;
}
