import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LEVELS } from '../../../shared/options.js';
import { useApi, useApp, useUnlock } from '../api.jsx';
import { Bar, Blur, ClearanceBadge, CompanyLogo, Empty, Locked, SizeBadge, Spinner } from '../components/Bits.jsx';
import { ArrowLeft, ArrowRight, ExternalIcon, InfoIcon, PinIcon, PlusIcon } from '../components/Icons.jsx';
import SalaryTable, { FakeSalaryRows } from '../components/SalaryTable.jsx';
import { fakeMoney, hourly, money, pct, plural } from '../format.js';
import NotFound from './NotFound.jsx';
import { usePageTitle } from './usePageTitle.js';

const SPONSOR_LABELS = { yes: 'Company sponsored', had: 'Already held one', no: 'Required before hire' };

export default function Company() {
  const { slug } = useParams();
  const { data, error, loading } = useApi(`/companies/${slug}`);
  const { meta } = useApp();
  const { unlocked } = useUnlock();
  const [tab, setTab] = useState('full_time');
  const entries = useApi(unlocked ? `/salaries?company=${slug}&type=${tab}&pageSize=50` : null);
  usePageTitle(data ? `${data.company.name} salaries` : null);

  if (error?.status === 404) return <NotFound />;
  if (loading && !data) return <div className="container page"><Spinner /></div>;
  if (!data) return <div className="container page"><Empty title="Couldn't load this company">{error?.message}</Empty></div>;

  const { company, counts, roles, clearance, sponsorship, internship } = data;
  const ftClearanceTotal = clearance.reduce((s, r) => s + r.n, 0);
  const cleared = clearance.filter((r) => r.level !== 'None').reduce((s, r) => s + r.n, 0);
  const sponsorTotal = sponsorship.reduce((s, r) => s + r.n, 0);
  const sponsoredFt = sponsorship.find((r) => r.value === 'yes')?.n || 0;
  const noData = counts.total === 0;

  return (
    <div className="container page">
      <Link to="/companies" className="back-link"><ArrowLeft size={14} /> Company directory</Link>

      <section className="card company-header">
        <CompanyLogo name={company.name} domain={company.domain} size={64} />
        <div className="ch-main">
          <h1>{company.name}</h1>
          <div className="ch-meta">
            <SizeBadge size={company.size} />
            {company.hq && <span className="badge soft">HQ in Huntsville</span>}
            {company.user_added && <span className="badge soft">Community added</span>}
            <span className="sub"><PinIcon size={13} /> {meta.areas[company.area] || 'Huntsville, AL'}</span>
            {company.domain && (
              <a href={`https://${company.domain}`} target="_blank" rel="noreferrer" className="sub link">
                {company.domain} <ExternalIcon size={12} />
              </a>
            )}
          </div>
          <p className="ch-desc">{company.description}</p>
          {company.tags.length > 0 && (
            <div className="cc-tags">
              {company.tags.map((t) => <Link to={`/companies?tag=${t}`} className="tag" key={t}>{meta.tags[t] || t}</Link>)}
            </div>
          )}
        </div>
        <Link to={`/add-salary?company=${company.slug}`} className="btn btn-primary ch-cta">
          <PlusIcon size={16} /> Add a {company.name.split(' (')[0]} salary
        </Link>
      </section>

      {noData ? (
        <div className="card empty-company">
          <h2>No salaries for {company.name} yet</h2>
          <p>Be the first to share what {company.name} pays. It's anonymous, takes about a minute, and unlocks every other salary on the site.</p>
          <Link to={`/add-salary?company=${company.slug}`} className="btn btn-primary"><PlusIcon size={16} /> Add the first salary</Link>
        </div>
      ) : (
        <>
          <div className="stat-grid">
            <div className="stat">
              <span className="stat-label">Median total comp</span>
              <span className="stat-value">{counts.ft_count ? <Blur>{money(counts.median_tc ?? fakeMoney(slug))}</Blur> : '—'}</span>
              <span className="stat-foot">{plural(counts.ft_count, 'full-time salary', 'full-time salaries')}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Roles requiring a clearance</span>
              <span className="stat-value">{ftClearanceTotal ? pct(cleared / ftClearanceTotal) : '—'}</span>
              <span className="stat-foot">{ftClearanceTotal ? `${cleared} of ${ftClearanceTotal} full-time` : 'No full-time data'}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Interns sponsored for a clearance</span>
              <span className="stat-value">{internship.n ? pct(internship.sponsored / internship.n) : '—'}</span>
              <span className="stat-foot">{plural(internship.n, 'internship report')}</span>
            </div>
            <div className="stat">
              <span className="stat-label">On a 9/80 schedule</span>
              <span className="stat-value">{counts.ft_count ? pct(counts.nine_eighty / counts.ft_count) : '—'}</span>
              <span className="stat-foot">Every other Friday off</span>
            </div>
          </div>

          {counts.estimate_count > 0 && (
            <div className="notice">
              <InfoIcon size={16} />
              <span>
                {counts.user_count > 0 ? `${plural(counts.user_count, 'community submission')} plus ` : ''}
                {plural(counts.estimate_count, 'baseline estimate')} based on publicly reported compensation for {company.name}. Estimates are labeled <span className="badge est">Estimate</span> and get outweighed as real submissions come in.
              </span>
            </div>
          )}

          {roles.length > 0 && (
            <section>
              <div className="section-head">
                <h2 className="section-title">{company.name} salaries by role</h2>
                <span className="level-legend">{LEVELS.slice(0, 5).map((l) => `${l.value} ${l.label}`).join(' · ')}</span>
              </div>
              <div className="role-grid">
                {roles.map((r) => (
                  <div className="role-card" key={r.title}>
                    <Link to={unlocked ? `/salaries?company=${slug}&title=${encodeURIComponent(r.title)}` : '/add-salary'} className="role-title">
                      {r.title} <ArrowRight size={16} />
                    </Link>
                    <div className="pills">
                      {r.levels.map((l) => (
                        <span className="pill" key={l.level} title={`${LEVELS.find((x) => x.value === l.level)?.long}, ${plural(l.n, 'data point')}`}>
                          <span className="pill-level">{l.level}</span>
                          <Blur>{money(l.median_tc ?? fakeMoney(r.title + l.level))}</Blur>
                        </span>
                      ))}
                    </div>
                    <span className="sub">{plural(r.n, 'data point')}</span>
                  </div>
                ))}
              </div>
              {!unlocked && (
                <p className="inline-unlock"><Link to={`/add-salary?company=${slug}`}>Add your salary</Link> to see these numbers.</p>
              )}
            </section>
          )}

          <div className="grid-2">
            <section className="card">
              <h2>Clearances for full-time roles</h2>
              <p className="card-sub">What clearance level reported roles required.</p>
              {ftClearanceTotal === 0 ? <p className="muted">No full-time data yet.</p> : (
                <div className="dist">
                  {clearance.map((r) => (
                    <div className="dist-row" key={r.level}>
                      <span className="dist-label"><ClearanceBadge level={r.level === 'None' ? null : r.level} /></span>
                      <Bar value={r.n} max={ftClearanceTotal} />
                      <span className="dist-value">{pct(r.n / ftClearanceTotal)}</span>
                    </div>
                  ))}
                </div>
              )}
              {sponsorTotal > 0 && (
                <>
                  <h3 className="mini-head">Who paid for the clearance?</h3>
                  <div className="dist">
                    {['yes', 'had', 'no'].map((v) => {
                      const n = sponsorship.find((r) => r.value === v)?.n || 0;
                      return (
                        <div className="dist-row" key={v}>
                          <span className="dist-label">{SPONSOR_LABELS[v]}</span>
                          <Bar value={n} max={sponsorTotal} tone={v === 'yes' ? 'green' : v === 'no' ? 'amber' : 'gray'} />
                          <span className="dist-value">{pct(n / sponsorTotal)}</span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="card-foot">{pct(sponsoredFt / sponsorTotal)} of cleared hires had their clearance sponsored by {company.name}.</p>
                </>
              )}
            </section>

            <section className="card">
              <h2>Internships</h2>
              <p className="card-sub">Pay and clearance sponsorship for interns and co-ops.</p>
              {internship.n === 0 ? (
                <p className="muted">No internship reports yet. <Link to={`/add-salary?company=${slug}&type=intern`}>Add yours</Link>.</p>
              ) : (
                <>
                  <div className="kv-grid">
                    <div><span className="stat-label">Median hourly</span><strong className="kv-value"><Blur>{hourly(internship.median_hourly ?? 27)}</Blur></strong></div>
                    <div><span className="stat-label">Range</span><strong className="kv-value"><Blur>{internship.min_hourly !== null ? `${hourly(internship.min_hourly)} – ${hourly(internship.max_hourly)}` : '$22/hr – $33/hr'}</Blur></strong></div>
                    <div><span className="stat-label">Clearance sponsored</span><strong className="kv-value">{internship.sponsored} of {internship.n}</strong></div>
                  </div>
                  <div className="dist">
                    <div className="dist-row">
                      <span className="dist-label">Sponsored</span>
                      <Bar value={internship.sponsored} max={internship.n} tone="green" />
                      <span className="dist-value">{pct(internship.sponsored / internship.n)}</span>
                    </div>
                    <div className="dist-row">
                      <span className="dist-label">Not sponsored</span>
                      <Bar value={internship.n - internship.sponsored} max={internship.n} tone="gray" />
                      <span className="dist-value">{pct((internship.n - internship.sponsored) / internship.n)}</span>
                    </div>
                  </div>
                  {internship.levels.length > 0 && (
                    <p className="card-foot">
                      Sponsored levels: {internship.levels.map((l) => `${l.level} (${l.n})`).join(', ')}
                    </p>
                  )}
                </>
              )}
            </section>
          </div>

          <section className="card">
            <div className="card-head">
              <h2>All {company.name} entries</h2>
              <div className="segmented small">
                <button className={tab === 'full_time' ? 'active' : ''} onClick={() => setTab('full_time')}>Full-time ({counts.ft_count})</button>
                <button className={tab === 'intern' ? 'active' : ''} onClick={() => setTab('intern')}>Interns ({internship.n})</button>
              </div>
            </div>
            <Locked count={counts.total}>
              {unlocked ? (
                entries.loading && !entries.data ? <Spinner /> :
                entries.data?.rows.length ? <SalaryTable rows={entries.data.rows} hideCompany mode={tab} /> :
                <Empty title="Nothing here yet" />
              ) : <FakeSalaryRows n={5} hideCompany mode={tab} />}
            </Locked>
          </section>
        </>
      )}
    </div>
  );
}
