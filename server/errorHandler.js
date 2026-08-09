import crypto from 'crypto';

/**
 * Terminal error handling for the API.
 *
 * BEFORE THIS MODULE
 * ------------------
 * There was no `app.use((err, req, res, next) => ...)` anywhere. Express 5
 * forwards a rejected async handler to its DEFAULT error handler, which:
 *   - replies with HTML, not the `{ error }` JSON shape every caller in src/
 *     does `res.json()` on, and
 *   - includes the stack trace whenever NODE_ENV !== 'production'.
 * Roughly a third of the route handlers had no try/catch, so any unexpected
 * throw took that path.
 *
 * Separately, the SPA fallback (`app.get('/{*splat}')`) matched unknown /api
 * paths and then neither replied nor called next(), leaving the request to hang
 * until the client timed out. `apiNotFound` closes that.
 */

/** Attach a short correlation id to every request. */
export function requestId(req, res, next) {
  req.id = crypto.randomBytes(8).toString('hex');
  res.setHeader('X-Request-Id', req.id);
  next();
}

/**
 * An error that is safe to show the caller. Anything else is reported as a
 * generic message so driver/Supabase text (which names tables and columns)
 * never reaches a client.
 */
export class ApiError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
    this.expose = true;
  }
}

/** JSON 404 for any /api path that matched no route. Mount after all routers. */
export function apiNotFound(req, res) {
  res.status(404).json({
    error: 'Not found',
    code: 'NOT_FOUND',
    path: req.originalUrl.split('?')[0],
    requestId: req.id,
  });
}

/**
 * Is this error's message safe to return verbatim? Only errors we constructed
 * deliberately (ApiError, or anything marked `expose`) and client-fault codes.
 */
function isExposable(err) {
  if (err?.expose === true) return true;
  const status = err?.status || err?.statusCode;
  return Number.isInteger(status) && status >= 400 && status < 500;
}

export function errorHandler(err, req, res, next) {
  const status = Number.isInteger(err?.status || err?.statusCode)
    ? (err.status || err.statusCode)
    : 500;

  // Log the whole thing server-side — this is the only place the stack lives.
  const where = `${req.method} ${req.originalUrl.split('?')[0]}`;
  if (status >= 500) {
    console.error(`[API:${req.id}] ${where} → ${status}:`, err?.stack || err?.message || err);
  } else {
    console.warn(`[API:${req.id}] ${where} → ${status}: ${err?.message}`);
  }

  // Headers already flushed (e.g. a stream failed mid-write) — Express must
  // close the connection itself; writing a body here would corrupt the response.
  if (res.headersSent) return next(err);

  const body = {
    error: isExposable(err) ? err.message : 'Internal server error',
    requestId: req.id,
  };
  if (err?.code && typeof err.code === 'string' && isExposable(err)) body.code = err.code;

  res.status(status).json(body);
}
