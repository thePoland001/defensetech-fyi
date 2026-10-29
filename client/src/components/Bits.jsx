import { Link } from 'react-router-dom';
import { useUnlock } from '../api.jsx';
import { LockIcon, PlusIcon } from './Icons.jsx';

export function Logo() {
  return (
    <Link to="/" className="logo" aria-label="defensetech.fyi home">
      <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="7" fill="#071230" />
        <rect x="7" y="17" width="4.5" height="8" rx="1.2" fill="#5AA2E8" />
        <rect x="13.75" y="12" width="4.5" height="13" rx="1.2" fill="#2F84D6" />
        <rect x="20.5" y="7" width="4.5" height="18" rx="1.2" fill="#FFFFFF" />
      </svg>
      <span className="logo-text">defensetech<span className="logo-tld">.fyi</span></span>
    </Link>
  );
}

// Domains whose favicon service result is a generic globe or renders blank; use initials.
const NO_FAVICON = new Set(['lockheedmartin.com', 'accenturefederal.com', 'calibresys.com', 'dynetics.com', 'teledynebrown.com', 'spa.com', 'yulista.com']);

const PALETTE = ['#0B3D91', '#1F6FB2', '#2D6A4F', '#5C4D9A', '#8C3B3B', '#2F5D62', '#4A5568', '#9C6B1E', '#205375', '#6B3E75'];

export function CompanyLogo({ name, domain, size = 40 }) {
  const initials = name
    .replace(/\(.*?\)/g, '')
    .split(/[\s&-]+/)
    .filter((w) => /^[A-Za-z0-9]/.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const style = { width: size, height: size, fontSize: size * 0.38, background: PALETTE[h % PALETTE.length] };
  return (
    <span className="company-logo" style={style} aria-hidden="true">
      <span>{initials}</span>
      {domain && !NO_FAVICON.has(domain) && (
        <img
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=128`}
          alt=""
          loading="lazy"
          onError={(e) => e.currentTarget.remove()}
        />
      )}
    </span>
  );
}

const SIZE_LABEL = { L: 'Large', M: 'Mid-size', S: 'Small' };
export const SizeBadge = ({ size }) => <span className={`badge size-${size}`}>{SIZE_LABEL[size] || size}</span>;

const CLEARANCE_CLASS = { 'Public Trust': 'pt', Secret: 'secret', 'Top Secret': 'ts', 'TS/SCI': 'sci', 'TS/SCI + Poly': 'poly' };
export function ClearanceBadge({ level }) {
  if (!level) return <span className="badge clr-none">No clearance</span>;
  return <span className={`badge clr-${CLEARANCE_CLASS[level] || 'secret'}`}>{level}</span>;
}

export const EstimateBadge = () => (
  <span className="badge est" title="Baseline estimate from publicly reported compensation data, not a user submission.">Estimate</span>
);

// Blurs its children and overlays an unlock prompt until the visitor has contributed.
export function Locked({ children, count, compact = false, title = 'Unlock salary data' }) {
  const { unlocked } = useUnlock();
  if (unlocked) return children;
  return (
    <div className={`locked ${compact ? 'compact' : ''}`}>
      <div className="locked-content" aria-hidden="true">{children}</div>
      <div className="locked-overlay">
        <div className="locked-card">
          <span className="locked-icon"><LockIcon size={20} /></span>
          <strong>{title}</strong>
          {!compact && (
            <p>
              Add your salary anonymously to see {count ? `all ${count.toLocaleString()} data points` : 'what everyone else makes'}.
              It takes about a minute and there's no account.
            </p>
          )}
          <Link to="/add-salary" className="btn btn-primary">
            <PlusIcon size={16} /> Add your salary
          </Link>
        </div>
      </div>
    </div>
  );
}

export function Blur({ children }) {
  const { unlocked } = useUnlock();
  return unlocked ? children : <span className="blur-text" aria-label="hidden until you add a salary">{children}</span>;
}

export function Empty({ title, children }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {children && <p>{children}</p>}
    </div>
  );
}

export function Spinner() {
  return <div className="spinner" role="status" aria-label="Loading" />;
}

export function Bar({ value, max = 1, tone = 'blue' }) {
  const w = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return (
    <span className="bar">
      <span className={`bar-fill tone-${tone}`} style={{ width: `${w}%` }} />
    </span>
  );
}
