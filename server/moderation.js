import crypto from 'node:crypto';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { query, transaction } from './db.js';
import { hashIp } from './token.js';
import { FLAG_REASONS } from '../shared/options.js';

// Community reports, a self-serve "delete my submission", and an admin queue.
//
// Admin routes exist only when ADMIN_TOKEN is set. The admin page sends it in the
// X-Admin-Token header; there are no admin accounts or sessions to manage.


// Distinct reporters needed before an entry is hidden pending review.
const AUTO_HIDE_FLAGS = 3;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

const asyncRoute = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const flagLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Too many reports. Try again later.' } });
const adminLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 120, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Too many requests.' } });

function requireAdmin(req, res, next) {
  if (!ADMIN_TOKEN) return res.status(404).json({ error: 'Not found' });
  const given = Buffer.from(String(req.get('x-admin-token') || ''));
  const expected = Buffer.from(ADMIN_TOKEN);
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) {
    return res.status(401).json({ error: 'Wrong admin token.' });
  }
  next();
}

const ADMIN_SALARY_SELECT = `SELECT s.id, s.title, s.level, s.level_name, s.employment_type, s.years_exp, s.base, s.bonus,
    s.stock, s.hourly, s.total_comp, s.clearance_level, s.notes, s.specialization, s.hidden, s.reviewed, s.created_at,
    c.name AS company_name, c.slug AS company_slug, c.user_added AS company_user_added,
    (SELECT COUNT(*)::int FROM flags f WHERE f.salary_id = s.id) AS flag_count
  FROM salaries s JOIN companies c ON c.id = s.company_id`;

