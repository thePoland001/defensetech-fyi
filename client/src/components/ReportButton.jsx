import { useEffect, useRef, useState } from 'react';
import { FLAG_REASONS } from '../../../shared/options.js';
import { api } from '../api.jsx';

// Small "Report" link on community entries. Three reports from different people hide an
// entry until an admin reviews it.
export default function ReportButton({ id }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | done | error
  const [error, setError] = useState('');
  const wrap = useRef(null);
  const [pos, setPos] = useState(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => wrap.current && !wrap.current.contains(e.target) && setOpen(false);
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    const dismiss = () => setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    window.addEventListener('resize', dismiss);
    window.addEventListener('scroll', dismiss, { passive: true });
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
      window.removeEventListener('resize', dismiss);
      window.removeEventListener('scroll', dismiss);
    };
  }, [open]);

  // Tables scroll horizontally, which would clip an absolutely positioned popover, so it's
  // placed against the viewport instead, below the link (or above it near the bottom).
  function toggle(e) {
    if (open) return setOpen(false);
    const r = e.currentTarget.getBoundingClientRect();
    const width = Math.min(280, window.innerWidth - 24);
    const left = Math.max(12, Math.min(r.right - width, window.innerWidth - width - 12));
    const below = window.innerHeight - r.bottom > 330;
    setPos(below ? { left, top: r.bottom + 6, width } : { left, bottom: window.innerHeight - r.top + 6, width });
    setOpen(true);
  }

  async function submit(e) {
    e.preventDefault();
    if (!reason) return setError('Pick a reason.');
    setStatus('sending');
    try {
      await api(`/salaries/${id}/flag`, { method: 'POST', body: { reason, details } });
      setStatus('done');
      setTimeout(() => setOpen(false), 1400);
    } catch (err) {
      setStatus('error');
      setError(err.message);
    }
  }

  if (status === 'done' && !open) return <span className="report-done">Reported</span>;

  return (
    <span className="report" ref={wrap}>
      <button type="button" className="report-link" onClick={toggle} aria-expanded={open}>
        Report
      </button>
      {open && (
        <form className="report-pop" onSubmit={submit} style={pos}>
          {status === 'done' ? (
            <p className="report-thanks">Thanks. We'll take a look.</p>
          ) : (
            <>
              <strong>Report this entry</strong>
              <div className="report-reasons">
                {Object.entries(FLAG_REASONS).map(([k, label]) => (
                  <label key={k} className="check">
                    <input type="radio" name={`reason-${id}`} value={k} checked={reason === k} onChange={() => { setReason(k); setError(''); }} />
                    {label}
                  </label>
                ))}
              </div>
              <textarea rows={2} maxLength={300} placeholder="Anything else? (optional)" value={details} onChange={(e) => setDetails(e.target.value)} />
              {error && <span className="field-error">{error}</span>}
              <div className="report-actions">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={status === 'sending'}>Send report</button>
              </div>
            </>
          )}
        </form>
      )}
    </span>
  );
}
