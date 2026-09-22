import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Load data on mount, and again whenever `load` changes identity.
 *
 * Five components had grown the same block by hand:
 *
 *   const fetchX = useCallback(async () => {
 *     setLoading(true);
 *     try { setData(await (await authFetch(url)).json()); } catch (e) { … }
 *     setLoading(false);
 *   }, [deps]);
 *   useEffect(() => { fetchX(); }, [fetchX]);
 *
 * which carries three problems this hook fixes:
 *
 *  1. `setLoading(true)` runs synchronously inside the effect, so every
 *     dependency change costs an extra render pass before the request even
 *     leaves (react-hooks/set-state-in-effect). Here the first state write
 *     happens after the await, never in the effect body.
 *  2. Nothing cancelled the previous request. Typing in the admin booking
 *     search fired one request per keystroke and whichever answered LAST won,
 *     not whichever was asked last — the table could settle on results for a
 *     prefix of what the box shows. Each run aborts the one before it and a
 *     run id discards any late answer.
 *  3. A resolved request still wrote state after unmount.
 *
 * `load` receives an AbortSignal and returns the data. Wrap it in useCallback
 * — its identity is the refetch trigger, exactly like the useCallback fetchers
 * it replaces.
 *
 * `loading` is true until the first request settles and stays false during
 * refetches, so a filter change keeps the current rows on screen instead of
 * blanking the table to a spinner.
 */
export function useAsyncData(load, { initialData = null } = {}) {
  const [state, setState] = useState({ data: initialData, error: null, loading: true });
  const runId = useRef(0);
  const controller = useRef(null);

  const run = useCallback(async () => {
    controller.current?.abort();
    const ctrl = new AbortController();
    controller.current = ctrl;
    const id = ++runId.current;

    try {
      const data = await load(ctrl.signal);
      if (id !== runId.current || ctrl.signal.aborted) return; // superseded
      setState({ data, error: null, loading: false });
    } catch (err) {
      if (id !== runId.current || ctrl.signal.aborted || err.name === 'AbortError') return;
      console.error('[useAsyncData]', err);
      setState(prev => ({ data: prev.data, error: err, loading: false }));
    }
  }, [load]);

  useEffect(() => {
    run();
    return () => controller.current?.abort();
  }, [run]);

  return { ...state, reload: run };
}
