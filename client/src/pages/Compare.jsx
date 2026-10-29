import { Link, useSearchParams } from 'react-router-dom';
import { JOB_FAMILIES, LEVELS } from '../../../shared/options.js';
import { useApi, useUnlock } from '../api.jsx';
import { Blur, CompanyLogo, EstimateBadge, SizeBadge } from '../components/Bits.jsx';
import CompanySearch from '../components/CompanySearch.jsx';
import { XIcon } from '../components/Icons.jsx';
import { fakeMoney, hourly, money, pct } from '../format.js';
import { usePageTitle } from './usePageTitle.js';

const SLOTS = ['a', 'b', 'c'];

// Side-by-side view of up to three companies: pay by title and level, clearances, interns.
export default function Compare() {
  const [params, setParams] = useSearchParams();
  const { unlocked } = useUnlock();
  const slugs = SLOTS.map((k) => params.get(k) || '');
  // A fixed number of hooks; empty slots skip their fetch.
  const results = [useApi(slugs[0] ? `/companies/${slugs[0]}` : null), useApi(slugs[1] ? `/companies/${slugs[1]}` : null), useApi(slugs[2] ? `/companies/${slugs[2]}` : null)];
  const cols = slugs.map((slug, i) => (slug && results[i].data ? results[i].data : null));
  const filled = cols.filter(Boolean);
  usePageTitle(filled.length ? `Compare ${filled.map((c) => c.company.name).join(' vs. ')}` : 'Compare companies');

  const setSlot = (i, slug) => {
    const next = new URLSearchParams(params);
    if (slug) next.set(SLOTS[i], slug);
    else next.delete(SLOTS[i]);
    // Keep filled slots packed to the left.
    const packed = SLOTS.map((k) => next.get(k)).filter(Boolean);
    SLOTS.forEach((k, j) => (packed[j] ? next.set(k, packed[j]) : next.delete(k)));
    setParams(next, { replace: true });
  };

  // One empty slot after the chosen companies, so there's always room to add another.
  const visibleSlots = Math.min(SLOTS.length, slugs.filter(Boolean).length + 1);
  const shown = cols.slice(0, visibleSlots);

  const median = (c, title, level) => c?.roles.find((r) => r.title === title)?.levels.find((l) => l.level === level);
  const rows = [];
  for (const title of JOB_FAMILIES) {
    const levels = LEVELS.map((l) => l.value).filter((lv) => filled.some((c) => median(c, title, lv)));
    if (levels.length) rows.push({ title, levels });
  }
  const estimated = (c) => c && c.counts.ft_count > 0 && c.counts.ft_estimate_count === c.counts.ft_count;
  const cleared = (c) => {
    const total = c.clearance.reduce((s, r) => s + r.n, 0);
    return total ? c.clearance.filter((r) => r.level !== 'None').reduce((s, r) => s + r.n, 0) / total : null;
  };

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>Compare companies</h1>
          <p className="page-sub">Put up to three Huntsville employers side by side: median total comp by title and level, clearances, and internships.</p>
        </div>
      </div>

      <div className="compare-grid" style={{ '--cols': visibleSlots }}>
        <div className="compare-corner" />
        {shown.map((c, i) => (
          <div className="card compare-head" key={i}>
            {c ? (
              <>
                <button className="compare-remove" onClick={() => setSlot(i, '')} aria-label={`Remove ${c.company.name}`}><XIcon size={14} /></button>
                <CompanyLogo name={c.company.name} domain={c.company.domain} size={44} />
                <Link to={`/companies/${c.company.slug}`} className="strong-link">{c.company.name}</Link>
                <span className="compare-badges"><SizeBadge size={c.company.size} />{estimated(c) && <EstimateBadge />}</span>
              </>
            ) : slugs[i] && results[i].loading ? (
              <span className="muted">Loading…</span>
            ) : (
              <>
                <span className="stat-label">{i === 0 ? 'Pick a company' : 'Add a company'}</span>
                <CompanySearch variant="field" placeholder="Search companies" onSelect={(co) => co && setSlot(i, co.slug)} />
              </>
            )}
          </div>
        ))}
      </div>

      {filled.length > 0 && (
        <>
          <section className="card compare-table-card">
            <h2>Overview</h2>
            <div className="compare-grid rows" style={{ '--cols': visibleSlots }}>
              <CompareRow label="Median total comp" cols={shown} render={(c) => (c.counts.ft_count ? <Blur>{money(c.counts.median_tc ?? fakeMoney(c.company.slug))}</Blur> : '—')} />
              <CompareRow label="Full-time data points" cols={shown} render={(c) => c.counts.ft_count || '—'} />
              <CompareRow label="Roles requiring a clearance" cols={shown} render={(c) => pct(cleared(c))} />
              <CompareRow label="On a 9/80 schedule" cols={shown} render={(c) => (c.counts.ft_count ? pct(c.counts.nine_eighty / c.counts.ft_count) : '—')} />
              <CompareRow label="Intern median hourly" cols={shown} render={(c) => (c.internship.n ? <Blur>{hourly(c.internship.median_hourly ?? 27)}</Blur> : '—')} />
              <CompareRow label="Interns sponsored for a clearance" cols={shown} render={(c) => (c.internship.n ? pct(c.internship.sponsored / c.internship.n) : '—')} />
            </div>
          </section>

          <section className="card compare-table-card">
            <h2>Median total comp by title and level</h2>
            {rows.length === 0 ? <p className="muted">No full-time salary data for these companies yet.</p> : (
              <div className="compare-grid rows" style={{ '--cols': visibleSlots }}>
                {rows.map(({ title, levels }) => (
                  <TitleBlock key={title} title={title} levels={levels} cols={shown} median={median} />
                ))}
              </div>
            )}
            {!unlocked && <p className="inline-unlock"><Link to="/add-salary">Add your salary</Link> to see these numbers.</p>}
            <p className="card-foot">Levels are normalized across companies (L1 entry through L5 principal). Each cell shows the median and how many data points it's based on.</p>
          </section>
        </>
      )}
    </div>
  );
}

function CompareRow({ label, cols, render }) {
  return (
    <>
      <div className="compare-label">{label}</div>
      {cols.map((c, i) => <div className="compare-cell" key={i}>{c ? render(c) : ''}</div>)}
    </>
  );
}

function TitleBlock({ title, levels, cols, median }) {
  // Highlight the best-paying company at each level, once numbers are visible.
  return (
    <>
      <div className="compare-title">{title}</div>
      {levels.map((lv) => {
        const vals = cols.map((c) => median(c, title, lv)?.median_tc ?? null);
        const best = Math.max(...vals.filter((v) => v != null));
        return (
          <CompareRow
            key={lv}
            label={`${lv} · ${LEVELS.find((l) => l.value === lv).label}`}
            cols={cols}
            render={(c) => {
              const m = median(c, title, lv);
              if (!m) return <span className="muted">—</span>;
              const v = m.median_tc;
              return (
                <span className={v != null && v === best && vals.filter((x) => x != null).length > 1 ? 'compare-best' : ''}>
                  <Blur>{money(v ?? fakeMoney(c.company.slug + title + lv))}</Blur>
                  <span className="sub">{m.n} pts</span>
                </span>
              );
            }}
          />
        );
      })}
    </>
  );
}
