import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

export async function api(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    credentials: 'same-origin',
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    Object.assign(err, data, { status: res.status });
    throw err;
  }
  return data;
}

// Fetch `path` and re-fetch whenever it (or the unlock state) changes.
export function useApi(path) {
  const { unlocked, checked } = useUnlock();
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const reqId = useRef(0);

  const load = useCallback(() => {
    // Wait until we know whether the visitor is unlocked, so we fetch once, not twice.
    if (!path || !checked) return;
    const id = ++reqId.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    api(path)
      .then((data) => id === reqId.current && setState({ data, error: null, loading: false }))
      .catch((error) => id === reqId.current && setState({ data: null, error, loading: false }));
  }, [path, checked]);

  useEffect(load, [load, unlocked]);
  return { ...state, reload: load };
}

// ------------------------------------------------------------------ app-wide state

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [unlocked, setUnlocked] = useState(false);
  const [checked, setChecked] = useState(false);
  const [companies, setCompanies] = useState(null);
  const [meta, setMeta] = useState({ tags: {}, areas: {}, sizes: {} });

  const loadCompanies = useCallback(() => api('/companies').then((d) => setCompanies(d.companies)).catch(() => {}), []);

  useEffect(() => {
    api('/me').then((d) => setUnlocked(d.unlocked)).catch(() => {}).finally(() => setChecked(true));
    api('/meta').then(setMeta).catch(() => {});
  }, []);

  useEffect(() => {
    if (checked) loadCompanies();
  }, [checked, unlocked, loadCompanies]);

  return (
    <AppContext.Provider value={{ unlocked, setUnlocked, checked, companies, reloadCompanies: loadCompanies, meta }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
export const useUnlock = () => {
  const { unlocked, setUnlocked, checked } = useContext(AppContext);
  return { unlocked, setUnlocked, checked };
};
