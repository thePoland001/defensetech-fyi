import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { levelLabel, typeLabel } from '../../../shared/options.js';
import { Empty, Spinner } from '../components/Bits.jsx';
import { hourly, money, monthYear, plural } from '../format.js';
import { usePageTitle } from './usePageTitle.js';

// Moderation queue. Not linked from the site; reach it at /admin with the ADMIN_TOKEN from
// the server's environment. The token is kept in this tab's sessionStorage only.

const TOKEN_KEY = 'dtfyi_admin_token';

function readToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

async function adminFetch(token, path, { method = 'GET', body } = {}) {
  const res = await fetch(`/api/admin${path}`, {
    method,
    headers: { 'X-Admin-Token': token, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw Object.assign(new Error(data.error || `Request failed (${res.status})`), { status: res.status });
  }
  return res;
}

function pay(s) {
  return s.employment_type === 'full_time' ? money(s.total_comp) : hourly(s.hourly);
}

function EntryRow({ s, reasons, onAction, showFlags }) {
  return (
    <tr className={s.hidden ? 'is-hidden' : ''}>
      <td>
        <div className="cell-stack">
          <strong>{s.company_name}</strong>
          <span className="sub">
            {s.title} · {s.employment_type === 'full_time' ? `${levelLabel(s.level)}${s.level_name ? ` (${s.level_name})` : ''} · ${s.years_exp} yrs` : typeLabel(s.employment_type)}
          </span>
          <span className="row-badges">
            {s.hidden && <span className="badge clr-poly">Hidden</span>}
            {s.reviewed && <span className="badge soft">Approved</span>}
            {s.company_user_added && <span className="badge soft">New company</span>}
            <span className="sub">#{s.id} · {monthYear(s.created_at)}</span>
          </span>
          {s.notes && <span className="note">“{s.notes}”</span>}
        </div>
      </td>
      <td className="num">
        <strong>{pay(s)}</strong>
        {s.employment_type === 'full_time' && <span className="sub">{money(s.base)} base</span>}
      </td>
      {showFlags && (
        <td>
          {s.flags.map((f, i) => (
            <div key={i} className="admin-flag">
              <strong>{reasons[f.reason] || f.reason}</strong>
              {f.details && <span className="sub">“{f.details}”</span>}
            </div>
          ))}
        </td>
      )}
      <td className="admin-actions">
        {showFlags && <button className="btn btn-primary btn-sm" onClick={() => onAction(s, 'approve')}>Approve</button>}
        <button className="btn btn-ghost btn-sm" onClick={() => onAction(s, s.hidden ? 'show' : 'hide')}>{s.hidden ? 'Unhide' : 'Hide'}</button>
        <button className="btn btn-ghost btn-sm danger" onClick={() => onAction(s, 'delete')}>Delete</button>
      </td>
    </tr>
  );
}

export default function Admin() {
  usePageTitle('Admin');
  const [token, setToken] = useState(readToken);
  const [input, setInput] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setBusy(true);
    try {
      const res = await adminFetch(token, '/queue');
      setData(await res.json());
      setError('');
    } catch (err) {
      setError(err.message);
      if (err.status === 401 || err.status === 404) {
        setToken('');
        try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* storage unavailable */ }
      }
    } finally {
      setBusy(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  function signIn(e) {
    e.preventDefault();
    try { sessionStorage.setItem(TOKEN_KEY, input.trim()); } catch { /* storage unavailable */ }
    setToken(input.trim());
  }

  async function onAction(s, action) {
    if (action === 'delete' && !window.confirm(`Delete entry #${s.id} (${s.company_name}, ${s.title}) permanently?`)) return;
    try {
      if (action === 'delete') await adminFetch(token, `/salaries/${s.id}`, { method: 'DELETE' });
      else await adminFetch(token, `/salaries/${s.id}`, { method: 'POST', body: { action } });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteCompany(c) {
    const note = c.salary_count ? ` and its ${plural(c.salary_count, 'entry', 'entries')}` : '';
    if (!window.confirm(`Delete "${c.name}"${note} permanently?`)) return;
    try {
      await adminFetch(token, `/companies/${c.id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function downloadBackup() {
    try {
      const res = await adminFetch(token, '/export');
      const url = URL.createObjectURL(await res.blob());
      const a = Object.assign(document.createElement('a'), { href: url, download: `defensetech-backup-${new Date().toISOString().slice(0, 10)}.json` });
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    }
  }

  if (!token) {
    return (
      <div className="container page narrow">
        <form className="card admin-login" onSubmit={signIn}>
          <h1>Admin</h1>
          <p className="card-sub">Enter the <code>ADMIN_TOKEN</code> from the server's environment variables.</p>
          {error && <p className="field-error">{error}</p>}
          <div className="field">
            <input type="password" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Admin token" autoFocus />
          </div>
          <button className="btn btn-primary" disabled={!input.trim()}>Open moderation queue</button>
        </form>
      </div>
    );
  }

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>Moderation</h1>
          <p className="page-sub">Reported entries, recent submissions and community-added companies. <Link to="/">Back to the site</Link></p>
        </div>
        <div className="admin-head-actions">
          <button className="btn btn-ghost btn-sm" onClick={load} disabled={busy}>Refresh</button>
          <button className="btn btn-ghost btn-sm" onClick={downloadBackup}>Download backup</button>
          <button className="btn btn-ghost btn-sm" onClick={() => { try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* storage unavailable */ } setToken(''); setData(null); }}>Sign out</button>
        </div>
      </div>
      {error && <div className="notice">{error}</div>}
      {!data ? <Spinner /> : (
        <>
          <div className="stat-grid">
            <div className="stat"><span className="stat-label">Community entries</span><span className="stat-value">{data.totals.user_salaries}</span></div>
            <div className="stat"><span className="stat-label">Hidden</span><span className="stat-value">{data.totals.hidden}</span></div>
            <div className="stat"><span className="stat-label">Open reports</span><span className="stat-value">{data.totals.flags}</span></div>
            <div className="stat"><span className="stat-label">Community companies</span><span className="stat-value">{data.totals.user_companies}</span></div>
          </div>

          <section className="card">
            <h2>Reported</h2>
            <p className="card-sub">Entries with 3 or more reports are hidden automatically until you approve or delete them.</p>
            {data.flagged.length === 0 ? <Empty title="Nothing reported" /> : (
              <div className="table-wrap">
                <table className="data-table admin-table">
                  <thead><tr><th>Entry</th><th className="num">Pay</th><th>Reports</th><th /></tr></thead>
                  <tbody>{data.flagged.map((s) => <EntryRow key={s.id} s={s} reasons={data.reasons} onAction={onAction} showFlags />)}</tbody>
                </table>
              </div>
            )}
          </section>

          <section className="card">
            <h2>Latest submissions</h2>
            {data.recent.length === 0 ? <Empty title="No community submissions yet" /> : (
              <div className="table-wrap">
                <table className="data-table admin-table">
                  <thead><tr><th>Entry</th><th className="num">Pay</th><th /></tr></thead>
                  <tbody>{data.recent.map((s) => <EntryRow key={s.id} s={s} reasons={data.reasons} onAction={onAction} />)}</tbody>
                </table>
              </div>
            )}
          </section>

          <section className="card">
            <h2>Community-added companies</h2>
            <p className="card-sub">Companies people typed in when submitting. To keep one permanently, add it to <code>server/data/companies.js</code>.</p>
            {data.companies.length === 0 ? <Empty title="None yet" /> : (
              <div className="table-wrap">
                <table className="data-table admin-table">
                  <thead><tr><th>Company</th><th className="num">Entries</th><th>Added</th><th /></tr></thead>
                  <tbody>
                    {data.companies.map((c) => (
                      <tr key={c.id}>
                        <td><Link to={`/companies/${c.slug}`} className="strong-link">{c.name}</Link></td>
                        <td className="num">{c.salary_count}</td>
                        <td>{monthYear(c.created_at)}</td>
                        <td className="admin-actions"><button className="btn btn-ghost btn-sm danger" onClick={() => deleteCompany(c)}>Delete</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
