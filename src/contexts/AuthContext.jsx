import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('resdrop-token'));
  // Start "loading" only when there is a session to restore. Deriving it from
  // the initial token, rather than defaulting to true and immediately calling
  // setLoading(false) inside the effect, avoids a cascading render on every
  // logged-out page load — and is what react-hooks/set-state-in-effect flags.
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('resdrop-token')));

  const authFetch = useCallback(async (url, options = {}) => {
    const headers = { ...options.headers };
    const currentToken = localStorage.getItem('resdrop-token');
    if (currentToken) {
      headers['Authorization'] = `Bearer ${currentToken}`;
    }
    // Auto-set JSON content type, but NOT for FormData (let browser handle multipart boundary)
    if (options.body && !headers['Content-Type'] && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    return fetch(url, { ...options, headers });
  }, []);

  // Restore the session on mount. Runs once: `token` is read from the initial
  // state and later changes come from login/logout, which set `user` directly.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    fetch(`${API}/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Invalid session');
      })
      .then(userData => { if (!cancelled) setUser(userData); })
      .catch(() => {
        if (cancelled) return;
        localStorage.removeItem('resdrop-token');
        setToken(null);
        setUser(null);
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    // React 18 StrictMode mounts effects twice in development; without this the
    // second run's response could overwrite state from an unmounted first run.
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // A non-2xx response isn't always JSON — a 502 during a deploy, a proxy
  // timeout, or a plain network failure all land here too. Without this, the
  // user saw the raw parse error ("Unexpected token < in JSON") instead of
  // anything they could act on.
  const parseAuthResponse = async (res, fallbackMessage) => {
    try {
      return await res.json();
    } catch {
      return { error: fallbackMessage };
    }
  };

  const login = async (email, password) => {
    let res;
    try {
      res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
    } catch {
      throw new Error('Nao foi possivel conectar. Verifique sua internet e tente novamente.');
    }
    const data = await parseAuthResponse(res, 'O servidor nao respondeu como esperado. Tente novamente em instantes.');
    if (!res.ok) throw new Error(data.error || 'Login failed');
    // A 2xx with a body that failed to parse (or parsed but is missing the
    // fields we need) must not be treated as a successful login — without
    // this, data.token is undefined and localStorage ends up storing the
    // literal string "undefined", leaving the app believing it's signed in
    // with a token that can never authenticate anything.
    if (!data.token || !data.user) throw new Error('O servidor nao respondeu como esperado. Tente novamente em instantes.');
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('resdrop-token', data.token);
    return data.user;
  };

  const signup = async ({ email, name, password, phone, currency, country, lang }) => {
    const connErr = lang === 'en'
      ? 'Could not connect. Check your internet and try again.'
      : 'Nao foi possivel conectar. Verifique sua internet e tente novamente.';
    const serverErr = lang === 'en'
      ? 'The server did not respond as expected. Please try again shortly.'
      : 'O servidor nao respondeu como esperado. Tente novamente em instantes.';
    let res;
    try {
      res = await fetch(`${API}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // lang lets the server return validation errors in the user's language.
        body: JSON.stringify({ email, name, password, phone, currency, country, lang }),
      });
    } catch {
      throw new Error(connErr);
    }
    const data = await parseAuthResponse(res, serverErr);
    if (!res.ok) throw new Error(data.error || 'Signup failed');
    if (!data.token || !data.user) throw new Error(serverErr);
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('resdrop-token', data.token);
    return data.user;
  };

  const logout = async () => {
    try {
      await authFetch(`${API}/auth/logout`, { method: 'POST' });
    } catch { /* ignore */ }
    setUser(null);
    setToken(null);
    localStorage.removeItem('resdrop-token');
    localStorage.removeItem('resdrop-user'); // clean up legacy
  };

  const updateUser = (userData) => {
    setUser(prev => ({ ...prev, ...userData }));
  };

  return (
    <AuthContext.Provider value={{
      user, token, loading, login, signup, logout, updateUser, authFetch,
      isAuthenticated: !!user,
      isOnboarded: !!user?.onboardingCompleted,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
