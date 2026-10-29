import express from 'express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dbEpoch, initDb, query, transaction } from './db.js';
import { COOKIE_NAME, COOKIE_OPTIONS, signUnlock, verifyUnlock, hashIp } from './token.js';
import { TAGS, AREAS, SIZES } from './data/companies.js';
import { companyPostings, familyBenchmark, postingCount } from './market.js';
import { registerModeration } from './moderation.js';
import {
  JOB_FAMILIES, LEVELS, EMPLOYMENT_TYPES, HOURLY_TYPES, CLEARANCE_LEVELS,
  WORK_ARRANGEMENTS, EDUCATION, LOCATIONS, slugify,
} from '../shared/options.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, '..', 'dist');
const PORT = Number(process.env.PORT) || 3001;

const app = express();
app.set('trust proxy', 1);
app.use(compression());
app.use(express.json({ limit: '20kb' }));
app.use(cookieParser());

// Every request learns whether the visitor has contributed (and so may see salary data).
app.use((req, _res, next) => {
  req.unlock = verifyUnlock(req.cookies?.[COOKIE_NAME], dbEpoch());
  next();
});

const asyncRoute = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const INTERN_SQL = `('intern','co_op')`;
const num = (v) => (v === null || v === undefined ? null : Number(v));

// ------------------------------------------------------------------------------- meta

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.get('/api/me', (req, res) => {
  res.json({ unlocked: Boolean(req.unlock), since: req.unlock ? new Date(req.unlock.iat).toISOString() : null });
});

app.get('/api/meta', (_req, res) => {
  res.json({ tags: TAGS, areas: AREAS, sizes: SIZES });
});

// ------------------------------------------------------------------------------- stats

app.get('/api/stats', asyncRoute(async (req, res) => {
  const unlocked = Boolean(req.unlock);
  const [{ rows: [totals] }, { rows: top }, { rows: sponsors }, { rows: titles }] = await Promise.all([
    query(`SELECT
      (SELECT COUNT(*) FROM companies)::int AS companies,
      COUNT(*)::int AS salaries,
      COUNT(*) FILTER (WHERE source='user')::int AS user_salaries,
      COUNT(*) FILTER (WHERE employment_type IN ${INTERN_SQL})::int AS internships,
      AVG(CASE WHEN clearance_required THEN 1.0 ELSE 0 END) FILTER (WHERE employment_type='full_time')::float8 AS clearance_rate,
      AVG(CASE WHEN clearance_sponsored='yes' THEN 1.0 ELSE 0 END) FILTER (WHERE employment_type IN ${INTERN_SQL})::float8 AS intern_sponsor_rate,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY total_comp) FILTER (WHERE employment_type='full_time')::float8 AS median_tc
      FROM live_salaries`),
    query(`SELECT c.slug, c.name, c.domain, c.size, COUNT(*)::int AS n,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY s.total_comp)::float8 AS median_tc
      FROM live_salaries s JOIN companies c ON c.id=s.company_id
      WHERE s.employment_type='full_time'
      GROUP BY c.id HAVING COUNT(*) >= 5 ORDER BY median_tc DESC LIMIT 10`),
    query(`SELECT c.slug, c.name, c.domain, c.size, COUNT(*)::int AS n,
      AVG(CASE WHEN s.clearance_sponsored='yes' THEN 1.0 ELSE 0 END)::float8 AS rate
      FROM live_salaries s JOIN companies c ON c.id=s.company_id
      WHERE s.employment_type IN ${INTERN_SQL}
      GROUP BY c.id HAVING COUNT(*) >= 3 ORDER BY rate DESC, n DESC LIMIT 8`),
    query(`SELECT title, COUNT(*)::int AS n,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY total_comp)::float8 AS median_tc
      FROM live_salaries WHERE employment_type='full_time'
      GROUP BY title HAVING COUNT(*) >= 5 ORDER BY median_tc DESC LIMIT 10`),
  ]);

  let recent = [];
  if (unlocked) {
    ({ rows: recent } = await query(`${SALARY_SELECT} ORDER BY s.created_at DESC LIMIT 8`));
  }

  // While locked, hide pay and don't leak the pay ranking either.
  const hidePay = (list) => (unlocked ? list : list.map((r) => ({ ...r, median_tc: null })).sort((a, b) => b.n - a.n));
  res.json({
    unlocked,
    totals: { ...totals, median_tc: unlocked ? totals.median_tc : null },
    topCompanies: hidePay(top),
    topInternSponsors: sponsors,
    topTitles: hidePay(titles),
    recent: recent.map(formatSalary),
  });
}));

