import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  CLEARANCE_LEVELS, EDUCATION, EMPLOYMENT_TYPES, HOURLY_TYPES, INTERN_SPONSORSHIP, JOB_FAMILIES, LEVELS, LOCATIONS,
  SPONSORSHIP, WORK_ARRANGEMENTS,
} from '../../../shared/options.js';
import { api, useApp } from '../api.jsx';
import { CompanyLogo } from '../components/Bits.jsx';
import CompanySearch from '../components/CompanySearch.jsx';
import { ArrowRight, CheckIcon, LockIcon, ShieldIcon, XIcon } from '../components/Icons.jsx';
import { hourly as fmtHourly, moneyFull } from '../format.js';
import { usePageTitle } from './usePageTitle.js';

const EMPTY = {
  companySlug: '',
  newCompanyName: '',
  employmentType: 'full_time',
  title: '',
  specialization: '',
  level: '',
  levelName: '',
  yearsExp: '',
  yearsAtCompany: '',
  base: '',
  bonus: '',
  stock: '',
  signing: '',
  hourly: '',
  clearanceRequired: '',
  clearanceLevel: '',
  clearanceSponsored: '',
  workArrangement: 'onsite',
  locationDetail: '',
  education: '',
  nineEighty: false,
  notes: '',
  website: '',
};

const digits = (v) => String(v).replace(/[^\d]/g, '');
const withCommas = (v) => (v === '' ? '' : Number(v).toLocaleString());

function MoneyInput({ value, onChange, placeholder, invalid, id }) {
  return (
    <div className={`money-input ${invalid ? 'invalid' : ''}`}>
      <span>$</span>
      <input id={id} type="text" inputMode="numeric" placeholder={placeholder} value={withCommas(value)} onChange={(e) => onChange(digits(e.target.value).slice(0, 7))} />
    </div>
  );
}

