import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { app } from './index.js';
import { supabase as sql } from './db.js';

// Importing index.js opens the Postgres pool, whose sockets keep the event loop
// alive and would hang the test runner after the assertions finish. Nothing
// here touches the database — the route table is static — so close the pool.
after(async () => {
  await sql.end({ timeout: 1 }).catch(() => {});
});

/**
 * Express matches routes in registration order, so a literal path registered
 * AFTER a parameterised one on the same prefix is unreachable.
 *
 * That is not hypothetical here: GET /api/bookings/export and
 * GET /api/bookings/upcoming-deadlines were both registered below
 * GET /api/bookings/:id, so every request to them ran the ':id' handler with
 * id="export" / id="upcoming-deadlines", found no such booking and returned
 * 404. The dashboard's CSV export button was dead in production.
 *
 * These tests resolve routes the way Express does — walking the real router
 * stack and asking each layer's matcher — so a future reordering fails here
 * rather than silently in production.
 */

function resolve(url, method = 'get') {
  const walk = (stack, prefix = '') => {
    for (const layer of stack) {
      if (layer.route) {
        for (const match of layer.matchers || []) {
          try {
            if (match(url.slice(prefix.length)) && layer.route.methods[method]) {
              return prefix + layer.route.path;
            }
          } catch { /* not this layer */ }
        }
      } else if (layer.name === 'router' && layer.handle?.stack) {
        for (const match of layer.matchers || []) {
          try {
            const m = match('/api');
            if (m?.path && m.path !== '/') {
              const found = walk(layer.handle.stack, m.path);
              if (found) return found;
            }
          } catch { /* not a mounted router */ }
        }
      }
    }
    return null;
  };
  return walk(app.router?.stack || app._router?.stack || []) || '(unmatched)';
}

test('REGRESSION: /api/bookings/export is not swallowed by /api/bookings/:id', () => {
  assert.equal(resolve('/api/bookings/export'), '/api/bookings/export');
});

test('REGRESSION: /api/bookings/upcoming-deadlines is not swallowed by /api/bookings/:id', () => {
  assert.equal(resolve('/api/bookings/upcoming-deadlines'), '/api/bookings/upcoming-deadlines');
});

test('a real booking id still reaches the :id handler', () => {
  assert.equal(resolve('/api/bookings/abc-123'), '/api/bookings/:id');
  assert.equal(resolve('/api/bookings/550e8400-e29b-41d4-a716-446655440000'), '/api/bookings/:id');
});

test('the literal booking paths are registered before the parameterised one', () => {
  const paths = [];
  const collect = (stack) => {
    for (const layer of stack) {
      if (layer.route) paths.push(layer.route.path);
      else if (layer.name === 'router' && layer.handle?.stack) collect(layer.handle.stack);
    }
  };
  collect(app.router?.stack || []);

  const idx = (p) => paths.indexOf(p);
  assert.ok(idx('/bookings/export') !== -1, '/bookings/export is registered');
  assert.ok(idx('/bookings/:id') !== -1, '/bookings/:id is registered');
  assert.ok(idx('/bookings/export') < idx('/bookings/:id'),
    'export must be registered before :id');
  assert.ok(idx('/bookings/upcoming-deadlines') < idx('/bookings/:id'),
    'upcoming-deadlines must be registered before :id');
});

test('no registered literal route is shadowed by a parameterised sibling', () => {
  // Generalised guard across the whole app: every (method, literal path) pair
  // that is actually REGISTERED must resolve to itself.
  //
  // The method matters. Checking a literal path against all four verbs reports
  // false positives: POST /api/bookings/bulk-import exists but GET does not, so
  // a GET correctly falls through to '/bookings/:id' and 404s. That is normal
  // Express behaviour, not a shadowed route. Only a pair that exists and still
  // resolves elsewhere is a bug.
  const registered = [];
  const collect = (stack, prefix = '') => {
    for (const layer of stack) {
      if (layer.route && typeof layer.route.path === 'string') {
        const path = prefix + layer.route.path;
        if (!path.includes(':') && !path.includes('*')) {
          for (const method of Object.keys(layer.route.methods || {})) {
            if (layer.route.methods[method]) registered.push({ method, path });
          }
        }
      } else if (layer.name === 'router' && layer.handle?.stack) {
        for (const match of layer.matchers || []) {
          try {
            const m = match('/api');
            if (m?.path && m.path !== '/') collect(layer.handle.stack, m.path);
          } catch { /* not mounted */ }
        }
      }
    }
  };
  collect(app.router?.stack || []);
  assert.ok(registered.length > 30, `expected the full route set, got ${registered.length}`);

  const shadowed = registered
    .map(({ method, path }) => ({ method, path, hit: resolve(path, method) }))
    .filter(({ path, hit }) => hit !== path && hit.includes(':'))
    .map(({ method, path, hit }) => `${method.toUpperCase()} ${path} -> ${hit}`);

  assert.deepEqual(shadowed, [], `registered routes shadowed by a param route:\n${shadowed.join('\n')}`);
});