// ------------------------------------------------------------------------------- companies

app.get('/api/companies', asyncRoute(async (req, res) => {
  const unlocked = Boolean(req.unlock);
  const { rows } = await query(`SELECT c.slug, c.name, c.size, c.tags, c.area, c.hq, c.domain, c.user_added,
      COUNT(s.id)::int AS salary_count,
      COUNT(s.id) FILTER (WHERE s.source='estimate')::int AS estimate_count,
      COUNT(s.id) FILTER (WHERE s.employment_type='full_time')::int AS ft_count,
      COUNT(s.id) FILTER (WHERE s.employment_type IN ${INTERN_SQL})::int AS intern_count,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY s.total_comp) FILTER (WHERE s.employment_type='full_time')::float8 AS median_tc,
      AVG(CASE WHEN s.clearance_required THEN 1.0 ELSE 0 END) FILTER (WHERE s.employment_type='full_time')::float8 AS clearance_rate,
      AVG(CASE WHEN s.clearance_sponsored='yes' THEN 1.0 ELSE 0 END) FILTER (WHERE s.employment_type IN ${INTERN_SQL})::float8 AS intern_sponsor_rate
    FROM companies c LEFT JOIN live_salaries s ON s.company_id=c.id
    GROUP BY c.id ORDER BY c.name`);
  res.json({
    unlocked,
    companies: rows.map((r) => ({
      ...r,
      tags: splitTags(r.tags),
      median_tc: unlocked ? r.median_tc : null,
      posting_count: postingCount(r.slug),
    })),
  });
}));