function Segmented({ options, value, onChange, name }) {
  return (
    <div className="segmented" role="radiogroup" aria-label={name}>
      {options.map((o) => (
        <button type="button" role="radio" aria-checked={value === o.value} key={o.value} className={value === o.value ? 'active' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Field({ label, hint, error, children, htmlFor, optional }) {
  return (
    <div className={`field ${error ? 'has-error' : ''}`}>
      <label htmlFor={htmlFor}>{label}{optional && <span className="optional"> (optional)</span>}</label>
      {children}
      {error ? <span className="field-error">{error}</span> : hint && <span className="hint">{hint}</span>}
    </div>
  );
}

export default function AddSalary() {
  usePageTitle('Add your salary');
  const [params] = useSearchParams();
  const { companies, setUnlocked, reloadCompanies, unlocked } = useApp();
  const [form, setForm] = useState(() => ({ ...EMPTY, employmentType: params.get('type') === 'intern' ? 'intern' : 'full_time' }));
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null);
  const [serverError, setServerError] = useState('');

  const set = (key) => (value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  // Preselect a company from ?company=slug once the directory has loaded.
  useEffect(() => {
    const slug = params.get('company');
    if (slug && companies && !form.companySlug) {
      if (companies.some((c) => c.slug === slug)) setForm((f) => ({ ...f, companySlug: slug }));
    }
  }, [companies]); // eslint-disable-line react-hooks/exhaustive-deps

  const company = companies?.find((c) => c.slug === form.companySlug);
  const hourlyType = HOURLY_TYPES.has(form.employmentType);
  const internLike = form.employmentType === 'intern' || form.employmentType === 'co_op';
  const total = (Number(form.base) || 0) + (Number(form.bonus) || 0) + (Number(form.stock) || 0);

  function validate() {
    const e = {};
    if (!form.companySlug && !form.newCompanyName) e.company = 'Pick your company, or add it if it isn\'t listed.';
    if (!form.title) e.title = 'Choose the closest job family.';
    if (!internLike && !form.level) e.level = 'Choose your level.';
    if (!internLike && form.yearsExp === '') e.yearsExp = 'Required.';
    if (form.yearsAtCompany !== '' && form.yearsExp !== '' && Number(form.yearsAtCompany) > Number(form.yearsExp)) e.yearsAtCompany = 'Can\'t be more than your total experience.';
    if (hourlyType) {
      const h = Number(form.hourly);
      if (!h || h < 7.25 || h > 250) e.hourly = 'Enter an hourly rate between $7.25 and $250.';
    } else {
      const b = Number(form.base);
      if (!b || b < 15000 || b > 800000) e.base = 'Enter an annual base salary between $15,000 and $800,000.';
    }
    if (internLike) {
      if (!form.clearanceSponsored) e.clearanceSponsored = 'Let us know whether they sponsored a clearance.';
      if (form.clearanceSponsored === 'yes' && !form.clearanceLevel) e.clearanceLevel = 'Which level?';
    } else {
      if (!form.clearanceRequired) e.clearanceRequired = 'Did the role require a clearance?';
      if (form.clearanceRequired === 'yes') {
        if (!form.clearanceLevel) e.clearanceLevel = 'Which level?';
        if (!form.clearanceSponsored) e.clearanceSponsored = 'Who sponsored it?';
      }
    }
    return e;
  }

  async function submit(ev) {
    ev.preventDefault();
    setServerError('');
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      const first = document.querySelector('.has-error');
      first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setSubmitting(true);
    try {
      await api('/salaries', { method: 'POST', body: { ...form, nineEighty: !hourlyType && form.nineEighty } });
      setUnlocked(true);
      reloadCompanies();
      setDone({ slug: form.companySlug, name: company?.name || form.newCompanyName });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      if (err.field) setErrors({ [err.field]: err.message });
      setServerError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="container page narrow">
        <div className="card success-card">
          <span className="success-icon"><CheckIcon size={28} /></span>
          <h1>Thanks! Salary data is unlocked.</h1>
          <p>Your submission is live and anonymous. You now have full access to every salary, internship and clearance stat on defensetech.fyi for the next year.</p>
          <div className="success-actions">
            <Link to="/salaries" className="btn btn-primary">Browse all salaries <ArrowRight size={16} /></Link>
            {done.slug && <Link to={`/companies/${done.slug}`} className="btn btn-ghost">See {done.name}</Link>}
            <button className="btn btn-ghost" onClick={() => { setForm({ ...EMPTY }); setDone(null); }}>Add another</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>Add your salary</h1>
          <p className="page-sub">Anonymous, about a minute, and it unlocks every salary on the site. Offers, current pay and past jobs from the last 3 years all help.</p>
        </div>
      </div>

      <div className="form-layout">
        <form className="card salary-form" onSubmit={submit} noValidate>
          <fieldset>
            <legend><span className="step">1</span> Where you work</legend>
            <Field label="Company" error={errors.company} hint="Huntsville defense companies only. Can't find yours? Type the name to add it.">
              {form.newCompanyName ? (
                <div className="selected-company">
                  <span className="new-co">New</span>
                  <strong>{form.newCompanyName}</strong>
                  <span className="sub">will be added to the directory</span>
                  <button type="button" className="icon-btn" aria-label="Clear company" onClick={() => setForm((f) => ({ ...f, newCompanyName: '' }))}><XIcon size={16} /></button>
                </div>
              ) : company ? (
                <div className="selected-company">
                  <CompanyLogo name={company.name} domain={company.domain} size={28} />
                  <strong>{company.name}</strong>
                  <button type="button" className="icon-btn" aria-label="Change company" onClick={() => setForm((f) => ({ ...f, companySlug: '' }))}><XIcon size={16} /></button>
                </div>
              ) : (
                <CompanySearch
                  variant="field"
                  placeholder="Start typing, e.g. Torch Technologies"
                  onSelect={(c) => c && setForm((f) => ({ ...f, companySlug: c.slug, newCompanyName: '' }))}
                  onCreate={(name) => { setForm((f) => ({ ...f, newCompanyName: name, companySlug: '' })); setErrors((e) => ({ ...e, company: undefined })); }}
                />
              )}
            </Field>
            <Field label="Employment type">
              <Segmented name="Employment type" options={EMPLOYMENT_TYPES} value={form.employmentType} onChange={(v) => setForm((f) => ({ ...f, employmentType: v, clearanceSponsored: '', clearanceLevel: '', clearanceRequired: '' }))} />
            </Field>
            <div className="field-row">
              <Field label="Work arrangement">
                <Segmented name="Work arrangement" options={WORK_ARRANGEMENTS} value={form.workArrangement} onChange={set('workArrangement')} />
              </Field>
              <Field label="Where in Huntsville" optional htmlFor="loc">
                <select id="loc" value={form.locationDetail} onChange={(e) => set('locationDetail')(e.target.value)}>
                  <option value="">Prefer not to say</option>
                  {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
                </select>
              </Field>
            </div>
          </fieldset>

          <fieldset>
            <legend><span className="step">2</span> Your role</legend>
            <div className="field-row">
              <Field label="Job family" error={errors.title} htmlFor="title">
                <select id="title" value={form.title} onChange={(e) => set('title')(e.target.value)}>
                  <option value="">Select…</option>
                  {JOB_FAMILIES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Specialization" optional htmlFor="spec" hint="e.g. GN&C, Embedded C++, RF, Patriot">
                <input id="spec" type="text" maxLength={80} value={form.specialization} onChange={(e) => set('specialization')(e.target.value)} />
              </Field>
            </div>
            {!internLike && (
              <div className="field-row">
                <Field label="Level" error={errors.level} htmlFor="level">
                  <select id="level" value={form.level} onChange={(e) => set('level')(e.target.value)}>
                    <option value="">Select…</option>
                    {LEVELS.map((l) => <option key={l.value} value={l.value}>{l.value} · {l.long}</option>)}
                  </select>
                </Field>
                <Field label="Company level or title" optional htmlFor="levelName" hint="e.g. E3, Engineer II, P3, Level 2">
                  <input id="levelName" type="text" maxLength={40} value={form.levelName} onChange={(e) => set('levelName')(e.target.value)} />
                </Field>
              </div>
            )}
            <div className="field-row">
              <Field label="Years of experience" error={errors.yearsExp} htmlFor="yoe" optional={internLike}>
                <input id="yoe" type="number" min="0" max="50" inputMode="numeric" value={form.yearsExp} onChange={(e) => set('yearsExp')(e.target.value)} />
              </Field>
              <Field label="Years at this company" error={errors.yearsAtCompany} htmlFor="yac" optional>
                <input id="yac" type="number" min="0" max="50" inputMode="numeric" value={form.yearsAtCompany} onChange={(e) => set('yearsAtCompany')(e.target.value)} />
              </Field>
            </div>
          </fieldset>

          <fieldset>
            <legend><span className="step">3</span> Compensation</legend>
            {hourlyType ? (
              <Field label="Hourly rate" error={errors.hourly} htmlFor="hourly" hint={form.hourly ? `≈ ${moneyFull(Number(form.hourly) * 2080)} annualized at 40 hrs/week` : 'Before taxes. Leave housing or relocation stipends out.'}>
                <div className={`money-input ${errors.hourly ? 'invalid' : ''}`}>
                  <span>$</span>
                  <input id="hourly" type="number" min="7.25" max="250" step="0.25" inputMode="decimal" placeholder="25.00" value={form.hourly} onChange={(e) => set('hourly')(e.target.value)} />
                  <span className="suffix">/hr</span>
                </div>
              </Field>
            ) : (
              <>
                <div className="field-row">
                  <Field label="Base salary (annual)" error={errors.base} htmlFor="base">
                    <MoneyInput id="base" value={form.base} onChange={set('base')} placeholder="95,000" invalid={errors.base} />
                  </Field>
                  <Field label="Annual bonus" optional htmlFor="bonus" hint="Average yearly bonus or profit sharing">
                    <MoneyInput id="bonus" value={form.bonus} onChange={set('bonus')} placeholder="0" />
                  </Field>
                </div>
                <div className="field-row">
                  <Field label="Stock / equity per year" optional htmlFor="stock" hint="Annual vested value (RSUs, options, ESOP)">
                    <MoneyInput id="stock" value={form.stock} onChange={set('stock')} placeholder="0" />
                  </Field>
                  <Field label="Signing bonus" optional htmlFor="signing" hint="One-time, not included in total comp">
                    <MoneyInput id="signing" value={form.signing} onChange={set('signing')} placeholder="0" />
                  </Field>
                </div>
              </>
            )}
          </fieldset>

          <fieldset>
            <legend><span className="step">4</span> Security clearance</legend>
            {internLike ? (
              <>
                <Field label="Did the company sponsor a clearance for you as an intern?" error={errors.clearanceSponsored}>
                  <div className="radio-list">
                    {INTERN_SPONSORSHIP.map((o) => (
                      <label key={o.value} className={`radio ${form.clearanceSponsored === o.value ? 'checked' : ''}`}>
                        <input type="radio" name="isp" checked={form.clearanceSponsored === o.value} onChange={() => set('clearanceSponsored')(o.value)} />
                        {o.label}
                      </label>
                    ))}
                  </div>
                </Field>
                {form.clearanceSponsored === 'yes' && (
                  <Field label="Clearance level" error={errors.clearanceLevel} htmlFor="clvl" hint="Count it even if it was still processing when the internship ended.">
                    <select id="clvl" value={form.clearanceLevel} onChange={(e) => set('clearanceLevel')(e.target.value)}>
                      <option value="">Select…</option>
                      {CLEARANCE_LEVELS.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </Field>
                )}
              </>
            ) : (
              <>
                <Field label="Did this role require a security clearance?" error={errors.clearanceRequired}>
                  <Segmented name="Clearance required" options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]} value={form.clearanceRequired} onChange={set('clearanceRequired')} />
                </Field>
                {form.clearanceRequired === 'yes' && (
                  <>
                    <Field label="Clearance level" error={errors.clearanceLevel} htmlFor="clvl">
                      <select id="clvl" value={form.clearanceLevel} onChange={(e) => set('clearanceLevel')(e.target.value)}>
                        <option value="">Select…</option>
                        {CLEARANCE_LEVELS.map((c) => <option key={c}>{c}</option>)}
                      </select>
                    </Field>
                    <Field label="Did the company sponsor your clearance?" error={errors.clearanceSponsored}>
                      <div className="radio-list">
                        {SPONSORSHIP.map((o) => (
                          <label key={o.value} className={`radio ${form.clearanceSponsored === o.value ? 'checked' : ''}`}>
                            <input type="radio" name="sp" checked={form.clearanceSponsored === o.value} onChange={() => set('clearanceSponsored')(o.value)} />
                            {o.label}
                          </label>
                        ))}
                      </div>
                    </Field>
                  </>
                )}
              </>
            )}
          </fieldset>

          <fieldset>
            <legend><span className="step">5</span> Extras <span className="optional">(optional)</span></legend>
            <div className="field-row">
              <Field label="Highest education" htmlFor="edu" optional>
                <select id="edu" value={form.education} onChange={(e) => set('education')(e.target.value)}>
                  <option value="">Prefer not to say</option>
                  {EDUCATION.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
                </select>
              </Field>
              {!hourlyType && (
                <Field label="Schedule">
                  <label className="check big">
                    <input type="checkbox" checked={form.nineEighty} onChange={(e) => set('nineEighty')(e.target.checked)} />
                    I'm on a 9/80 schedule
                  </label>
                </Field>
              )}
            </div>
            <Field label="Anything else?" optional htmlFor="notes" hint={`${500 - form.notes.length} characters left. Benefits, 401(k) match, raises… nothing that identifies you, and never anything classified or CUI.`}>
              <textarea id="notes" rows={3} maxLength={500} value={form.notes} onChange={(e) => set('notes')(e.target.value)} />
            </Field>
            <input className="hp" type="text" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => set('website')(e.target.value)} aria-hidden="true" />
          </fieldset>

          {serverError && <div className="form-error">{serverError}</div>}
          <div className="form-actions">
            <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
              {submitting ? 'Submitting…' : unlocked ? 'Submit salary' : 'Submit & unlock salaries'}
            </button>
            <span className="sub">By submitting you confirm this is accurate to the best of your knowledge.</span>
          </div>
        </form>

        <aside className="form-aside">
          <div className="card preview-card">
            <span className="stat-label">Your submission</span>
            <div className="preview-company">
              {company ? <CompanyLogo name={company.name} domain={company.domain} size={36} /> : <span className="preview-blank" />}
              <div>
                <strong>{company?.name || form.newCompanyName || 'Company'}</strong>
                <span className="sub">{form.title || 'Job family'}{!internLike && form.level ? ` · ${form.level}` : ''}</span>
              </div>
            </div>
            <div className="preview-total">
              {hourlyType ? fmtHourly(form.hourly ? Number(form.hourly) : null) : moneyFull(total || null)}
              <span className="sub">{hourlyType ? 'hourly rate' : 'total compensation / yr'}</span>
            </div>
            {!hourlyType && total > 0 && (
              <div className="preview-break">
                <span>Base <strong>{moneyFull(Number(form.base) || 0)}</strong></span>
                <span>Stock <strong>{moneyFull(Number(form.stock) || 0)}</strong></span>
                <span>Bonus <strong>{moneyFull(Number(form.bonus) || 0)}</strong></span>
              </div>
            )}
          </div>
          <div className="card why-card">
            <h3><LockIcon size={16} /> Anonymous by design</h3>
            <ul>
              <li>No account, email or name. Ever.</li>
              <li>We don't store your IP address. A one-way hash is used only for spam limits.</li>
              <li>Submission dates are only ever shown as month and year.</li>
            </ul>
            <h3><ShieldIcon size={16} /> Keep it unclassified</h3>
            <p>Don't include program names that are themselves sensitive, customer details, or anything CUI. Job family and level are plenty.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
