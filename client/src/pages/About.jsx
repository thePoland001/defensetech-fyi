import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api, useApi } from '../api.jsx';
import { usePageTitle } from './usePageTitle.js';

export default function About() {
  usePageTitle('About');
  const { hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);

  return (
    <div className="container page narrow prose">
      <h1>About defensetech.fyi</h1>
      <p className="lead">
        defensetech.fyi is a free, anonymous pay-transparency site for the defense industry in Huntsville, Alabama.
        Huntsville has one of the densest concentrations of defense engineering anywhere in the country, but pay
        information is scattered across forum threads and word of mouth, and almost nothing exists for the hundreds of
        small and mid-size companies that do a huge share of the work. This site fixes that.
      </p>

      <h2>Give a salary, get every salary</h2>
      <p>
        Company profiles, clearance statistics and intern sponsorship rates are open to everyone. Individual salaries and
        pay medians unlock once you share one data point of your own: a current salary, an offer, or an internship.
        Unlocking lasts a year on that browser. There's no verification step, so please be accurate. The site only works
        if the data is honest.
      </p>

      <h2 id="methodology">How the data works</h2>
      <ul>
        <li><strong>Community submissions</strong> are self-reported and shown as entered. Total compensation is base + annual bonus + yearly stock. Signing bonuses are shown separately.</li>
        <li><strong>Baseline estimates</strong> pre-populate the largest employers (Lockheed Martin, Northrop Grumman, Boeing, RTX, Leidos/Dynetics, L3Harris, Palantir, Anduril and others) so the site is useful from day one. They're calibrated to Huntsville-area medians reported on levels.fyi where those exist (November 2026), and otherwise derived from pay-transparency ranges in job postings and BLS data for the Huntsville metro. They're always labeled <span className="badge est">Estimate</span> and can be filtered out on the salaries page.</li>
        <li><strong>Levels</strong> are normalized to L1 (entry) through L6 (fellow) so you can compare across companies. Each company's own level name (E3, P2, Level 4…) is kept alongside when people provide it.</li>
        <li><strong>Clearance sponsorship</strong> means the company initiated and paid for the investigation. For interns, it counts even if the clearance was still processing when the internship ended.</li>
        <li><strong>The company directory</strong> covers ~300 defense and government contractors with a Huntsville address, compiled from the Huntsville/Madison County Chamber directory, the Cummings Research Park tenant directory, and local business news. Missing a company? Add it when you submit.</li>
      </ul>

      <h2 id="privacy">Privacy</h2>
      <ul>
        <li>No accounts, names or emails.</li>
        <li>Your IP address is never stored. A salted one-way hash is kept only to rate-limit spam.</li>
        <li>Submission dates are only shown, and only returned by the API, at month precision.</li>
        <li>A single cookie remembers that you've contributed. It holds no personal information.</li>
        <li>You can delete your own submission at any time from this browser, below.</li>
      </ul>
      <MySubmission />

      <h2>Please keep it unclassified</h2>
      <p>
        Never post classified information, CUI, or details about sensitive programs. Title, level, pay and clearance
        level are all that's needed. Notes that look like they contain sensitive information may be removed.
      </p>

      <h2>Not affiliated</h2>
      <p>
        defensetech.fyi isn't affiliated with any company, government agency or levels.fyi. Company names and logos belong
        to their owners and are used only to identify them. Nothing here is financial or career advice.
      </p>

      <p><Link to="/add-salary" className="btn btn-primary">Add your salary</Link></p>
    </div>
  );
}

// Lets a contributor remove the entry tied to this browser's unlock cookie.
function MySubmission() {
  const { data } = useApi('/me/submission');
  const [state, setState] = useState('idle'); // idle | deleting | deleted | error
  const sub = data?.submission;
  if (state === 'deleted') return <div className="notice ok">Your submission was deleted.</div>;
  if (!sub) return null;

  async function remove() {
    if (!window.confirm(`Delete your ${sub.company_name} ${sub.title} submission? This can't be undone.`)) return;
    setState('deleting');
    try {
      await api('/me/submission', { method: 'DELETE' });
      setState('deleted');
    } catch {
      setState('error');
    }
  }

  return (
    <div className="card my-submission">
      <div>
        <strong>Your submission</strong>
        <span className="sub">{sub.company_name} · {sub.title}{sub.employment_type !== 'full_time' ? ' · Internship' : ''}</span>
        {state === 'error' && <span className="field-error">Couldn't delete it. Try again.</span>}
      </div>
      <button className="btn btn-ghost btn-sm danger" onClick={remove} disabled={state === 'deleting'}>Delete it</button>
    </div>
  );
}
