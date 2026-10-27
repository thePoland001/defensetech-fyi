import { useEffect } from 'react';

const SUFFIX = 'defensetech.fyi';

export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · ${SUFFIX}` : `${SUFFIX} · Huntsville defense salaries & clearances`;
  }, [title]);
}
