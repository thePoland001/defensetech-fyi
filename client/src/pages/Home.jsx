import { Link } from 'react-router-dom';
import { useApi, useApp, useUnlock } from '../api.jsx';
import { Bar, Blur, CompanyLogo, Locked, SizeBadge, Spinner } from '../components/Bits.jsx';
import CompanySearch from '../components/CompanySearch.jsx';
import { ArrowRight, PlusIcon } from '../components/Icons.jsx';
import SalaryTable, { FakeSalaryRows } from '../components/SalaryTable.jsx';
import { fakeMoney, money, pct } from '../format.js';
import { usePageTitle } from './usePageTitle.js';

const QUICK = [
  ['lockheed-martin', 'Lockheed Martin'],
  ['dynetics-leidos', 'Dynetics'],
  ['torch-technologies', 'Torch'],
  ['anduril-industries', 'Anduril'],
  ['palantir-technologies', 'Palantir'],
  ['peopletec', 'PeopleTec'],
  ['northrop-grumman', 'Northrop Grumman'],
  ['blue-origin', 'Blue Origin'],
];

export default function Home() {
  usePageTitle(null);
  const { data, loading } = useApi('/stats');
  const { companies } = useApp();
  const { unlocked } = useUnlock();
  const t = data?.totals;

  const sizeCounts = { L: 0, M: 0, S: 0 };
  companies?.forEach((c) => (sizeCounts[c.size] = (sizeCounts[c.size] || 0) + 1));
  const maxTitle = Math.max(...(data?.topTitles || []).map((r) => r.median_tc || 0), 1);

  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <span className="eyebrow">Huntsville, Alabama · The Rocket City</span>
          <h1>Defense pay, out in the open.</h1>
          <p className="hero-sub">
            Salaries, clearance requirements and intern clearance sponsorship at {t ? Math.floor(t.companies / 50) * 50 : 300}+ defense companies in Huntsville,
            from the primes on Explorer Boulevard to the small businesses that keep Redstone running.
          </p>
          <CompanySearch variant="hero" placeholder="Search a company, e.g. Torch, Dynetics, Lockheed…" />
          <div className="quick-chips">
            <span>Popular:</span>
            {QUICK.map(([slug, name]) => (
              <Link key={slug} to={`/companies/${slug}`} className="chip">{name}</Link>
            ))}
          </div>
        </div>
      </section>

      <div className="container page">
        <div className="stat-grid">
          <div className="stat">
            <span className="stat-label">Companies tracked</span>
            <span className="stat-value">{t ? t.companies : '—'}</span>
            <span className="stat-foot">Large, mid-size and small</span>
          </div>
          <div className="stat">
            <span className="stat-label">Median total comp</span>
            <span className="stat-value"><Blur>{money(t?.median_tc ?? fakeMoney('median'))}</Blur></span>
            <span className="stat-foot">Full-time roles in Huntsville</span>
          </div>
          <div className="stat">
            <span className="stat-label">Roles requiring a clearance</span>
            <span className="stat-value">{pct(t?.clearance_rate)}</span>
            <span className="stat-foot">Of full-time salaries reported</span>
          </div>
          <div className="stat">
            <span className="stat-label">Interns sponsored for a clearance</span>
            <span className="stat-value">{pct(t?.intern_sponsor_rate)}</span>
            <span className="stat-foot">Of {t ? t.internships : '—'} internship reports</span>
          </div>
        </div>

        {!unlocked && (
          <div className="callout callout-green">
            <div>
              <strong>Give a salary, get every salary.</strong>
              <p>Salary data unlocks after you anonymously share your own pay, internship or offer. It takes about 60 seconds, no account or email needed.</p>
            </div>
            <Link to="/add-salary" className="btn btn-dark">Add your salary <ArrowRight size={16} /></Link>
          </div>
        )}

        <div className="grid-2">
          <section className="card">
            <div className="card-head">
              <h2>Top paying companies</h2>
              <Link to="/companies" className="head-link">All companies <ArrowRight size={14} /></Link>
            </div>
            <p className="card-sub">
              {unlocked ? 'Median full-time total compensation, minimum 5 data points.' : 'Add a salary to see the ranking. Shown here in order of data points.'}
            </p>
            {loading ? <Spinner /> : (
              <ol className="rank-list">
                {data?.topCompanies.map((c, i) => (
                  <li key={c.slug}>
                    <span className="rank">{unlocked ? i + 1 : '·'}</span>
                    <CompanyLogo name={c.name} domain={c.domain} size={30} />
                    <Link to={`/companies/${c.slug}`} className="rank-name">{c.name}</Link>
                    <span className="rank-value"><Blur>{money(c.median_tc ?? fakeMoney(c.slug))}</Blur></span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="card">
            <div className="card-head">
              <h2>Who sponsors intern clearances</h2>
              <Link to="/internships" className="head-link">Internships <ArrowRight size={14} /></Link>
            </div>
            <p className="card-sub">Share of internship reports where the company started a clearance.</p>
            {loading ? <Spinner /> : (
              <ol className="rank-list">
                {data?.topInternSponsors.map((c, i) => (
                  <li key={c.slug}>
                    <span className="rank">{i + 1}</span>
                    <CompanyLogo name={c.name} domain={c.domain} size={30} />
                    <Link to={`/companies/${c.slug}`} className="rank-name">{c.name}</Link>
                    <span className="rank-bar"><Bar value={c.rate} tone="green" /></span>
                    <span className="rank-value">{pct(c.rate)}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <section className="card">
          <div className="card-head">
            <h2>Median pay by job family</h2>
            <Link to="/salaries" className="head-link">Browse salaries <ArrowRight size={14} /></Link>
          </div>
          <div className="title-bars">
            {data?.topTitles.map((r) => (
              <Link to={`/salaries?title=${encodeURIComponent(r.title)}`} className="title-bar" key={r.title}>
                <span className="tb-name">{r.title}</span>
                <span className={`tb-track ${unlocked ? '' : 'blur-text'}`}><Bar value={r.median_tc ?? fakeMoney(r.title, 60_000, 150_000)} max={unlocked ? maxTitle : 160_000} /></span>
                <span className="tb-value"><Blur>{money(r.median_tc ?? fakeMoney(r.title))}</Blur></span>
              </Link>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Recently added</h2>
            <Link to="/salaries" className="head-link">View all <ArrowRight size={14} /></Link>
          </div>
          <Locked count={t?.salaries}>
            {unlocked && data?.recent?.length ? <SalaryTable rows={data.recent} /> : <FakeSalaryRows n={5} />}
          </Locked>
        </section>

        <section>
          <h2 className="section-title">Browse by company size</h2>
          <div className="size-grid">
            {[
              ['S', 'Small businesses', 'Fewer than ~500 people. SETA shops, 8(a)s, and startups across Research Park.'],
              ['M', 'Mid-size', 'Huntsville mainstays like Torch, PeopleTec, COLSA and Radiance, plus national firms with big local offices.'],
              ['L', 'Large & primes', 'Lockheed, Northrop, Boeing, RTX, Leidos, plus newer defense tech like Anduril and Palantir.'],
            ].map(([size, title, desc]) => (
              <Link key={size} to={`/companies?size=${size}`} className="size-card">
                <SizeBadge size={size} />
                <strong>{title}</strong>
                <p>{desc}</p>
                <span className="size-count">{sizeCounts[size] || '—'} companies <ArrowRight size={14} /></span>
              </Link>
            ))}
          </div>
        </section>

        <div className="callout callout-blue">
          <div>
            <strong>Don't see your company?</strong>
            <p>Add it when you submit your salary and it shows up in the directory right away.</p>
          </div>
          <Link to="/add-salary" className="btn btn-primary"><PlusIcon size={16} /> Add salary</Link>
        </div>
      </div>
    </>
  );
}
