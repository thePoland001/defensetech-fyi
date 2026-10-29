export function money(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 100_000) return `$${Math.round(n / 1000)}K`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return `$${Math.round(n)}`;
}

export const moneyFull = (n) => (n === null || n === undefined ? '—' : `$${Math.round(n).toLocaleString()}`);

export const hourly = (n) => (n === null || n === undefined ? '—' : `$${Number(n).toFixed(Number.isInteger(n) ? 0 : 2)}/hr`);

export const pct = (r) => (r === null || r === undefined ? '—' : `${Math.round(r * 100)}%`);

// Dates are only ever shown (and served) at month precision, to protect anonymity.
export const monthYear = (iso) => new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });

export const plural = (n, word, many = `${word}s`) => `${n.toLocaleString()} ${n === 1 ? word : many}`;
export const years = (n) => `${n} ${n === 1 ? 'yr' : 'yrs'}`;

// Stable pseudo-random placeholder values for blurred, locked content.
export function fakeMoney(seed, lo = 80_000, hi = 190_000) {
  let h = 0;
  for (const c of String(seed)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return lo + (h % (hi - lo));
}

// Says where a number comes from: community reports, baseline estimates, or both.
export function basis(total, estimates, noun = 'report') {
  const user = total - estimates;
  if (!total) return `No ${noun}s yet`;
  if (!estimates) return plural(user, noun);
  if (!user) return plural(estimates, 'estimate');
  return `${plural(user, noun)} + ${plural(estimates, 'estimate')}`;
}