export function registerModeration(app) {
  // ----------------------------------------------------------------- public

  app.post('/api/salaries/:id/flag', flagLimiter, asyncRoute(async (req, res) => {
    if (!req.unlock) return res.status(403).json({ error: 'Add a salary first to report entries.' });
    const id = Number(req.params.id);
    const reason = String(req.body?.reason || '');
    if (!FLAG_REASONS[reason]) return res.status(400).json({ error: 'Pick a reason.' });
    const details = String(req.body?.details || '').trim().slice(0, 300);

    const { rows: [row] } = await query(`SELECT id, source, reviewed FROM salaries WHERE id=$1`, [id]);
    if (!row) return res.status(404).json({ error: 'Entry not found.' });
    if (row.source !== 'user') return res.status(400).json({ error: 'Baseline estimates can\'t be reported.' });

    await query(
      `INSERT INTO flags (salary_id, reason, details, ip_hash) VALUES ($1,$2,$3,$4) ON CONFLICT (salary_id, ip_hash) DO NOTHING`,
      [id, reason, details, hashIp(req.ip)],
    );
    // Anything an admin already approved stays up; otherwise enough reports hide it for review.
    const { rows: [{ n }] } = await query(`SELECT COUNT(*)::int AS n FROM flags WHERE salary_id=$1`, [id]);
    if (!row.reviewed && n >= AUTO_HIDE_FLAGS) await query(`UPDATE salaries SET hidden=TRUE WHERE id=$1`, [id]);
    res.json({ ok: true });
  }));

  app.get('/api/me/submission', asyncRoute(async (req, res) => {
    if (!req.unlock) return res.json({ submission: null });
    const { rows: [row] } = await query(
      `SELECT s.id, s.title, s.employment_type, c.name AS company_name FROM salaries s JOIN companies c ON c.id=s.company_id
       WHERE s.id=$1 AND s.source='user'`,
      [req.unlock.sid],
    );
    res.json({ submission: row || null });
  }));

  // Lets a contributor take their own entry down. They stay unlocked: they did contribute.
  app.delete('/api/me/submission', asyncRoute(async (req, res) => {
    if (!req.unlock) return res.status(403).json({ error: 'No submission found for this browser.' });
    const { rowCount } = await query(`DELETE FROM salaries WHERE id=$1 AND source='user'`, [req.unlock.sid]);
    res.json({ ok: true, deleted: rowCount > 0 });
  }));

  // ----------------------------------------------------------------- admin

  const admin = express.Router();
  admin.use(adminLimiter, requireAdmin);

  admin.get('/queue', asyncRoute(async (_req, res) => {
    const [{ rows: flagged }, { rows: flags }, { rows: recent }, { rows: companies }, { rows: [totals] }] = await Promise.all([
      query(`${ADMIN_SALARY_SELECT} WHERE s.source='user' AND EXISTS (SELECT 1 FROM flags f WHERE f.salary_id=s.id) AND NOT s.reviewed
        ORDER BY s.hidden DESC, flag_count DESC, s.created_at DESC LIMIT 100`),
      query(`SELECT salary_id, reason, details, created_at FROM flags ORDER BY created_at DESC LIMIT 500`),
      query(`${ADMIN_SALARY_SELECT} WHERE s.source='user' ORDER BY s.created_at DESC LIMIT 50`),
      query(`SELECT c.id, c.name, c.slug, c.created_at, COUNT(s.id)::int AS salary_count
        FROM companies c LEFT JOIN salaries s ON s.company_id=c.id WHERE c.user_added
        GROUP BY c.id ORDER BY c.created_at DESC LIMIT 100`),
      query(`SELECT COUNT(*) FILTER (WHERE source='user')::int AS user_salaries,
          COUNT(*) FILTER (WHERE source='user' AND hidden)::int AS hidden,
          (SELECT COUNT(*)::int FROM flags) AS flags,
          (SELECT COUNT(*)::int FROM companies WHERE user_added) AS user_companies
        FROM salaries`),
    ]);
    const byId = {};
    for (const f of flags) (byId[f.salary_id] ||= []).push(f);
    res.json({ totals, flagged: flagged.map((s) => ({ ...s, flags: byId[s.id] || [] })), recent, companies, reasons: FLAG_REASONS });
  }));

  admin.post('/salaries/:id', asyncRoute(async (req, res) => {
    const id = Number(req.params.id);
    const action = req.body?.action;
    if (action === 'approve') {
      // Approved entries are visible and immune to further auto-hiding; their reports are cleared.
      await transaction(async (q) => {
        await q(`UPDATE salaries SET hidden=FALSE, reviewed=TRUE WHERE id=$1`, [id]);
        await q(`DELETE FROM flags WHERE salary_id=$1`, [id]);
      });
    } else if (action === 'hide' || action === 'show') {
      await query(`UPDATE salaries SET hidden=$2 WHERE id=$1`, [id, action === 'hide']);
    } else {
      return res.status(400).json({ error: 'Unknown action.' });
    }
    res.json({ ok: true });
  }));

  admin.delete('/salaries/:id', asyncRoute(async (req, res) => {
    const { rowCount } = await query(`DELETE FROM salaries WHERE id=$1 AND source='user'`, [Number(req.params.id)]);
    res.json({ ok: true, deleted: rowCount > 0 });
  }));

  // Only community-added companies can be removed; the seeded directory is managed in code.
  admin.delete('/companies/:id', asyncRoute(async (req, res) => {
    const { rowCount } = await query(`DELETE FROM companies WHERE id=$1 AND user_added`, [Number(req.params.id)]);
    res.json({ ok: true, deleted: rowCount > 0 });
  }));

  // Everything that isn't regenerated from code: community salaries, companies and reports.
  admin.get('/export', asyncRoute(async (_req, res) => {
    res.setHeader('Content-Disposition', `attachment; filename="defensetech-backup-${new Date().toISOString().slice(0, 10)}.json"`);
    res.json(await exportData());
  }));

  app.use('/api/admin', admin);
}

export async function exportData() {
  const [{ rows: companies }, { rows: salaries }, { rows: flags }] = await Promise.all([
    query(`SELECT slug, name, size, tags, area, hq, description, domain, created_at FROM companies WHERE user_added ORDER BY id`),
    query(`SELECT s.*, c.slug AS company_slug FROM salaries s JOIN companies c ON c.id=s.company_id WHERE s.source='user' ORDER BY s.id`),
    query(`SELECT f.*, s.created_at AS salary_created_at FROM flags f JOIN salaries s ON s.id=f.salary_id ORDER BY f.id`),
  ]);
  return {
    format: 'defensetech-backup',
    version: 1,
    exported_at: new Date().toISOString(),
    companies,
    salaries: salaries.map(({ id, company_id, ...rest }) => ({ ...rest, old_id: id })),
    flags: flags.map(({ id, ...rest }) => rest),
  };
}
