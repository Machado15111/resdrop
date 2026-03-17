import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('resdrop-token'));
  const [loading, setLoading] = useState(true);

  const authFetch = useCallback(async (url, options = {}) => {
    const headers = { ...options.headers };
    const currentToken = localStorage.getItem('resdrop-token');
    if (currentToken) {
      headers['Authorization'] = `Bearer ${currentToken}`;
    }
    if (options.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    return fetch(url, { ...options, headers });
  }, []);

  // Restore session on mount
  useEffect(() => {
    if (!token) { setLoading(false); return; }
    fetch(`${API}/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Invalid session');
      })
      .then(userData => setUser(userData))
      .catch(() => {
        localStorage.removeItem('resdrop-token');
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = async (email, password) => {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('resdrop-token', data.token);
    return data.user;
  };

  const signup = async ({ email, name, password, phone, currency, country }) => {
    const res = await fetch(`${API}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, password, phone, currency, country }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Signup failed');
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
