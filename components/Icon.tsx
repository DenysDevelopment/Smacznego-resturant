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