app.get('/api/companies/:slug', asyncRoute(async (req, res) => {
  const unlocked = Boolean(req.unlock);
  const { rows: [company] } = await query(`SELECT * FROM companies WHERE slug=$1`, [req.params.slug]);
  if (!company) return res.status(404).json({ error: 'Company not found' });
  const id = company.id;

  const [{ rows: roleRows }, { rows: clearance }, { rows: sponsorship }, { rows: [intern] }, { rows: internLevels }, { rows: [counts] }] = await Promise.all([
    query(`SELECT title, level, COUNT(*)::int AS n,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY total_comp)::float8 AS median_tc,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY base)::float8 AS median_base
      FROM live_salaries WHERE company_id=$1 AND employment_type='full_time'
      GROUP BY title, level ORDER BY title, level`, [id]),
    query(`SELECT COALESCE(clearance_level, 'None') AS level, COUNT(*)::int AS n
      FROM live_salaries WHERE company_id=$1 AND employment_type='full_time'
      GROUP BY 1 ORDER BY n DESC`, [id]),
    query(`SELECT clearance_sponsored AS value, COUNT(*)::int AS n
      FROM live_salaries WHERE company_id=$1 AND employment_type='full_time' AND clearance_required
      GROUP BY 1`, [id]),
    query(`SELECT COUNT(*)::int AS n,
        COUNT(*) FILTER (WHERE clearance_sponsored='yes')::int AS sponsored,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY hourly)::float8 AS median_hourly,
        MIN(hourly)::float8 AS min_hourly, MAX(hourly)::float8 AS max_hourly
      FROM live_salaries WHERE company_id=$1 AND employment_type IN ${INTERN_SQL}`, [id]),
    query(`SELECT clearance_level AS level, COUNT(*)::int AS n
      FROM live_salaries WHERE company_id=$1 AND employment_type IN ${INTERN_SQL} AND clearance_sponsored='yes'
      GROUP BY 1 ORDER BY n DESC`, [id]),
    query(`SELECT COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE source='user')::int AS user_count,
        COUNT(*) FILTER (WHERE source='estimate')::int AS estimate_count,
        COUNT(*) FILTER (WHERE employment_type='full_time')::int AS ft_count,
        COUNT(*) FILTER (WHERE employment_type='full_time' AND source='estimate')::int AS ft_estimate_count,
        COUNT(*) FILTER (WHERE employment_type IN ${INTERN_SQL} AND source='estimate')::int AS intern_estimate_count,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY total_comp) FILTER (WHERE employment_type='full_time')::float8 AS median_tc,
        COUNT(*) FILTER (WHERE nine_eighty AND employment_type='full_time')::int AS nine_eighty
      FROM live_salaries WHERE company_id=$1`, [id]),
  ]);

  const roles = [];
  for (const r of roleRows) {
    let role = roles.find((x) => x.title === r.title);
    if (!role) roles.push((role = { title: r.title, n: 0, levels: [] }));
    role.n += r.n;
    role.levels.push({ level: r.level, n: r.n, median_tc: unlocked ? r.median_tc : null });
  }
  roles.sort((a, b) => b.n - a.n);

  res.json({
    unlocked,
    company: { ...company, tags: splitTags(company.tags), id: undefined },
    counts: { ...counts, median_tc: unlocked ? counts.median_tc : null },
    roles,
    clearance,
    sponsorship,
    internship: {
      ...intern,
      median_hourly: unlocked ? intern.median_hourly : null,
      min_hourly: unlocked ? intern.min_hourly : null,
      max_hourly: unlocked ? intern.max_hourly : null,
      levels: internLevels,
    },
    postings: companyPostings(company.slug, unlocked),
  });
}));

// ------------------------------------------------------------------------------- market

app.get('/api/market/benchmark', (req, res) => {
  const family = String(req.query.family || '');
  if (!JOB_FAMILIES.includes(family)) return res.status(400).json({ error: 'Unknown title' });
  res.json({ unlocked: Boolean(req.unlock), ...familyBenchmark(family, Boolean(req.unlock)) });
});

// ------------------------------------------------------------------------------- clearances

app.get('/api/clearances', asyncRoute(async (req, res) => {
  const unlocked = Boolean(req.unlock);
  const [{ rows: byLevel }, { rows: companies }] = await Promise.all([
    query(`SELECT COALESCE(clearance_level, 'None') AS level, COUNT(*)::int AS n,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY total_comp)::float8 AS median_tc
      FROM live_salaries WHERE employment_type='full_time' GROUP BY 1`),
    query(`SELECT c.slug, c.name, c.domain, c.size,
        COUNT(*) FILTER (WHERE s.employment_type='full_time')::int AS ft_n,
        COUNT(*) FILTER (WHERE s.employment_type IN ${INTERN_SQL})::int AS intern_n,
        COUNT(*) FILTER (WHERE s.employment_type='full_time' AND s.source='estimate')::int AS ft_est,
        COUNT(*) FILTER (WHERE s.employment_type IN ${INTERN_SQL} AND s.source='estimate')::int AS intern_est,
        AVG(CASE WHEN s.clearance_required THEN 1.0 ELSE 0 END) FILTER (WHERE s.employment_type='full_time')::float8 AS clearance_rate,
        AVG(CASE WHEN s.clearance_sponsored='yes' THEN 1.0 ELSE 0 END) FILTER (WHERE s.employment_type='full_time' AND s.clearance_required)::float8 AS ft_sponsor_rate,
        AVG(CASE WHEN s.clearance_sponsored='yes' THEN 1.0 ELSE 0 END) FILTER (WHERE s.employment_type IN ${INTERN_SQL})::float8 AS intern_sponsor_rate,
        AVG(CASE WHEN s.clearance_level IN ('TS/SCI','TS/SCI + Poly') THEN 1.0 ELSE 0 END) FILTER (WHERE s.employment_type='full_time')::float8 AS tssci_rate,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY s.hourly) FILTER (WHERE s.employment_type IN ${INTERN_SQL})::float8 AS intern_median_hourly
      FROM live_salaries s JOIN companies c ON c.id=s.company_id
      GROUP BY c.id ORDER BY c.name`),
  ]);
  if (!unlocked) companies.forEach((c) => (c.intern_median_hourly = null));
  const order = ['None', 'Public Trust', 'Secret', 'Top Secret', 'TS/SCI', 'TS/SCI + Poly'];
  byLevel.sort((a, b) => order.indexOf(a.level) - order.indexOf(b.level));
  res.json({
    unlocked,
    byLevel: byLevel.map((r) => ({ ...r, median_tc: unlocked ? r.median_tc : null })),
    companies,
  });
}));

