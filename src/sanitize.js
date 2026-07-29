// Minimal HTML sanitizer for provider-supplied markup rendered via
// dangerouslySetInnerHTML (e.g. Nuitée hotel descriptions). Strips dangerous
// elements, inline event handlers, and javascript: URLs while keeping basic
// formatting. Defense-in-depth for a trusted provider — not a full sanitizer.
export function sanitizeHtml(html) {
  if (!html || typeof html !== 'string') return '';
  return html
    // paired dangerous tags + their content
    .replace(/<\s*(script|style|iframe|object|embed|svg|math)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    // self-closing / void dangerous tags
    .replace(/<\s*(script|style|iframe|object|embed|link|meta|base|svg|math)\b[^>]*\/?>/gi, '')
    // inline event handlers (onclick=, onerror=, …)
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    // javascript: URLs in href/src
    .replace(/(href|src|xlink:href)\s*=\s*(["']?)\s*javascript:[^"'>\s]*\2/gi, '$1="#"');
}
