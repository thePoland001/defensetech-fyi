import { InfoIcon } from './Icons.jsx';
import { EstimateBadge } from './Bits.jsx';

// Page-level disclosure for pages whose figures are aggregated from both community reports
// and baseline estimates. Hidden once estimates are no longer part of the mix.
export default function EstimateNotice({ companies, field }) {
  const total = companies.reduce((s, c) => s + (c[`${field}_n`] || 0), 0);
  const estimates = companies.reduce((s, c) => s + (c[`${field}_est`] || 0), 0);
  if (!estimates) return null;
  // Never round a mix up to "100%": that would read as if there were no reports at all.
  const share = estimates === total ? 'All' : `${Math.min(99, Math.round((estimates / total) * 100))}%`;
  return (
    <div className="notice">
      <InfoIcon size={16} />
      <span>
        {share} of the data on this page comes from baseline estimates <EstimateBadge /> for the largest employers,
        modeled from public pay data rather than reported by employees. Rows marked "estimates" have no community reports yet.
      </span>
    </div>
  );
}
