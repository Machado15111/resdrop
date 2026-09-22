/**
 * Travelpayouts monetization bootstrap (affiliate commission).
 *
 * SECURITY: this loads REMOTE third-party JS with full page access, and the
 * user's auth token lives in localStorage ('resdrop-token'). So it must run
 * ONLY for logged-out visitors on public/marketing routes — never in an
 * authenticated document. The login-boundary reload in src/App.jsx keeps that
 * guarantee when a logged-out visitor logs in via client-side navigation.
 *
 * This lives in a file rather than inline in index.html so that script-src does
 * not need 'unsafe-inline' — with it, any XSS could read the session token.
 */
(function () {
  var TOKEN_KEY = 'resdrop-token';
  var PUBLIC_PATHS = ['/', '/v2', '/v3', '/v4', '/about', '/privacy', '/terms', '/plans'];
  var loggedIn;
  try { loggedIn = !!localStorage.getItem(TOKEN_KEY); } catch (e) { loggedIn = true; }
  if (loggedIn || PUBLIC_PATHS.indexOf(location.pathname) === -1) return;
  window.__rdpAdLoaded = true;
  var s = document.createElement('script');
  s.async = true;
  s.setAttribute('data-cmp-ab', '2');
  s.src = 'https://tp-em.com/NTU3NDg1.js?t=557485';
  document.head.appendChild(s);
})();
