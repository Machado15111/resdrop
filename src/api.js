// API base URL — uses env var in production, localhost in dev
// In production (same-origin deploy), use '/api' for relative path
export const API = import.meta.env.VITE_API_URL
  || (import.meta.env.PROD ? '/api' : 'http://localhost:3001/api');
