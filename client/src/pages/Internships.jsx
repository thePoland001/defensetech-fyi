import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi, useUnlock } from '../api.jsx';
import { Bar, Blur, CompanyLogo, Locked, SizeBadge, Spinner } from '../components/Bits.jsx';
import { ArrowRight, InfoIcon } from '../components/Icons.jsx';
import SalaryTable, { FakeSalaryRows } from '../components/SalaryTable.jsx';
import { hourly, pct } from '../format.js';
import { usePageTitle } from './usePageTitle.js';

export default function Internships() {
  usePageTitle('Internships & clearance sponsorship');
  const { data, loading } = useApi('/clearances');
  const { unlocked } = useUnlock();
  const [sort, setSort] = useState('rate');
  const recent = useApi(unlocked ? '/salaries?type=intern&sort=comp_desc&pageSize=15' : null);

  const rows = useMemo(() => {
    const list = (data?.companies || []).filter((c) => c.intern_n > 0);
    return list.sort(sort === 'rate'
      ? (a, b) => b.intern_sponsor_rate - a.intern_sponsor_rate || b.intern_n - a.intern_n
      : (a, b) => b.intern_n - a.intern_n);
  }, [data, sort]);
  const internTotal = rows.reduce((s, c) => s + c.intern_n, 0);

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>Internships & intern clearance sponsorship</h1>
          <p className="page-sub">
            A clearance started during an internship is one of the most valuable things a Huntsville student can walk away with.
            Here's which companies sponsor them, and what interns get paid.
          </p>
        </div>
        <Link to="/add-salary?type=intern" className="btn btn-primary">Add your internship</Link>
      </div>

      <div className="notice">
        <InfoIcon size={16} />
        <span>"Sponsored" means the company submitted the intern's clearance paperwork (SF-86) and paid for the investigation, even if it wasn't adjudicated before the internship ended.</span>
      </div>

      <section className="card">
        <div className="card-head">
          <h2>Intern clearance sponsorship by company</h2>
          <div className="segmented small">
            <button className={sort === 'rate' ? 'active' : ''} onClick={() => setSort('rate')}>Sponsorship rate</button>
            <button className={sort === 'n' ? 'active' : ''} onClick={() => setSort('n')}>Most reports</button>
          </div>
        </div>
        {loading ? <Spinner /> : rows.length === 0 ? <p className="muted">No internship reports yet.</p> : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Company</th><th className="num">Reports</th><th>Clearance sponsored</th><th className="num">Hourly (median)</th></tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.slug}>
                    <td>
                      <div className="cell-company">
                        <CompanyLogo name={c.name} domain={c.domain} size={28} />
                        <Link to={`/companies/${c.slug}`} className="strong-link">{c.name}</Link>
                        <SizeBadge size={c.size} />
                      </div>
                    </td>
                    <td className="num">{c.intern_n}</td>
                    <td><div className="bar-cell"><Bar value={c.intern_sponsor_rate} tone="green" /><strong>{pct(c.intern_sponsor_rate)}</strong></div></td>
                    <td className="num"><Blur>{hourly(c.intern_median_hourly ?? 27)}</Blur></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Highest paying internships</h2>
          <Link to="/salaries?type=intern" className="head-link">All internships <ArrowRight size={14} /></Link>
        </div>
        <Locked count={internTotal}>
          {unlocked && recent.data ? <SalaryTable rows={recent.data.rows} mode="intern" /> : <FakeSalaryRows n={6} mode="intern" />}
        </Locked>
      </section>
    </div>
  );
}
