import { useState } from 'react';
import { levelLabel } from '../../../shared/options.js';
import { fakeMoney, hourly, money, monthYear, plural } from '../format.js';
import { ClearanceBadge, Locked } from './Bits.jsx';
import { ExternalIcon } from './Icons.jsx';

const SOURCE_LABEL = { career_site: 'Career site', indeed_posting: 'Indeed' };

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

// Where a posted range sits on a shared scale, so wide and narrow bands read at a glance.
function RangeBar({ lo, hi, min, max }) {
  const span = max - min || 1;
  const left = ((lo - min) / span) * 100;
  const width = Math.max(2, ((hi - lo) / span) * 100);
  return (
    <span className="range-bar" aria-hidden="true">
      <span className="range-fill" style={{ left: `${left}%`, width: `${width}%` }} />
    </span>
  );
}

function PostingTable({ items, intern }) {
  const lo = (p) => (intern ? p.hourly_min : p.pay_min);
  const hi = (p) => (intern ? p.hourly_max : p.pay_max);
  const fmt = intern ? hourly : money;
  const min = Math.min(...items.map(lo));
  const max = Math.max(...items.map(hi));
  return (
    <div className="table-wrap">
      <table className="salary-table posting-table">
        <thead>
          <tr>
            <th>Role<span className="th-sub">Job family | Level</span></th>
            <th>Clearance<span className="th-sub">As stated on the posting</span></th>
            <th className="num">Posted range<span className="th-sub">{intern ? 'Hourly' : 'Annual base'}</span></th>
          </tr>
        </thead>
        <tbody>
          {items.map((p, i) => (
            <tr key={`${p.title}-${i}`}>
              <td className="c-level">
                <div className="cell-stack">
                  <strong>{p.title}</strong>
                  <span className="sub">{p.job_family} | {intern ? 'Internship' : levelLabel(p.level)}</span>
                  <span className="row-badges">
                    {p.pay_is_indeed_estimate && (
                      <span className="badge est" title="The employer didn't post pay; this range is Indeed's estimate.">Indeed estimate</span>
                    )}
                    <span className="sub">
                      {p.source_url ? (
                        <a href={p.source_url} target="_blank" rel="noreferrer nofollow" className="link">
                          {hostOf(p.source_url) || SOURCE_LABEL[p.source]} <ExternalIcon size={11} />
                        </a>
                      ) : SOURCE_LABEL[p.source]}
                      {p.posted_date && ` · ${monthYear(p.posted_date)}`}
                    </span>
                  </span>
                </div>
              </td>
              <td className="c-clear">
                <div className="cell-stack">
                  {p.clearance_level ? <ClearanceBadge level={p.clearance_level} /> : <span className="muted">Not stated</span>}
                </div>
              </td>
              <td className="num c-tc">
                <strong className="tc">{fmt(lo(p))} – {fmt(hi(p))}</strong>
                <RangeBar lo={lo(p)} hi={hi(p)} min={min} max={max} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function fakePostings(n, intern) {
  const titles = ['Systems Engineer', 'Software Engineer', 'Test Engineer', 'Cyber Security Engineer', 'Electrical Engineer', 'Program Manager'];
  return Array.from({ length: n }, (_, i) => {
    const lo = fakeMoney(`p${i}`, 65_000, 120_000);
    return {
      title: titles[i % titles.length],
      job_family: titles[i % titles.length],
      level: `L${(i % 4) + 1}`,
      clearance_level: i % 3 ? 'Secret' : null,
      pay_min: lo,
      pay_max: lo + 45_000,
      hourly_min: 20 + i,
      hourly_max: 28 + i,
      source: 'career_site',
      source_url: '',
      posted_date: '',
    };
  });
}

const PREVIEW_ROWS = 10;

export default function PostedRanges({ postings, companyName }) {
  const [tab, setTab] = useState(postings.ft_count ? 'full_time' : 'intern');
  const [expanded, setExpanded] = useState(false);
  if (!postings.total) return null;
  const intern = tab === 'intern';
  const items = postings.items.filter((p) => (p.employment_type === 'intern') === intern);
  const visibleCount = intern ? postings.intern_count : postings.ft_count;

  return (
    <section className="card">
      <div className="card-head">
        <h2>Posted pay ranges</h2>
        {postings.ft_count > 0 && postings.intern_count > 0 && (
          <div className="segmented small">
            <button className={!intern ? 'active' : ''} onClick={() => setTab('full_time')}>Full-time ({postings.ft_count})</button>
            <button className={intern ? 'active' : ''} onClick={() => setTab('intern')}>Interns ({postings.intern_count})</button>
          </div>
        )}
      </div>
      <p className="card-sub">
        {plural(postings.total, 'public job posting')} for {companyName} roles in Huntsville that listed pay.
        These are the employer's advertised ranges, not what anyone was paid.
      </p>
      {postings.families.length > 0 && (
        <div className="cc-tags posting-families">
          {postings.families.slice(0, 8).map((f) => (
            <span className="tag" key={f.family}>{f.family} · {f.n}</span>
          ))}
        </div>
      )}
      <Locked count={visibleCount} compact title="Unlock posted ranges">
        <PostingTable
          items={postings.items.length ? (expanded ? items : items.slice(0, PREVIEW_ROWS)) : fakePostings(Math.min(visibleCount, 5), intern)}
          intern={intern}
        />
      </Locked>
      {items.length > PREVIEW_ROWS && (
        <button className="btn btn-ghost btn-sm show-more" onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Show fewer' : `Show all ${items.length} postings`}
        </button>
      )}
      <p className="card-foot">
        From employer career sites, ClearanceJobs and Indeed{postings.generated ? `, collected ${monthYear(postings.generated)}` : ''}.
        Ranges marked <span className="badge est">Indeed estimate</span> weren't posted by the employer.
      </p>
    </section>
  );
}
