import { levelLabel } from '../../../shared/options.js';
import { useApi } from '../api.jsx';
import { fakeMoney, money, monthYear, plural } from '../format.js';
import { Locked } from './Bits.jsx';

const PCTS = [
  ['annual_p10', '10th'],
  ['annual_p25', '25th'],
  ['annual_median', 'Median'],
  ['annual_p75', '75th'],
  ['annual_p90', '90th'],
];

// Box-and-whisker strip: whiskers p10–p90, box p25–p75, tick at the median.
function Spread({ o, min, max }) {
  const x = (v) => `${((v - min) / (max - min || 1)) * 100}%`;
  return (
    <span className="spread" aria-hidden="true">
      <span className="spread-whisker" style={{ left: x(o.annual_p10), width: `calc(${x(o.annual_p90)} - ${x(o.annual_p10)})` }} />
      <span className="spread-box" style={{ left: x(o.annual_p25), width: `calc(${x(o.annual_p75)} - ${x(o.annual_p25)})` }} />
      <span className="spread-median" style={{ left: x(o.annual_median) }} />
    </span>
  );
}

// Locked responses carry no numbers; draw believable placeholders under the blur instead.
function withPlaceholders(o, i) {
  if (o.annual_median != null) return o;
  const m = fakeMoney(`${o.occ_code}${i}`, 95_000, 140_000);
  return { ...o, annual_p10: m * 0.68, annual_p25: m * 0.8, annual_median: m, annual_p75: m * 1.22, annual_p90: m * 1.42 };
}

export default function MarketBenchmark({ family }) {
  const { data } = useApi(family ? `/market/benchmark?family=${encodeURIComponent(family)}` : null);
  if (!data || (!data.occupations.length && !data.postings.n)) return null;

  const occs = data.occupations.map(withPlaceholders).filter((o) => o.annual_median != null);
  const scaleMin = Math.min(...occs.map((o) => o.annual_p10 ?? o.annual_median));
  const scaleMax = Math.max(...occs.map((o) => o.annual_p90 ?? o.annual_median));
  const posted = data.postings;
  const levels = posted.levels.filter((l) => l.n >= 2);

  return (
    <section className="card benchmark">
      <div className="card-head">
        <h2>Huntsville market for {family}</h2>
      </div>
      <p className="card-sub">
        Government wage survey for the Huntsville metro area, plus pay ranges from {plural(posted.n, 'job posting')} at{' '}
        {plural(posted.companies, 'local employer')}. Base pay only, across all industries for the survey.
      </p>
      <Locked compact title="Unlock market data">
        <div className="benchmark-grid">
          {occs.length > 0 && (
            <div>
              <h3 className="mini-head">BLS wage percentiles</h3>
              {occs.map((o) => (
                <div className="bench-occ" key={o.occ_code}>
                  <div className="bench-occ-head">
                    <strong>{o.occ_title}</strong>
                    <span className="sub">{o.employment ? `${o.employment.toLocaleString()} employed locally` : ''} · SOC {o.occ_code}</span>
                  </div>
                  <Spread o={o} min={scaleMin} max={scaleMax} />
                  <div className="bench-pcts">
                    {PCTS.map(([k, label]) => (
                      <div key={k} className={k === 'annual_median' ? 'hl' : ''}>
                        <span className="stat-label">{label}</span>
                        <strong>{o[k] != null ? money(o[k]) : o.top_coded.includes(k) ? '$239K+' : '—'}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          {posted.n > 0 && (
            <div>
              <h3 className="mini-head">Typical posted range</h3>
              <div className="bench-posted">
                <div className="bench-posted-row total">
                  <span>All levels</span>
                  <strong>{money(posted.median_min ?? 85_000)} – {money(posted.median_max ?? 150_000)}</strong>
                  <span className="sub">{posted.n}</span>
                </div>
                {levels.map((l, i) => (
                  <div className="bench-posted-row" key={l.level}>
                    <span>{l.level} · {levelLabel(l.level)}</span>
                    <strong>{money(l.median_min ?? 70_000 + i * 20_000)} – {money(l.median_max ?? 120_000 + i * 25_000)}</strong>
                    <span className="sub">{l.n}</span>
                  </div>
                ))}
              </div>
              <p className="card-foot">Median of each posting's low and high end. Levels are inferred from job titles.</p>
            </div>
          )}
        </div>
      </Locked>
      <p className="card-foot">
        Source: BLS Occupational Employment and Wage Statistics, May {occs[0]?.year || '2025'}, Huntsville, AL MSA.
        Postings collected {data.generated ? monthYear(data.generated) : 'recently'}.
      </p>
    </section>
  );
}
