/**
 * ResDrop Icon System
 * SVG icons replacing all emojis throughout the app.
 * Each icon accepts size (default 24) and className props.
 */

const defaultProps = (size, className) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  className: className || '',
});

export function IconHotel({ size = 24, className }) {
  return (
    <svg {...defaultProps(size, className)}>
      <path d="M3 21V7a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v14" />
      <path d="M13 10h6a2 2 0 0 1 2 2v9" />
      <path d="M3 21h18" />
      <path d="M7 9h2" /><path d="M7 13h2" /><path d="M7 17h2" />
      <path d="M15 13h2" /><path d="M15 17h2" />
    </svg>
  );
}

export function IconCalendar({ size = 24, className }) {
  return (
    <svg {...defaultProps(size, className)}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" />
    </svg>
  );
}

export function IconDollar({ size = 24, className }) {
  return (
    <svg {...defaultProps(size, className)}>
      <path d="M12 2v20" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

export function IconTrendDown({ size = 24, className }) {
  return (
    <svg {...defaultProps(size, className)}>
      <polyline points="22 17 13.5 8.5 8.5 13.5 2 7" />
      <polyline points="16 17 22 17 22 11" />
    </svg>
  );
}

export function IconTrendUp({ size = 24, className }) {
  return (
    <svg {...defaultProps(size, className)}>
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}

export function IconBell({ size = 24, className }) {
  return (
    <svg {...defaultProps(size, className)}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

export function IconUser({ size = 24, className }) {
  return (
    <svg {...defaultProps(size, className)}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function IconUsers({ size = 24, className }) {
  return (
    <svg {...defaultProps(size, className)}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function IconLock({ size = 24, className }) {
  return (
    <svg {...defaultProps(size, className)}>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export function IconSearch({ size = 24, className }) {
  return (
    <svg {...defaultProps(size, className)}>
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

export function IconArrowRight({ size = 24, className }) {
  return (
    <svg {...defaultProps(size, className)}>
      <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
    </svg>
  );
}

export function IconArrowLeft({ size = 24, className }) {
  return (
    <svg {...defaultProps(size, className)}>
      <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
    </svg>
  );
}

export function IconCheck({ size = 24, className }) {
  return (
    <svg {...defaultProps(size, className)}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function IconX({ size = 24, className }) {
  return (
    <svg {...defaultProps(size, className)}>
      <path d="M18 6L6 18" /><path d="M6 6l12 12" />
    </svg>
  );
}

export function IconStar({ size = 24, className }) {
  return (
    <svg {...defaultProps(size, className)}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

export function IconShield({ size = 24, className }) {
  return (
    <svg {...defaultProps(size, className)}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

export function IconChart({ size = 24, className }) {
  return (
    <svg {...defaultProps(size, className)}>
      <path d="M3 3v18h18" />
      <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
    </svg>
  );
}

export function IconRefresh({ size = 24, className }) {
  return (
    <svg {...defaultProps(size, className)}>
      <path d="M1 4v6h6" /><path d="M23 20v-6h-6" />
      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
    </svg>
  );
}

export function IconMail({ size = 24, className }) {
  return (
    <svg {...defaultProps(size, className)}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M22 7l-10 7L2 7" />
    </svg>
  );
}

export function IconGlobe({ size = 24, className }) {
  return (
    <svg {...defaultProps(size, className)}>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

export function IconClock({ size = 24, className }) {
  return (
    <svg {...defaultProps(size, className)}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export function IconZap({ size = 24, className }) {
  return (
    <svg {...defaultProps(size, className)}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

export function IconTarget({ size = 24, className }) {
  return (
    <svg {...defaultProps(size, className)}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

export function IconBarChart({ size = 24, className }) {
  return (
    <svg {...defaultProps(size, className)}>
      <path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" />
    </svg>
  );
}

export function IconPercent({ size = 24, className }) {
  return (
    <svg {...defaultProps(size, className)}>
      <path d="M19 5L5 19" />
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
  );
}

export function IconCreditCard({ size = 24, className }) {
  return (
    <svg {...defaultProps(size, className)}>
      <rect x="1" y="4" width="22" height="16" rx="2" />
      <path d="M1 10h22" />
    </svg>
  );
}

export function IconSettings({ size = 24, className }) {
  return (
    <svg {...defaultProps(size, className)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export function IconLink({ size = 24, className }) {
  return (
    <svg {...defaultProps(size, className)}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

export function IconActivity({ size = 24, className }) {
  return (
    <svg {...defaultProps(size, className)}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

export function IconServer({ size = 24, className }) {
  return (
    <svg {...defaultProps(size, className)}>
      <rect x="2" y="2" width="20" height="8" rx="2" />
      <rect x="2" y="14" width="20" height="8" rx="2" />
      <circle cx="6" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="6" cy="18" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconDatabase({ size = 24, className }) {
  return (
    <svg {...defaultProps(size, className)}>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}

export function IconUpload({ size = 24, className }) {
  return (
    <svg {...defaultProps(size, className)}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

export function IconEye({ size = 24, className }) {
  return (
    <svg {...defaultProps(size, className)}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function IconCrown({ size = 24, className }) {
  return (
    <svg {...defaultProps(size, className)}>
      <path d="M2 20h20" />
      <path d="M3.5 14.5L2 6l5.5 4L12 4l4.5 6L22 6l-1.5 8.5" />
      <path d="M3.5 14.5h17v4a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-4z" />
    </svg>
  );
}

export function IconMoon({ size = 24, className }) {
  return (
    <svg {...defaultProps(size, className)}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export function IconBed({ size = 24, className }) {
  return (
    <svg {...defaultProps(size, className)}>
      <path d="M2 4v16" />
      <path d="M2 8h18a2 2 0 0 1 2 2v10" />
      <path d="M2 17h20" />
      <path d="M6 8v3" />
    </svg>
  );
}

export function IconMapPin({ size = 24, className }) {
  return (
    <svg {...defaultProps(size, className)}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

export function IconPlus({ size = 24, className }) {
  return (
    <svg {...defaultProps(size, className)}>
      <path d="M12 5v14" /><path d="M5 12h14" />
    </svg>
  );
}

export function IconMinus({ size = 24, className }) {
  return (
    <svg {...defaultProps(size, className)}>
      <path d="M5 12h14" />
    </svg>
  );
}

export function IconChevronDown({ size = 24, className }) {
  return (
    <svg {...defaultProps(size, className)}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export function IconExternalLink({ size = 24, className }) {
  return (
    <svg {...defaultProps(size, className)}>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

export function IconAward({ size = 24, className }) {
  return (
    <svg {...defaultProps(size, className)}>
      <circle cx="12" cy="8" r="7" />
      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
    </svg>
  );
}

export function IconMenu({ size = 24, className }) {
  return (
    <svg {...defaultProps(size, className)}>
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

export function IconPlay({ size = 24, className }) {
  return (
    <svg {...defaultProps(size, className)}>
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

export function IconInfinity({ size = 24, className }) {
  return (
    <svg {...defaultProps(size, className)}>
      <path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.74-8z" />
    </svg>
  );
}

// Logo mark for ResDrop
export function IconBriefcase({ size = 24, className }) {
  return (
    <svg {...defaultProps(size, className)}>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      <path d="M2 12h20" />
    </svg>
  );
}

export function IconFamily({ size = 24, className }) {
  return (
    <svg {...defaultProps(size, className)}>
      <circle cx="12" cy="5" r="3" />
      <path d="M12 8c-3 0-5 2-5 4v1h10v-1c0-2-2-4-5-4z" />
      <circle cx="5" cy="11" r="2" />
      <path d="M5 13c-2 0-3.5 1.5-3.5 3v0.5h7v-0.5c0-1.5-1.5-3-3.5-3z" />
      <circle cx="19" cy="11" r="2" />
      <path d="M19 13c-2 0-3.5 1.5-3.5 3v0.5h7v-0.5c0-1.5-1.5-3-3.5-3z" />
    </svg>
  );
}

export function IconHeart({ size = 24, className }) {
  return (
    <svg {...defaultProps(size, className)}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

export function IconTrash({ size = 24, className }) {
  return (
    <svg {...defaultProps(size, className)}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

export function LogoMark({ size = 32, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <path d="M16 2C10.5 2 6 6.2 6 11.5C6 18.5 16 30 16 30C16 30 26 18.5 26 11.5C26 6.2 21.5 2 16 2Z" fill="url(#goldGrad)" />
      <path d="M11 13.5l3.5 3.5L21 10" stroke="#0A1628" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="20.5" cy="5.5" r="1" fill="#F5D680" />
      <circle cx="23" cy="8" r="0.7" fill="#F5D680" />
      <defs>
        <linearGradient id="goldGrad" x1="6" y1="2" x2="26" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F5D680" />
          <stop offset="50%" stopColor="#C9A84C" />
          <stop offset="100%" stopColor="#A67C2E" />
        </linearGradient>
      </defs>
    </svg>
  );
}
