/**
 * ResDrop brand mark — the uploaded logo, background removed and pre-sized.
 *
 * Assets are generated from public/resdrop-logo.png:
 *   /logo-mark.png  512x512 transparent square (droplet mark) — used here
 *   /logo-full.png  446x256 transparent full lockup (mark + RESDROP wordmark)
 *
 * `objectFit: contain` (never `cover`) so the mark is scaled, never cropped.
 */
function Logo({ size = 30, className = '' }) {
  return (
    <img
      src="/logo-mark.png"
      alt=""
      width={size}
      height={size}
      className={className}
      style={{ display: 'block', objectFit: 'contain', flexShrink: 0 }}
    />
  );
}

export default Logo;