// ------------------------------------------------------------------------------- salaries

const SALARY_SELECT = `SELECT s.*, c.name AS company_name, c.slug AS company_slug, c.domain AS company_domain
  FROM live_salaries s JOIN companies c ON c.id=s.company_id`;

function monthStart(d) {
  const date = new Date(d);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)).toISOString();
}

function formatSalary(r) {
  return {
    id: r.id,
    company: { name: r.company_name, slug: r.company_slug, domain: r.company_domain },
    title: r.title,
    specialization: r.specialization,
    level: r.level,
    level_name: r.level_name,
    employment_type: r.employment_type,
    years_exp: r.years_exp,
    years_at_company: r.years_at_company,
    base: r.base,
    bonus: r.bonus,
    stock: r.stock,
    signing: r.signing,
    hourly: num(r.hourly),
    total_comp: num(r.total_comp),
    clearance_required: r.clearance_required,
    clearance_level: r.clearance_level,
    clearance_sponsored: r.clearance_sponsored,
    work_arrangement: r.work_arrangement,
    location_detail: r.location_detail,
    education: r.education,
    nine_eighty: r.nine_eighty,
    notes: r.notes,
    source: r.source,
    // Month precision only, so a submission can't be matched to a specific day.
    created_at: monthStart(r.created_at),
  };
}

app.get('/api/salaries', asyncRoute(async (req, res) => {
  if (!req.unlock) return res.status(403).json({ locked: true, error: 'Add your salary to unlock salary data.' });

  const where = [];
  const params = [];
  const add = (sql, value) => {
    params.push(value);
    where.push(sql.replace('?', `$${params.length}`));
  };
  const { company, title, level, type = 'full_time', clearance, q, source, sort = 'recent' } = req.query;
  if (company) add('c.slug = ?', company);
  if (title) add('s.title = ?', title);
  if (level) add('s.level = ?', level);
  if (type === 'intern') where.push(`s.employment_type IN ${INTERN_SQL}`);
  else if (type === 'full_time') where.push(`s.employment_type = 'full_time'`);
  if (clearance === 'none') where.push('NOT s.clearance_required');
  else if (clearance === 'any') where.push('s.clearance_required');
  else if (clearance) add('s.clearance_level = ?', clearance);
  if (source === 'user' || source === 'estimate') add('s.source = ?', source);
  if (q) add(`(c.name ILIKE ? OR s.title ILIKE $${params.length + 1} OR s.specialization ILIKE $${params.length + 1})`, `%${q}%`);

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const valueCol = type === 'intern' ? 's.hourly' : 's.total_comp';
  const orderSql = {
    recent: 's.created_at DESC',
    comp_desc: `${valueCol} DESC NULLS LAST`,
    comp_asc: `${valueCol} ASC NULLS LAST`,
    yoe_desc: 's.years_exp DESC',
  }[sort] || 's.created_at DESC';

  const pageSize = Math.min(Number(req.query.pageSize) || 25, 100);
  const page = Math.max(Number(req.query.page) || 1, 1);

  const [{ rows }, { rows: [summary] }] = await Promise.all([
    query(`${SALARY_SELECT} ${whereSql} ORDER BY ${orderSql}, s.id DESC LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`, params),
    query(`SELECT COUNT(*)::int AS n,
        percentile_cont(ARRAY[0.25, 0.5, 0.75, 0.9]) WITHIN GROUP (ORDER BY ${valueCol}) AS pct
      FROM live_salaries s JOIN companies c ON c.id=s.company_id ${whereSql}`, params),
  ]);

  const pct = (summary.pct || []).map(num);
  res.json({
    rows: rows.map(formatSalary),
    total: summary.n,
    page,
    pageSize,
    summary: { p25: pct[0] ?? null, p50: pct[1] ?? null, p75: pct[2] ?? null, p90: pct[3] ?? null, unit: type === 'intern' ? 'hourly' : 'annual' },
  });
}));

