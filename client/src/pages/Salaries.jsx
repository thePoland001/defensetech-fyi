import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CLEARANCE_LEVELS, JOB_FAMILIES, LEVELS } from '../../../shared/options.js';
import { useApi, useApp, useUnlock } from '../api.jsx';
import { Empty, Locked, Spinner } from '../components/Bits.jsx';
import MarketBenchmark from '../components/MarketBenchmark.jsx';
import { SearchIcon } from '../components/Icons.jsx';
import SalaryTable, { FakeSalaryRows } from '../components/SalaryTable.jsx';
import { hourly, money, plural } from '../format.js';
import { usePageTitle } from './usePageTitle.js';

export default function Salaries({ defaultType = 'full_time' }) {
  const [params, setParams] = useSearchParams();
  const { unlocked } = useUnlock();
  const { companies } = useApp();
  const type = params.get('type') || defaultType;
  const intern = type === 'intern';
  usePageTitle(intern ? 'Internship pay' : 'Salaries');

  const set = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };

  const query = useMemo(() => {
    const p = new URLSearchParams(params);
    p.set('type', type);
    return `/salaries?${p.toString()}`;
  }, [params, type]);
  const { data, loading, error } = useApi(unlocked ? query : null);
  const company = companies?.find((c) => c.slug === params.get('company'));
  const totalPoints = companies?.reduce((s, c) => s + c.salary_count, 0);
  const fmt = intern ? hourly : money;
  const page = data?.page || 1;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>{company ? `${company.name} salaries` : intern ? 'Internship pay in Huntsville' : 'Huntsville defense salaries'}</h1>
          <p className="page-sub">Self-reported compensation from people working in Huntsville's defense industry, plus labeled baseline estimates for the largest employers.</p>
        </div>
      </div>

      <div className="segmented tabs-lg" role="tablist">
        <button className={!intern ? 'active' : ''} onClick={() => set('type', '')}>Full-time</button>
        <button className={intern ? 'active' : ''} onClick={() => set('type', 'intern')}>Internships & co-ops</button>
      </div>

      <div className="filter-bar card">
        <label className="input-icon">
          <SearchIcon size={16} />
          <input type="search" placeholder="Search company or title" defaultValue={params.get('q') || ''}
            onKeyDown={(e) => e.key === 'Enter' && set('q', e.currentTarget.value)}
            onBlur={(e) => e.currentTarget.value !== (params.get('q') || '') && set('q', e.currentTarget.value)} />
        </label>
        <select value={params.get('company') || ''} onChange={(e) => set('company', e.target.value)} aria-label="Company">
          <option value="">All companies</option>
          {companies?.filter((c) => c.salary_count > 0).map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        <select value={params.get('title') || ''} onChange={(e) => set('title', e.target.value)} aria-label="Title">
          <option value="">All titles</option>
          {JOB_FAMILIES.map((t) => <option key={t}>{t}</option>)}
        </select>
        {!intern && (
          <select value={params.get('level') || ''} onChange={(e) => set('level', e.target.value)} aria-label="Level">
            <option value="">All levels</option>
            {LEVELS.map((l) => <option key={l.value} value={l.value}>{l.value} · {l.label}</option>)}
          </select>
        )}
        <select value={params.get('clearance') || ''} onChange={(e) => set('clearance', e.target.value)} aria-label="Clearance">
          <option value="">Any clearance</option>
          <option value="none">{intern ? 'Not sponsored' : 'No clearance'}</option>
          <option value="any">{intern ? 'Sponsored (any level)' : 'Cleared (any level)'}</option>
          {CLEARANCE_LEVELS.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={params.get('source') || ''} onChange={(e) => set('source', e.target.value)} aria-label="Source">
          <option value="">All sources</option>
          <option value="user">Community submissions</option>
          <option value="estimate">Baseline estimates</option>
        </select>
        <select value={params.get('sort') || 'recent'} onChange={(e) => set('sort', e.target.value)} aria-label="Sort">
          <option value="recent">Most recent</option>
          <option value="comp_desc">Highest pay</option>
          <option value="comp_asc">Lowest pay</option>
          {!intern && <option value="yoe_desc">Most experience</option>}
        </select>
      </div>

      {!intern && params.get('title') && <MarketBenchmark family={params.get('title')} />}

      {!unlocked ? (
        <Locked count={totalPoints}>
          <div className="summary-bar card">
            {['25th', 'Median', '75th', '90th'].map((l) => <div key={l}><span className="stat-label">{l} percentile</span><strong>$118K</strong></div>)}
          </div>
          <div className="card"><FakeSalaryRows n={10} mode={type} /></div>
        </Locked>
      ) : loading && !data ? <Spinner /> : error ? <Empty title="Couldn't load salaries">{error.message}</Empty> : (
        <>
          <div className="summary-bar card">
            <div><span className="stat-label">Results</span><strong>{data.total.toLocaleString()}</strong></div>
            <div><span className="stat-label">25th percentile</span><strong>{fmt(data.summary.p25)}</strong></div>
            <div className="hl"><span className="stat-label">Median</span><strong>{fmt(data.summary.p50)}</strong></div>
            <div><span className="stat-label">75th percentile</span><strong>{fmt(data.summary.p75)}</strong></div>
            <div><span className="stat-label">90th percentile</span><strong>{fmt(data.summary.p90)}</strong></div>
          </div>
          {data.rows.length === 0 ? (
            <Empty title="No salaries match these filters">
              Try widening your search, or <Link to="/add-salary">add yours</Link>.
            </Empty>
          ) : (
            <div className="card table-card">
              <SalaryTable rows={data.rows} mode={type} />
              {pages > 1 && (
                <div className="pager">
                  <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => set('page', String(page - 1))}>Previous</button>
                  <span>Page {page} of {pages} · {plural(data.total, 'result')}</span>
                  <button className="btn btn-ghost btn-sm" disabled={page >= pages} onClick={() => set('page', String(page + 1))}>Next</button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
