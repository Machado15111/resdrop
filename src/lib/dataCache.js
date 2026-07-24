/**
 * Minimal stale-while-revalidate cache with in-flight request de-duplication.
 *
 * Written by hand rather than pulling in react-query/swr: the app only needs
 * three behaviours and a new runtime dependency is not worth ~12KB gzip here.
 *
 *   1. Serve cached data instantly on repeat navigation (no blank screen).
 *   2. Revalidate in the background so the data stays correct.
 *   3. Collapse concurrent requests for the same key into ONE network call
 *      (two components asking for /bookings at once produced two fetches).
 *
 * Nothing here changes what the server returns — it only avoids asking twice.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

const cache = new Map();    // key -> { data, at }
const inflight = new Map(); // key -> Promise
const subscribers = new Map(); // key -> Set<fn>

const DEFAULT_TTL = 30_000;

export function getCached(key) {
  return cache.get(key)?.data;
}

/** Write a value and notify every mounted hook using this key. */
export function setCached(key, data) {
  cache.set(key, { data, at: Date.now() });
  const subs = subscribers.get(key);
  if (subs) for (const fn of subs) fn(data);
}

export function invalidate(key) {
  cache.delete(key);
}

/** Drop every cached entry whose key starts with `prefix`. */
export function invalidatePrefix(prefix) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

/**
 * Fetch with de-duplication. Concurrent callers for the same key share one
 * promise, so a page that mounts two components needing the same resource
 * still performs a single request.
 */
export function dedupedFetch(key, fetcher) {
  const existing = inflight.get(key);
  if (existing) return existing;
  const p = Promise.resolve()
    .then(fetcher)
    .then((data) => {
      setCached(key, data);
      return data;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

/**
 * useCachedResource — returns cached data immediately (if any) and revalidates
 * when stale. `loading` is only true when there is nothing to show yet, so
 * cached navigations never flash a spinner.
 */
export function useCachedResource(key, fetcher, { ttl = DEFAULT_TTL, enabled = true } = {}) {
  const [data, setData] = useState(() => (key ? getCached(key) : undefined));
  const [loading, setLoading] = useState(() => enabled && !!key && getCached(key) === undefined);
  const [error, setError] = useState(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  // Keep this hook in sync with writes made elsewhere (e.g. optimistic updates).
  useEffect(() => {
    if (!key) return undefined;
    let subs = subscribers.get(key);
    if (!subs) { subs = new Set(); subscribers.set(key, subs); }
    subs.add(setData);
    return () => {
      subs.delete(setData);
      if (subs.size === 0) subscribers.delete(key);
    };
  }, [key]);

  const revalidate = useCallback(async () => {
    if (!key || !enabled) return undefined;
    try {
      setError(null);
      const fresh = await dedupedFetch(key, () => fetcherRef.current());
      return fresh;
    } catch (e) {
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [key, enabled]);

  useEffect(() => {
    if (!key || !enabled) return;
    const entry = cache.get(key);
    if (entry) {
      setData(entry.data);
      setLoading(false);
      if (Date.now() - entry.at < ttl) return; // fresh enough — skip the request
    }
    revalidate().catch(() => {});
  }, [key, enabled, ttl, revalidate]);

  return { data, loading, error, revalidate, mutate: (d) => setCached(key, d) };
}
