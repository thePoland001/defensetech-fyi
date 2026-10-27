import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApp } from '../api.jsx';
import { Blur, CompanyLogo, Empty, SizeBadge, Spinner } from '../components/Bits.jsx';
import { PinIcon, SearchIcon } from '../components/Icons.jsx';
import { fakeMoney, money, pct, plural } from '../format.js';
import { usePageTitle } from './usePageTitle.js';

const SIZES = [['', 'All'], ['L', 'Large'], ['M', 'Mid-size'], ['S', 'Small']];

export default function Companies() {
  usePageTitle('Huntsville defense companies');
  const { companies, meta, unlocked } = useApp();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const size = params.get('size') || '';
  const tag = params.get('tag') || '';
  const area = params.get('area') || '';
  const hq = params.get('hq') === '1';
  const sort = params.get('sort') || 'data';

  const set = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const filtered = useMemo(() => {
    if (!companies) return [];
    const needle = q.toLowerCase();
    const list = companies.filter((c) =>
      (!needle || c.name.toLowerCase().includes(needle)) &&
      (!size || c.size === size) &&
      (!tag || c.tags.includes(tag)) &&
      (!area || c.area === area) &&
      (!hq || c.hq),
    );
    const sorters = {
      data: (a, b) => b.salary_count - a.salary_count || a.name.localeCompare(b.name),
      name: (a, b) => a.name.localeCompare(b.name),
      pay: (a, b) => (b.median_tc ?? -1) - (a.median_tc ?? -1) || a.name.localeCompare(b.name),
      clearance: (a, b) => (b.clearance_rate ?? -1) - (a.clearance_rate ?? -1),
    };
    return list.sort(sorters[sort] || sorters.data);
  }, [companies, q, size, tag, area, hq, sort]);

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>Huntsville defense companies</h1>
          <p className="page-sub">
            {companies ? plural(companies.length, 'company', 'companies') : '…'} with a Huntsville address, from Cummings Research Park to Redstone Gateway.
          </p>
        </div>
      </div>

      <div className="filter-bar card">
        <label className="input-icon">
          <SearchIcon size={16} />
          <input type="search" placeholder="Filter by name" value={q} onChange={(e) => set('q', e.target.value)} />
        </label>
        <div className="segmented" role="group" aria-label="Company size">
          {SIZES.map(([v, label]) => (
            <button key={v} className={size === v ? 'active' : ''} onClick={() => set('size', v)}>{label}</button>
          ))}
        </div>
        <select value={tag} onChange={(e) => set('tag', e.target.value)} aria-label="Focus area">
          <option value="">All focus areas</option>
          {Object.entries(meta.tags).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={area} onChange={(e) => set('area', e.target.value)} aria-label="Part of town">
          <option value="">All of Huntsville</option>
          {Object.entries(meta.areas).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={sort} onChange={(e) => set('sort', e.target.value)} aria-label="Sort">
          <option value="data">Most data</option>
          <option value="name">A–Z</option>
          <option value="clearance">Most cleared roles</option>
          {unlocked && <option value="pay">Highest median pay</option>}
        </select>
        <label className="check">
          <input type="checkbox" checked={hq} onChange={(e) => set('hq', e.target.checked ? '1' : '')} /> HQ in Huntsville
        </label>
      </div>

      {!companies ? <Spinner /> : filtered.length === 0 ? (
        <Empty title="No companies match those filters">Try clearing a filter, or add a missing company when you submit a salary.</Empty>
      ) : (
        <>
          <p className="result-count">{plural(filtered.length, 'result')}</p>
          <div className="company-grid">
            {filtered.map((c) => (
              <Link to={`/companies/${c.slug}`} className="company-card" key={c.slug}>
                <div className="cc-top">
                  <CompanyLogo name={c.name} domain={c.domain} size={44} />
                  <div className="cc-title">
                    <strong>{c.name}</strong>
                    <span className="sub"><PinIcon size={12} /> {meta.areas[c.area] || 'Huntsville'}{c.hq ? ' · HQ' : ''}</span>
                  </div>
                </div>
                <div className="cc-tags">
                  <SizeBadge size={c.size} />
                  {c.user_added && <span className="badge soft">Community added</span>}
                  {c.tags.slice(0, 3).map((t) => <span className="tag" key={t}>{meta.tags[t] || t}</span>)}
                </div>
                <div className="cc-foot">
                  {c.salary_count > 0 ? (
                    <>
                      <span><strong>{c.salary_count}</strong> data points</span>
                      {c.ft_count > 0 && <span>Median <strong><Blur>{money(c.median_tc ?? fakeMoney(c.slug))}</Blur></strong></span>}
                      {c.clearance_rate !== null && <span><strong>{pct(c.clearance_rate)}</strong> cleared</span>}
                    </>
                  ) : (
                    <span className="muted">No salaries yet. Be the first.</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
