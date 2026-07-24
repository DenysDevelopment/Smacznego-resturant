const PATHS: Record<string, React.ReactNode> = {
  cart: (<><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M2 3h3l2.2 12h11l2-8H6" /></>),
  search: (<><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></>),
  clock: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  truck: (<><path d="M2 6h11v9H2zM13 9h4l3 3v3h-7z" /><circle cx="7" cy="18" r="1.6" /><circle cx="17" cy="18" r="1.6" /></>),
  gift: (<><path d="M3 11h18v9H3zM3 7h18v4H3zM12 7v13M12 7S10 3 7.5 4 9 7 12 7zM12 7s2-4 4.5-3S15 7 12 7z" /></>),
  receipt: (<><path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6" /></>),
  trash: (<><path d="M4 7h16" /><path d="M10 11v6M14 11v6" /><path d="M6 7l1 13h10l1-13" /><path d="M9 7V4h6v3" /></>),
  globe: (<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></>),
  chevron: (<path d="M6 9l6 6 6-6" />),
  plus: (<path d="M12 5v14M5 12h14" />),
  phone: (<path d="M5 3h4l2 5-3 2a12 12 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z" />),
  pin: (<><path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></>),
  wallet: (<><path d="M3 7h15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a1 1 0 0 1-1-1z" /><path d="M3 7V6a2 2 0 0 1 2-2h11" /><circle cx="16.5" cy="13" r="1.3" /></>),
  card: (<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h4" /></>),
  check: (<path d="M4 12l5 5L20 6" />),
  bars: (<path d="M4 7h16M4 12h16M4 17h16" />),
  close: (<path d="M6 6l12 12M18 6L6 18" />),
  fries: (<><path d="M6.5 10h11l-1.2 10h-8.6z" /><path d="M9 10V4M12 10V2.5M15 10V5" /></>),
  potato: (<><ellipse cx="12" cy="12" rx="8" ry="5.5" /><path d="M9 10.5h.01M13.5 13h.01M15.5 10h.01" /></>),
  grain: (<><path d="M3.5 11h17a8.5 8.5 0 0 1-17 0z" /><path d="M8 8.5l1 2M12 7v3.5M16 8.5l-1 2" /></>),
  salad: (<><path d="M5 19c0-8 6-14 14-14 0 8-6 14-14 14z" /><path d="M5.5 18.5c4-4 7-6 11-8" /></>),
}

export type IconName = keyof typeof PATHS

export function Icon({ name, size = 16, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {PATHS[name]}
    </svg>
  )
}
