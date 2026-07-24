/**
 * ResDrop brand mark — a water droplet ("drop") holding a hotel building,
 * rendered as crisp inline SVG in the brand green. Replaces the 3.9MB PNG that
 * was being cropped to garbage at small sizes. Scales to any size, weighs
 * nothing, and stays aligned with the wordmark.
 */
function Logo({ size = 30, withWordmark = false, className = '' }) {
  const uid = 'rd-logo-grad';
  const mark = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <defs>
        <linearGradient id={uid} x1="6" y1="3" x2="26" y2="29" gradientUnits="userSpaceOnUse">
          <stop stopColor="#40916C" />
          <stop offset="1" stopColor="#1B4332" />
        </linearGradient>
      </defs>
      {/* Droplet */}
      <path
        d="M16 2.5C16 2.5 5.5 13.8 5.5 21a10.5 10.5 0 1 0 21 0C26.5 13.8 16 2.5 16 2.5Z"
        fill={`url(#${uid})`}
      />
      {/* Building silhouette inside the droplet */}
      <path
        d="M12.4 25.2V16.6l4-2.4 4 2.4v8.6Z"
        fill="#fff"
        fillOpacity="0.95"
      />
      {/* Windows */}
      <g fill="#40916C">
        <rect x="13.8" y="17.6" width="1.4" height="1.4" rx="0.3" />
        <rect x="17.0" y="17.6" width="1.4" height="1.4" rx="0.3" />
        <rect x="13.8" y="20.1" width="1.4" height="1.4" rx="0.3" />
        <rect x="17.0" y="20.1" width="1.4" height="1.4" rx="0.3" />
        <rect x="13.8" y="22.6" width="1.4" height="1.4" rx="0.3" />
        <rect x="17.0" y="22.6" width="1.4" height="1.4" rx="0.3" />
      </g>
    </svg>
  );

  if (!withWordmark) return mark;

  return (
    <span className={`rd-logo-lockup ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      {mark}
      <span className="rd-logo-wordmark" style={{ fontWeight: 800, letterSpacing: '-0.02em', color: '#1B4332' }}>
        ResDrop
      </span>
    </span>
  );
}

export default Logo;
