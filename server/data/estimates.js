// Baseline compensation estimates for large defense companies in Huntsville.
//
// These are NOT user submissions. They are generated from publicly reported compensation
// ranges (levels.fyi Huntsville medians, company job postings with pay-transparency ranges, and BLS data for
// the Huntsville MSA) and are always shown with an "Estimate" badge in the UI.
// Bump ESTIMATES_VERSION whenever this file changes so the server re-seeds them.

export const ESTIMATES_VERSION = 7;

// Base salary ladders are for a Software Engineer in Huntsville at levels L1-L5; the other
// titles are scaled by ROLE_FACTORS. Where levels.fyi has Huntsville data, CALIBRATION below
// overrides the ladder so modeled total comp lands on those medians. bonus = fraction of base, stock = $/yr.
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
const NG = ['T1', 'T2', 'T3', 'T4', 'T5'];
const NUM = ['Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5'];
const RTX = ['P1 (Engineer I)', 'P2 (Engineer II)', 'P3 (Engineer III)', 'P4 (Senior)', 'P5 (Principal)'];
const L3H = ['Associate', 'Senior Associate', 'Specialist', 'Lead', 'Scientist'];
const ROMAN = ['I', 'II', 'III (Senior)', 'IV (Lead)', 'V (Principal)'];
const BOOZ = ['Engineer', 'Staff Engineer', 'Lead Engineer', 'Senior Lead Engineer', 'Chief Engineer'];
const TECH = ['New Grad', 'Mid', 'Senior', 'Staff', 'Senior Staff'];
const TCODE = ['T1', 'T2', 'T3', 'T4', 'T5'];
const BAE = ['G08', 'G09', 'G10', 'G11', 'G12'];
const PERATON = ['Associate', 'Senior Associate', 'Lead Associate', 'Advisor', 'Senior Advisor'];

// Mid-size firms share a starting ladder and a smaller sample; CALIBRATION sets their pay level.
const mid = (roles, clear, extra) => ({ base: L(76, 92, 112, 133, 155), bonus: B_SMALL, ladder: ROMAN, roles, clear, intern: [20, 28], sponsor: 0.3, n: 10, spread: true, ...extra });
const ENG_ROLES = [SYS, AERO, MECH, SW];

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
  'bae-systems': { base: L(82, 98, 118, 140, 163), bonus: [0.01, 0.02, 0.03, 0.05, 0.07], ladder: BAE, roles: PRIME_ROLES, clear: CLEAR_PRIME, intern: [23, 31], sponsor: 0.35, n: 18 },
  leidos: { base: L(82, 100, 121, 145, 170), bonus: [0.01, 0.02, 0.04, 0.06, 0.09], ladder: TCODE, roles: [SW, SYS, SW, AERO], clear: CLEAR_IT, intern: [22, 30], sponsor: 0.35, n: 20 },
  'dynetics-leidos': { base: L(85, 104, 126, 150, 176), bonus: [0.03, 0.04, 0.06, 0.08, 0.1], ladder: NUM, roles: [SW, SYS, AERO, MECH, SYS, AERO], clear: CLEAR_PRIME, intern: [23, 31], sponsor: 0.55, n: 24 },
  saic: { base: L(82, 100, 122, 147, 172), bonus: [0.01, 0.02, 0.03, 0.05, 0.08], ladder: NUM, roles: SERVICES_ROLES, clear: CLEAR_IT, intern: [22, 30], sponsor: 0.3, n: 20 },
  'booz-allen-hamilton': { base: L(84, 103, 127, 152, 182), bonus: [0.03, 0.04, 0.06, 0.08, 0.11], ladder: BOOZ, roles: IT_ROLES, clear: CLEAR_IT, intern: [24, 32], sponsor: 0.35, n: 20 },
  'caci-international': { base: L(80, 98, 119, 142, 166), bonus: [0.01, 0.02, 0.04, 0.05, 0.08], ladder: TCODE, roles: IT_ROLES, clear: CLEAR_IT, intern: [22, 29], sponsor: 0.3, n: 16 },
  kbr: { base: L(80, 97, 117, 139, 162), bonus: B_SMALL, ladder: ROMAN, roles: SERVICES_ROLES, clear: CLEAR_PRIME, intern: [21, 28], sponsor: 0.3, n: 16 },
  parsons: { base: L(81, 98, 118, 140, 163), bonus: B_SMALL, ladder: ROMAN, roles: SERVICES_ROLES, clear: CLEAR_PRIME, intern: [22, 30], sponsor: 0.3, n: 16 },
  amentum: { base: L(77, 93, 113, 134, 156), bonus: B_SMALL, ladder: ROMAN, roles: [SYS, AERO, SW, MECH], clear: CLEAR_PRIME, intern: [20, 27], sponsor: 0.2, n: 16 },
  mantech: { base: L(80, 98, 118, 140, 163), bonus: B_SMALL, ladder: ROMAN, roles: IT_ROLES, clear: CLEAR_IT, intern: [21, 28], sponsor: 0.25, n: 14 },
  peraton: { base: L(81, 99, 120, 143, 167), bonus: B_SMALL, ladder: PERATON, roles: [SW, SYS, SW, AERO], clear: CLEAR_IT, intern: [22, 30], sponsor: 0.3, n: 14 },
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
  'torch-technologies': mid(SERVICES_ROLES, CLEAR_PRIME),
  peopletec: mid([SW, SYS, AERO, SW], CLEAR_PRIME),
  'radiance-technologies': mid(PRIME_ROLES, CLEAR_TECH),
  arcfield: mid(SERVICES_ROLES, CLEAR_PRIME),
  draper: mid(PRIME_ROLES, CLEAR_TECH, { intern: [24, 32] }),
  'the-aerospace-corporation': mid(ENG_ROLES, CLEAR_TECH, { intern: [24, 32] }),
  battelle: mid(ENG_ROLES, CLEAR_TECH),
  noblis: mid(IT_ROLES, CLEAR_IT),
  'asrc-federal': mid(IT_ROLES, CLEAR_IT),
  mitre: mid([SYS, SW, SW, AERO], CLEAR_IT, { ladder: ['Associate', 'Intermediate', 'Senior', 'Lead', 'Principal'], intern: [24, 32] }),
  viasat: mid(TECH_ROLES, CLEAR_TECH, { ladder: ['Engineer 1', 'Engineer 2', 'Engineer 3', 'Staff', 'Senior Staff'], intern: [26, 36] }),
  'aerovironment-av': mid([SW, AERO, MECH, SYS, SW], CLEAR_TECH, { intern: [24, 32] }),
  'leonardo-drs': mid(PRIME_ROLES, CLEAR_PRIME),
  lmi: mid(IT_ROLES, CLEAR_IT),
  astrion: mid(SERVICES_ROLES, CLEAR_PRIME),
  'parry-labs': mid(TECH_ROLES, CLEAR_PRIME),
  'qinetiq-us': mid(SERVICES_ROLES, CLEAR_PRIME),
  'scientific-research-corporation': mid(IT_ROLES, CLEAR_IT),
  'american-systems': mid(SERVICES_ROLES, CLEAR_PRIME),
  'sierra-nevada-company': mid(PRIME_ROLES, CLEAR_PRIME),
  'systems-planning-analysis-spa': mid([SYS, SW, AERO], CLEAR_PRIME),
  'applied-research-associates-ara': mid(ENG_ROLES, CLEAR_PRIME),
  'elbit-systems-of-america': mid([SW, SYS, MECH, AERO], CLEAR_PRIME),
};

