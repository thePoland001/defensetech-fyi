import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi, useUnlock } from '../api.jsx';
import { Bar, Blur, ClearanceBadge, CompanyLogo, SizeBadge, Spinner } from '../components/Bits.jsx';
import { fakeMoney, money, pct } from '../format.js';
import EstimateNotice from '../components/EstimateNotice.jsx';
import { usePageTitle } from './usePageTitle.js';

const LEVEL_INFO = {
  None: 'No clearance needed. Common in commercial-facing, unclassified, or ITAR-only roles.',
  'Public Trust': 'A suitability check for positions of trust, not a security clearance. Common on federal IT and NASA work.',
  Secret: 'The workhorse clearance in Huntsville. Investigated every ~10 years, often obtainable in a few months with an interim.',
  'Top Secret': 'A deeper investigation for access to TS information, reinvestigated more often.',
  'TS/SCI': 'Top Secret plus Sensitive Compartmented Information access, typical for intelligence and some missile defense programs.',
  'TS/SCI + Poly': 'TS/SCI with a counterintelligence or full-scope polygraph. The scarcest and highest-premium tier.',
};

export default function Clearances() {
  usePageTitle('Security clearances');
  const { data, loading } = useApi('/clearances');
  const { unlocked } = useUnlock();
  const [sort, setSort] = useState('clearance_rate');

  const companies = useMemo(() => {
    const list = (data?.companies || []).filter((c) => c.ft_n >= 3);
    return list.sort((a, b) => (b[sort] ?? -1) - (a[sort] ?? -1) || b.ft_n - a.ft_n);
  }, [data, sort]);
  const levelTotal = data?.byLevel.reduce((s, r) => s + r.n, 0) || 0;
  const noneMedian = data?.byLevel.find((r) => r.level === 'None')?.median_tc;

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>Security clearances in Huntsville</h1>
          <p className="page-sub">How often Huntsville defense roles require a clearance, who pays to get you one, and what each level is worth.</p>
        </div>
      </div>

      {data && <EstimateNotice companies={data.companies} field="ft" />}

      <section className="card">
        <h2>Clearance levels & pay</h2>
        <p className="card-sub">Full-time roles by required clearance, with median total compensation.</p>
        {loading ? <Spinner /> : (
          <div className="clearance-levels">
            {data.byLevel.map((r) => (
              <div className="cl-row" key={r.level}>
                <div className="cl-head">
                  <ClearanceBadge level={r.level === 'None' ? null : r.level} />
                  <span className="sub">{pct(r.n / levelTotal)} of roles</span>
                </div>
                <p>{LEVEL_INFO[r.level]}</p>
                <div className="cl-pay">
                  <span className="stat-label">Median total comp</span>
                  <strong><Blur>{money(r.median_tc ?? fakeMoney(r.level))}</Blur></strong>
                  {unlocked && noneMedian && r.level !== 'None' && r.median_tc && (
                    <span className={`delta ${r.median_tc >= noneMedian ? 'up' : 'down'}`}>
                      {r.median_tc >= noneMedian ? '+' : '−'}{money(Math.abs(r.median_tc - noneMedian))} vs. uncleared
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {unlocked && <p className="card-foot muted">Deltas compare raw medians across all companies and aren't adjusted for role, level or employer mix.</p>}
        {!unlocked && <p className="inline-unlock"><Link to="/add-salary">Add your salary</Link> to see the pay premium for each clearance level.</p>}
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Clearances by company</h2>
          <div className="segmented small">
            <button className={sort === 'clearance_rate' ? 'active' : ''} onClick={() => setSort('clearance_rate')}>Roles cleared</button>
            <button className={sort === 'ft_sponsor_rate' ? 'active' : ''} onClick={() => setSort('ft_sponsor_rate')}>Company sponsored</button>
            <button className={sort === 'tssci_rate' ? 'active' : ''} onClick={() => setSort('tssci_rate')}>TS/SCI share</button>
          </div>
        </div>
        <p className="card-sub">Companies with at least 3 full-time data points. "Company sponsored" is the share of cleared hires whose clearance the company processed.</p>
        {loading ? <Spinner /> : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th className="num">Data points</th>
                  <th>Roles requiring clearance</th>
                  <th>Company sponsored</th>
                  <th className="num">TS/SCI share</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c.slug}>
                    <td>
                      <div className="cell-company">
                        <CompanyLogo name={c.name} domain={c.domain} size={28} />
                        <Link to={`/companies/${c.slug}`} className="strong-link">{c.name}</Link>
                        <SizeBadge size={c.size} />
                      </div>
                    </td>
                    <td className="num">{c.ft_n}{c.ft_est === c.ft_n && <span className="sub">estimates</span>}</td>
                    <td><div className="bar-cell"><Bar value={c.clearance_rate ?? 0} /><strong>{pct(c.clearance_rate)}</strong></div></td>
                    <td><div className="bar-cell"><Bar value={c.ft_sponsor_rate ?? 0} tone="green" /><strong>{pct(c.ft_sponsor_rate)}</strong></div></td>
                    <td className="num">{pct(c.tssci_rate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
