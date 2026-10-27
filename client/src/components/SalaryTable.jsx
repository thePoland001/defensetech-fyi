import { Link } from 'react-router-dom';
import { arrangementLabel, levelLabel } from '../../../shared/options.js';
import { fakeMoney, hourly, money, monthYear, years } from '../format.js';
import { ClearanceBadge, CompanyLogo, EstimateBadge } from './Bits.jsx';

const SPONSOR_TEXT = { yes: 'Company sponsored', had: 'Already held', no: 'Required at hire' };

function ClearanceCell({ s }) {
  const intern = s.employment_type === 'intern' || s.employment_type === 'co_op';
  if (intern) {
    return s.clearance_sponsored === 'yes' ? (
      <>
        <ClearanceBadge level={s.clearance_level} />
        <span className="sub">Sponsored for intern</span>
      </>
    ) : (
      <span className="muted">Not sponsored</span>
    );
  }
  return (
    <>
      <ClearanceBadge level={s.clearance_required ? s.clearance_level : null} />
      {s.clearance_required && SPONSOR_TEXT[s.clearance_sponsored] && <span className="sub">{SPONSOR_TEXT[s.clearance_sponsored]}</span>}
    </>
  );
}

export default function SalaryTable({ rows, hideCompany = false, mode = 'full_time' }) {
  const intern = mode === 'intern';
  return (
    <div className="table-wrap">
      <table className="salary-table">
        <thead>
          <tr>
            {!hideCompany && <th>Company<span className="th-sub">Location | Date</span></th>}
            <th>{intern ? 'Role' : 'Level'}<span className="th-sub">{intern ? 'Specialization' : 'Title | Specialization'}</span></th>
            {!intern && <th className="num">Years of Exp<span className="th-sub">Total | At company</span></th>}
            <th>Clearance<span className="th-sub">{intern ? 'Intern sponsorship' : 'Level | Sponsorship'}</span></th>
            <th className="num">{intern ? 'Hourly Rate' : 'Total Compensation'}<span className="th-sub">{intern ? 'USD' : 'Base | Stock (yr) | Bonus'}</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.id}>
              {!hideCompany && (
                <td className="c-company">
                  <div className="cell-company">
                    <CompanyLogo name={s.company.name} domain={s.company.domain} size={32} />
                    <div>
                      <Link to={`/companies/${s.company.slug}`} className="strong-link">{s.company.name}</Link>
                      <span className="sub">
                        {s.location_detail || 'Huntsville, AL'} · {arrangementLabel(s.work_arrangement)} | {monthYear(s.created_at)}
                      </span>
                    </div>
                  </div>
                </td>
              )}
              <td className="c-level">
                <div className="cell-stack">
                  <strong>
                    {intern ? s.title : <>{levelLabel(s.level)}{s.level_name && s.level_name.toLowerCase() !== levelLabel(s.level).toLowerCase() && <span className="level-code"> · {s.level_name}</span>}</>}
                  </strong>
                  <span className="sub">
                    {intern ? s.specialization || (s.employment_type === 'co_op' ? 'Co-op' : 'Internship') : [s.title, s.specialization].filter(Boolean).join(' | ')}
                  </span>
                  <span className="row-badges">
                    {s.source === 'estimate' && <EstimateBadge />}
                    {s.nine_eighty && <span className="badge soft">9/80</span>}
                    {hideCompany && <span className="sub">{monthYear(s.created_at)}</span>}
                  </span>
                </div>
              </td>
              {!intern && (
                <td className="num c-yoe">
                  <strong>{years(s.years_exp)}</strong>
                  <span className="sub">{years(s.years_at_company)}</span>
                </td>
              )}
              <td className="c-clear">
                <div className="cell-stack"><ClearanceCell s={s} /></div>
              </td>
              <td className="num c-tc">
                {intern ? (
                  <strong className="tc">{hourly(s.hourly)}</strong>
                ) : (
                  <>
                    <strong className="tc">{money(s.total_comp)}</strong>
                    <span className="sub">
                      {money(s.base)} | {s.stock ? money(s.stock) : 'N/A'} | {s.bonus ? money(s.bonus) : 'N/A'}
                    </span>
                    {s.signing > 0 && <span className="sub">+ {money(s.signing)} signing</span>}
                  </>
                )}
                {s.notes && <span className="note" title={s.notes}>“{s.notes}”</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Plausible-looking blurred rows for locked states. No real data is ever rendered here.
export function FakeSalaryRows({ n = 6, hideCompany = false, mode = 'full_time', company }) {
  const names = ['Lockheed Martin', 'Torch Technologies', 'Dynetics (Leidos)', 'PeopleTec', 'Northrop Grumman', 'COLSA Corporation', 'Radiance Technologies', 'Boeing'];
  const titles = ['Software Engineer', 'Systems Engineer', 'Electrical Engineer', 'Test Engineer', 'Mechanical Engineer', 'Cybersecurity Engineer'];
  const rows = Array.from({ length: n }, (_, i) => {
    const base = fakeMoney(`b${i}`, 72_000, 165_000);
    return {
      id: `fake-${i}`,
      company: { name: company || names[i % names.length], slug: '', domain: '' },
      title: titles[i % titles.length],
      level: `L${(i % 4) + 1}`,
      level_name: '',
      employment_type: mode === 'intern' ? 'intern' : 'full_time',
      years_exp: (i * 3) % 12,
      years_at_company: i % 4,
      base,
      bonus: i % 2 ? 4000 : 0,
      stock: 0,
      signing: 0,
      hourly: 20 + (i % 6) * 2.5,
      total_comp: base + (i % 2 ? 4000 : 0),
      clearance_required: i % 3 !== 0,
      clearance_level: i % 3 ? 'Secret' : null,
      clearance_sponsored: i % 2 ? 'yes' : 'had',
      work_arrangement: 'onsite',
      created_at: new Date(Date.now() - i * 4 * 86400000).toISOString(),
      source: 'user',
    };
  });
  return <SalaryTable rows={rows} hideCompany={hideCompany} mode={mode} />;
}