// Median ratio of each title's Huntsville total comp to software engineers at the same company
// and level, from levels.fyi (Lockheed, Northrop and Boeing pages, Nov 2026).
export const ROLE_FACTORS = {
  [SW]: 1.0,
  [SYS]: 0.92,
  [AERO]: 0.94,
  [MECH]: 0.91,
};

// Huntsville-area software engineer total comp from levels.fyi (Nov 2026; raw figures in
// data-pipeline/raw/levels_huntsville.tsv).
//   tc:      median total comp at L1-L5. The base ladder is solved so modeled TC hits these.
//   overall: only an all-levels median was available. The ladder is scaled so its L2-L3
//            midpoint (where most reports sit) matches.
//   level:   with overall, the figure is one known level's package, so that level is matched
//            instead of the midpoint.
// Anduril has no Huntsville figures; its national medians (IC2-IC6) are discounted 15% for
// Huntsville, keeping the equity-heavy mix.
export const CALIBRATION = {
  'lockheed-martin': { tc: L(91.3, 114, 148, 165.4, 196.9) },
  'northrop-grumman': { tc: L(94.2, 106.5, 136.9, 165.2, 216.3) },
  boeing: { tc: L(97.3, 117.3, 152.3, 174, 192.2) },
  'raytheon-rtx': { tc: L(95.2, 105.3, 138.5, 158.3, 210.3) },
  leidos: { tc: L(84.4, 108.4, 137.6, 163.3, 205.7) },
  'l3harris-technologies': { tc: L(93.1, 115.2, 128, 161.2, 181.4) },
  saic: { tc: L(89.8, 104.4, 137.6, 180, 187) },
  'booz-allen-hamilton': { tc: L(106.4, 125.6, 163.6, 175.9, 242.4) },
  'bae-systems': { tc: L(93.5, 108.5, 132, 150.7, 169.6) },
  'blue-origin': { tc: L(129.7, 169.2, 183, 247, 267) },
  'caci-international': { tc: L(89.4, 118.2, 155.9, 180.3, 215.3) },
  peraton: { tc: L(91.8, 111, 123.7, 149.6, 218.1) },
  'general-atomics-electromagnetic-systems': { tc: L(103.7, 118.5, 124.1, 140.9, 152) },
  'general-atomics-aeronautical-systems': { tc: L(103.7, 118.5, 124.1, 140.9, 152) },
  'anduril-industries': { tc: L(195.8, 235.3, 281, 316, 444.7) },
  kbr: { overall: 109750 },
  parsons: { overall: 115000 },
  'general-dynamics-mission-systems': { overall: 96500 },
  amentum: { overall: 85000 },
  mantech: { overall: 140000 },
  'teledyne-brown-engineering': { overall: 116000 },
  'textron-systems': { overall: 93500 },
  'palantir-technologies': { overall: 252000 },
  mitre: { tc: L(105.9, 120.5, 135.5, 168.7, 213.2) },
  viasat: { tc: L(132.9, 157.4, 175.6, 248.2, 280) },
  'torch-technologies': { overall: 145000 },
  peopletec: { overall: 130000 },
  'radiance-technologies': { overall: 90390 },
  arcfield: { overall: 90000 },
  draper: { overall: 130000 },
  'the-aerospace-corporation': { overall: 100000 },
  battelle: { overall: 95000 },
  noblis: { overall: 100000 },
  'asrc-federal': { overall: 82000 },
  'aerovironment-av': { overall: 159000 },
  'leonardo-drs': { overall: 90000 },
  astrion: { overall: 93000 },
  'parry-labs': { overall: 130000 },
  'qinetiq-us': { overall: 95000 },
  'scientific-research-corporation': { overall: 93000 },
  'american-systems': { overall: 87000 },
  'sierra-nevada-company': { overall: 120000 },
  'systems-planning-analysis-spa': { overall: 112000 },
  'applied-research-associates-ara': { overall: 85000 },
  'elbit-systems-of-america': { overall: 113667 },
  // US median; its example package is a Washington, DC L5.
  lmi: { overall: 180000, level: 4 },
};

