import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { JOB_FAMILIES } from '../../../shared/options.js';
import { useApp } from '../api.jsx';
import { CompanyLogo, SizeBadge } from './Bits.jsx';
import { MoneyIcon, PlusIcon, SearchIcon } from './Icons.jsx';

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

// "soft", "software", "sw eng" → Software Engineer. Matches any word prefix of the title,
// plus a few common abbreviations.
const TITLE_ALIASES = { swe: 'Software Engineer', sw: 'Software Engineer', dev: 'Software Engineer', developer: 'Software Engineer', programmer: 'Software Engineer', sys: 'Systems Engineer', aero: 'Aerospace Engineer', mech: 'Mechanical Engineer', me: 'Mechanical Engineer' };

export function matchTitles(q) {
  const words = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!words.length || words.join('').length < 2) return [];
  const alias = TITLE_ALIASES[words[0]];
  return JOB_FAMILIES.filter((t) => {
    if (alias === t) return true;
    const tw = t.toLowerCase().split(' ');
    return words.every((w) => tw.some((x) => x.startsWith(w)));
  });
}

export function matchCompanies(companies, q, limit = 8) {
  if (!companies) return [];
  const n = norm(q);
  if (!n) return [];
  const scored = [];
  for (const c of companies) {
    const name = norm(c.name);
    const idx = name.indexOf(n);
    if (idx === -1) continue;
    // Prefer prefix matches, then companies with more data.
    scored.push([idx === 0 ? 0 : 1, -c.salary_count, c.name.length, c]);
  }
  scored.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
  return scored.slice(0, limit).map((s) => s[3]);
}

// variant: 'header' | 'hero' | 'field'. In 'field' mode it acts as a form combobox and can
// offer to add a company that isn't listed.
export default function CompanySearch({ variant = 'header', onSelect, onCreate, value, placeholder = 'Search companies or titles', autoFocus }) {
  const { companies } = useApp();
  const navigate = useNavigate();
  const [q, setQ] = useState(value || '');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrap = useRef(null);
  const listId = useId();

  useEffect(() => setQ(value || ''), [value]);

  const results = useMemo(() => matchCompanies(companies, q), [companies, q]);
  // Outside the form, the search box also jumps to salaries for a title.
  const titles = useMemo(() => (variant === 'field' ? [] : matchTitles(q).map((t) => ({ title: t }))), [variant, q]);
  const showCreate = variant === 'field' && onCreate && q.trim().length >= 2 && !results.some((c) => norm(c.name) === norm(q));
  const options = [...titles, ...results, ...(showCreate ? [{ create: true, name: q.trim() }] : [])];

  useEffect(() => {
    const close = (e) => wrap.current && !wrap.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  function choose(opt) {
    setOpen(false);
    if (opt.create) {
      onCreate?.(opt.name);
      return;
    }
    if (opt.title) {
      setQ('');
      navigate(`/salaries?title=${encodeURIComponent(opt.title)}`);
      return;
    }
    if (onSelect) {
      setQ(opt.name);
      onSelect(opt);
    } else {
      setQ('');
      navigate(`/companies/${opt.slug}`);
    }
  }

  function onKeyDown(e) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) setOpen(true);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter' && options[active]) {
      e.preventDefault();
      choose(options[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className={`company-search cs-${variant}`} ref={wrap}>
      <div className="cs-input-wrap">
        {variant !== 'field' && <SearchIcon size={variant === 'hero' ? 20 : 16} className="cs-icon" />}
        <input
          type="text"
          role="combobox"
          aria-expanded={open && options.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          value={q}
          placeholder={placeholder}
          autoFocus={autoFocus}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(0);
            if (variant === 'field') onSelect?.(null);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
      </div>
      {open && options.length > 0 && (
        <ul className="cs-list" id={listId} role="listbox">
          {options.map((opt, i) => (
            <li
              key={opt.create ? '__create' : opt.title ? `t-${opt.title}` : opt.slug}
              role="option"
              aria-selected={i === active}
              className={i === active ? 'active' : ''}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(opt);
              }}
            >
              {opt.title ? (
                <>
                  <span className="cs-create-icon"><MoneyIcon size={16} /></span>
                  <span className="cs-name"><strong>{opt.title}</strong> salaries in Huntsville</span>
                </>
              ) : opt.create ? (
                <>
                  <span className="cs-create-icon"><PlusIcon size={16} /></span>
                  <span>Add <strong>“{opt.name}”</strong> as a new Huntsville company</span>
                </>
              ) : (
                <>
                  <CompanyLogo name={opt.name} domain={opt.domain} size={28} />
                  <span className="cs-name">{opt.name}</span>
                  <SizeBadge size={opt.size} />
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
