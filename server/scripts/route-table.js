/**
 * Print every route the app actually registers, with its middleware chain, by
 * walking Express's router stack.
 *
 * This is the safety net for the index.js -> routes/ extraction: the split is
 * only correct if this output is IDENTICAL before and after. Grepping the
 * source cannot prove that — it can't see mount prefixes, registration order,
 * or middleware inherited from a router.
 *
 *   node scripts/route-table.js > /tmp/before.txt
 *   ...extract a router...
 *   node scripts/route-table.js > /tmp/after.txt
 *   diff /tmp/before.txt /tmp/after.txt
 */
process.env.NODE_ENV = 'test'; // don't bind a port or start the scheduler

const { app } = await import('../index.js');

/** Middleware are matched by function name, which is why they must stay named. */
function chainOf(layer) {
  return (layer.route?.stack || [])
    .map(s => s.name)
    .filter(n => n && n !== '<anonymous>' && n !== 'bound dispatch');
}

function pathOf(layer, prefix) {
  const p = layer.route?.path ?? '';
  const joined = `${prefix}${p}`.replace(/\/{2,}/g, '/');
  return joined || '/';
}

/**
 * Recover a router's mount prefix.
 *
 * Express 5 dropped `layer.regexp` (and `layer.path`) in favour of `matchers`:
 * an array of functions that return `{ path, params }` for a match and `false`
 * otherwise. Scraping the old regexp source silently produced empty prefixes,
 * which made every mounted route render as '/awin/status' instead of
 * '/api/awin/status' — an unmounted-looking path that would have masked a real
 * mounting mistake. Probing the matcher asks Express itself.
 */
const CANDIDATE_PREFIXES = ['/api', '/'];

function mountPrefixOf(layer) {
  const matchers = layer.matchers || [];
  for (const candidate of CANDIDATE_PREFIXES) {
    for (const match of matchers) {
      try {
        const m = match(candidate);
        if (m && m.path && m.path !== '/') return m.path;
      } catch { /* not this one */ }
    }
  }
  return '';
}

const rows = [];

function walk(stack, prefix = '') {
  for (const layer of stack) {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods || {})
        .filter(m => layer.route.methods[m])
        .map(m => m.toUpperCase())
        .sort();
      for (const method of methods) {
        rows.push({ method, path: pathOf(layer, prefix), chain: chainOf(layer) });
      }
    } else if (layer.name === 'router' && layer.handle?.stack) {
      walk(layer.handle.stack, prefix + mountPrefixOf(layer));
    }
  }
}

const stack = app.router?.stack || app._router?.stack || [];
walk(stack);

rows.sort((a, b) => (a.path + a.method).localeCompare(b.path + b.method));
for (const r of rows) {
  console.log(`${r.method.padEnd(6)} ${r.path.padEnd(46)} ${r.chain.join(' -> ') || '(none)'}`);
}
console.log(`\nTOTAL ROUTES: ${rows.length}`);