// Expected multipliers the generator applies on top of base, so a TC target can be turned
// back into a base salary.
function expectedPremium(clear) {
  const total = Object.values(clear).reduce((s, w) => s + w, 0);
  return Object.entries(clear).reduce((s, [k, w]) => s + (w / total) * CLEARANCE_PREMIUM[k], 0);
}
function expectedStock(cfg, lvl) {
  if (cfg.stock) return cfg.stock[lvl] * 1.025; // mean of the 0.75-1.3 jitter
  if (cfg.stock5 && lvl === 4) return cfg.stock5 * 0.6 * 1.05; // granted 60% of the time
  return 0;
}
const modeledTc = (cfg, lvl, base) => base * expectedPremium(cfg.clear) * (1 + 0.8 * cfg.bonus[lvl]) + expectedStock(cfg, lvl);

// Returns a copy of cfg whose base ladder reproduces the calibration targets.
function calibrated(slug, cfg) {
  const cal = CALIBRATION[slug];
  if (!cal) return cfg;
  if (cal.tc) {
    const base = cal.tc.map((tc, lvl) => {
      // Equity-heavy companies keep their stock share: scale stock with the TC target.
      const stockShare = cfg.stock ? expectedStock(cfg, lvl) / modeledTc(cfg, lvl, cfg.base[lvl]) : 0;
      return (tc * (1 - stockShare)) / (expectedPremium(cfg.clear) * (1 + 0.8 * cfg.bonus[lvl]));
    });
    const stock = cfg.stock && cal.tc.map((tc, lvl) => tc * (expectedStock(cfg, lvl) / modeledTc(cfg, lvl, cfg.base[lvl])) / 1.025);
    return { ...cfg, base, ...(stock ? { stock } : {}) };
  }
  const anchor = cal.level != null ? modeledTc(cfg, cal.level, cfg.base[cal.level]) : (modeledTc(cfg, 1, cfg.base[1]) + modeledTc(cfg, 2, cfg.base[2])) / 2;
  const k = cal.overall / anchor;
  return { ...cfg, base: cfg.base.map((b) => b * k), ...(cfg.stock ? { stock: cfg.stock.map((x) => x * k) } : {}) };
}

// Typical Huntsville pay premium for holding (and using) a clearance, relative to uncleared.
const CLEARANCE_PREMIUM = { none: 1, 'Public Trust': 1.01, Secret: 1.04, 'Top Secret': 1.08, 'TS/SCI': 1.13, 'TS/SCI + Poly': 1.2 };

const YOE = [[0, 2], [2, 5], [5, 9], [9, 14], [14, 22]];
const LEVEL_WEIGHTS = [0.27, 0.3, 0.24, 0.13, 0.06];
// With only ten rows, random levels can land far from the calibration target, so mid-size firms
// use a fixed mix instead.
const LEVEL_SPREAD = [1, 2, 0, 1, 2, 3, 1, 2, 4, 0];
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
  for (const [slug, raw] of Object.entries(ESTIMATE_CONFIG)) {
    const cfg = calibrated(slug, raw);
    const rand = mulberry32(hash(slug));
    const between = (a, b) => a + (b - a) * rand();
    const daysAgo = () => new Date(now.getTime() - Math.floor(between(5, 540)) * 86400000);

    for (let i = 0; i < cfg.n; i++) {
      const title = cfg.roles[i % cfg.roles.length];
      let lvl = cfg.spread ? LEVEL_SPREAD[i % LEVEL_SPREAD.length] : Number(pickWeighted(rand, Object.fromEntries(LEVEL_WEIGHTS.map((w, j) => [j, w]))));
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
