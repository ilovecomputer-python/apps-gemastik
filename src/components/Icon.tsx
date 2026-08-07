export type IconName =
  | "home"
  | "scan"
  | "heart"
  | "heart-filled"
  | "user"
  | "settings"
  | "cart"
  | "search"
  | "back"
  | "chevron-right"
  | "star"
  | "moon"
  | "store"
  | "package"
  | "shield"
  | "sliders"
  | "camera"
  | "upload"
  | "sparkle"
  | "ticket"
  | "face";

interface IconProps {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

const PATHS: Record<IconName, React.ReactNode> = {
  home: (
    <path d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" />
  ),
  scan: (
    <>
      <path d="M4 8V5a1 1 0 0 1 1-1h3" />
      <path d="M16 4h3a1 1 0 0 1 1 1v3" />
      <path d="M20 16v3a1 1 0 0 1-1 1h-3" />
      <path d="M8 20H5a1 1 0 0 1-1-1v-3" />
      <circle cx="12" cy="12" r="3.2" />
    </>
  ),
  heart: (
    <path d="M12 20.2s-7.2-4.5-9.6-9.1C.9 8 2.4 4.6 6 4c2-.3 3.7.6 6 3 2.3-2.4 4-3.3 6-3 3.6.6 5.1 4 3.6 7.1-2.4 4.6-9.6 9.1-9.6 9.1z" />
  ),
  "heart-filled": (
    <path
      d="M12 20.2s-7.2-4.5-9.6-9.1C.9 8 2.4 4.6 6 4c2-.3 3.7.6 6 3 2.3-2.4 4-3.3 6-3 3.6.6 5.1 4 3.6 7.1-2.4 4.6-9.6 9.1-9.6 9.1z"
      fill="currentColor"
      stroke="none"
    />
  ),
  user: (
    <>
      <circle cx="12" cy="8.2" r="3.4" />
      <path d="M4.5 20c1-3.6 4-5.6 7.5-5.6s6.5 2 7.5 5.6" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2.2M12 18.8V21M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M3 12h2.2M18.8 12H21M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6" />
    </>
  ),
  cart: (
    <>
      <path d="M4 5h2l1.2 10.4a1.5 1.5 0 0 0 1.5 1.35h8a1.5 1.5 0 0 0 1.48-1.24L20 8H6.3" />
      <circle cx="9.5" cy="20" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="17" cy="20" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  search: (
    <>
      <circle cx="10.8" cy="10.8" r="6.2" />
      <path d="M20 20l-4.5-4.5" />
    </>
  ),
  back: <path d="M15 5 8 12l7 7" />,
  "chevron-right": <path d="M9 5l7 7-7 7" />,
  star: (
    <path d="M12 3.5l2.5 5.4 5.9.6-4.4 4 1.2 5.9-5.2-3-5.2 3 1.2-5.9-4.4-4 5.9-.6z" />
  ),
  moon: <path d="M20 14.2A8.5 8.5 0 1 1 9.8 4 6.8 6.8 0 0 0 20 14.2z" />,
  store: (
    <>
      <path d="M4 9.5 5 4h14l1 5.5" />
      <path d="M4 9.5a2.3 2.3 0 0 0 4.4 1 2.3 2.3 0 0 0 4.4 0 2.3 2.3 0 0 0 4.4 0 2.3 2.3 0 0 0 4.4-1" />
      <path d="M5.5 10.5V20h13v-9.5" />
    </>
  ),
  package: (
    <>
      <path d="M3.5 7.5 12 3l8.5 4.5-8.5 4.5-8.5-4.5z" />
      <path d="M3.5 7.5V16l8.5 4.5V12" />
      <path d="M20.5 7.5V16L12 20.5" />
    </>
  ),
  shield: (
    <path d="M12 3.5 19 6v6c0 4.5-3 7.5-7 8.5C8 19.5 5 16.5 5 12V6z" />
  ),
  sliders: (
    <>
      <path d="M4 6h10M18 6h2M4 18h2M8 18h12M4 12h6M14 12h6" />
      <circle cx="16" cy="6" r="2" fill="var(--card)" />
      <circle cx="6" cy="18" r="2" fill="var(--card)" />
      <circle cx="10" cy="12" r="2" fill="var(--card)" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13" r="3.2" />
    </>
  ),
  upload: (
    <>
      <path d="M12 15V4M8 8l4-4 4 4" />
      <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </>
  ),
  sparkle: (
    <path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6z" />
  ),
  ticket: (
    <>
      <path d="M3 9.2V7a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2.2a2.8 2.8 0 0 0 0 5.6V17a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-2.2a2.8 2.8 0 0 0 0-5.6z" />
      <path d="M14 6v2M14 11v2M14 16v2" />
    </>
  ),
  face: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9 10.5h.01M15 10.5h.01M8.5 14.5c1 1.2 2.2 1.8 3.5 1.8s2.5-.6 3.5-1.8" />
    </>
  ),
};

export default function Icon({
  name,
  size = 20,
  strokeWidth = 1.8,
  className,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