const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 8,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many submissions from this network. Please try again in an hour.' },
});

class ValidationError extends Error {
  constructor(field, message) {
    super(message);
    this.field = field;
  }
}

const int = (v, field, label, min, max, required = true) => {
  if ((v === '' || v === null || v === undefined) && !required) return 0;
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) throw new ValidationError(field, `${label} must be between ${min.toLocaleString()} and ${max.toLocaleString()}.`);
  return Math.round(n);
};
const str = (v, max) => String(v ?? '').trim().slice(0, max);
const oneOf = (v, list, field, label) => {
  if (!list.includes(v)) throw new ValidationError(field, `Please choose a ${label}.`);
  return v;
};

app.post('/api/salaries', submitLimiter, asyncRoute(async (req, res) => {
  const b = req.body || {};
  // Honeypot: real users never see this field.
  if (b.website) return res.json({ ok: true });

  try {
    let companyId;
    if (b.companySlug) {
      const { rows } = await query(`SELECT id FROM companies WHERE slug=$1`, [b.companySlug]);
      if (!rows[0]) throw new ValidationError('company', 'Please pick a company from the list.');
      companyId = rows[0].id;
    }
    // A new company is only created once the rest of the submission has validated (below),
    // so a rejected form never leaves an empty company behind.
    const newCompanyName = companyId ? '' : str(b.newCompanyName, 80);
    if (!companyId && newCompanyName.length < 2) throw new ValidationError('company', 'Please pick a company or add a new one.');

    const employmentType = oneOf(b.employmentType, EMPLOYMENT_TYPES.map((t) => t.value), 'employmentType', 'employment type');
    const hourlyType = HOURLY_TYPES.has(employmentType);
    const internLike = employmentType === 'intern' || employmentType === 'co_op';
    const title = oneOf(b.title, JOB_FAMILIES, 'title', 'title');
    const level = internLike ? 'Intern' : oneOf(b.level, LEVELS.map((l) => l.value), 'level', 'level');
    const yearsExp = int(b.yearsExp, 'yearsExp', 'Years of experience', 0, 50, !internLike);
    const yearsAtCompany = int(b.yearsAtCompany, 'yearsAtCompany', 'Years at company', 0, 50, false);
    if (yearsAtCompany > yearsExp) throw new ValidationError('yearsAtCompany', 'Years at company can\'t exceed total years of experience.');

    let base = 0, bonus = 0, stock = 0, signing = 0, hourly = null, totalComp = null;
    if (hourlyType) {
      const h = Number(b.hourly);
      if (!Number.isFinite(h) || h < 7.25 || h > 250) throw new ValidationError('hourly', 'Hourly rate must be between $7.25 and $250.');
      hourly = Math.round(h * 100) / 100;
    } else {
      base = int(b.base, 'base', 'Base salary', 15000, 800000);
      bonus = int(b.bonus, 'bonus', 'Annual bonus', 0, 1000000, false);
      stock = int(b.stock, 'stock', 'Stock per year', 0, 2000000, false);
      signing = int(b.signing, 'signing', 'Signing bonus', 0, 500000, false);
      totalComp = base + bonus + stock;
    }

    let clearanceRequired = false, clearanceLevel = null, sponsored = 'na';
    if (internLike) {
      sponsored = oneOf(b.clearanceSponsored, ['yes', 'no'], 'clearanceSponsored', 'clearance sponsorship answer');
      if (sponsored === 'yes') {
        clearanceRequired = true;
        clearanceLevel = oneOf(b.clearanceLevel, CLEARANCE_LEVELS, 'clearanceLevel', 'clearance level');
      }
    } else {
      clearanceRequired = b.clearanceRequired === true || b.clearanceRequired === 'yes';
      if (clearanceRequired) {
        clearanceLevel = oneOf(b.clearanceLevel, CLEARANCE_LEVELS, 'clearanceLevel', 'clearance level');
        sponsored = oneOf(b.clearanceSponsored, ['yes', 'had', 'no'], 'clearanceSponsored', 'clearance sponsorship answer');
      }
    }

    const workArrangement = oneOf(b.workArrangement || 'onsite', WORK_ARRANGEMENTS.map((w) => w.value), 'workArrangement', 'work arrangement');
    const locationDetail = LOCATIONS.includes(b.locationDetail) ? b.locationDetail : '';
    const education = EDUCATION.some((e) => e.value === b.education) ? b.education : '';

    const inserted = await transaction(async (q) => {
      if (!companyId) {
        const slug = slugify(newCompanyName);
        const { rows: existing } = await q(`SELECT id FROM companies WHERE slug=$1 OR LOWER(name)=LOWER($2)`, [slug, newCompanyName]);
        companyId = existing[0]?.id ?? (await q(
          `INSERT INTO companies (slug, name, size, description, user_added) VALUES ($1,$2,'S',$3,TRUE) RETURNING id`,
          [slug, newCompanyName, 'Added by the community. Company details have not been reviewed yet.'],
        )).rows[0].id;
      }
      const { rows: [row] } = await q(
      `INSERT INTO salaries (company_id, title, specialization, level, level_name, employment_type, years_exp, years_at_company,
        base, bonus, stock, signing, hourly, total_comp, clearance_required, clearance_level, clearance_sponsored,
        work_arrangement, location_detail, education, nine_eighty, notes, source, ip_hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,'user',$23) RETURNING id`,
      [companyId, title, str(b.specialization, 80), level, str(b.levelName, 40), employmentType, yearsExp, yearsAtCompany,
        base, bonus, stock, signing, hourly, totalComp, clearanceRequired, clearanceLevel, sponsored,
        workArrangement, locationDetail, education, Boolean(b.nineEighty), str(b.notes, 500), hashIp(req.ip)],
      );
      return row;
    });

    res.cookie(COOKIE_NAME, signUnlock(inserted.id, dbEpoch()), COOKIE_OPTIONS);
    res.json({ ok: true, id: inserted.id });
  } catch (err) {
    if (err instanceof ValidationError) return res.status(400).json({ error: err.message, field: err.field });
    throw err;
  }
}));

registerModeration(app);

// ------------------------------------------------------------------------------- static

function splitTags(tags) {
  return tags ? tags.split(' ').filter(Boolean) : [];
}

app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

if (fs.existsSync(DIST)) {
  app.use(express.static(DIST, { maxAge: '1h', index: false }));
  app.get('*', (_req, res) => res.sendFile(path.join(DIST, 'index.html')));
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

await initDb();
app.listen(PORT, () => console.log(`defensetech.fyi listening on http://localhost:${PORT}`));
