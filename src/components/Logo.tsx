interface LogoProps {
  size?: number;
  className?: string;
}

/**
 * The AURA mark: eight translucent petals radiating from a lit core.
 *
 * Inlined rather than an <img> so it inherits nothing from the network and
 * stays crisp at every size — it is used from 18px in the header up to 96px on
 * the landing screen.
 */
export default function Logo({ size = 40, className }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 400 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="AURA"
    >
      <defs>
        <radialGradient id="aura-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="35%" stopColor="#FFF0E2" />
          <stop offset="70%" stopColor="#FFCDB3" />
          <stop offset="100%" stopColor="#F7A88E" />
        </radialGradient>
        <radialGradient id="aura-halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFD9C2" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#FFD9C2" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g style={{ mixBlendMode: "multiply" }} opacity="0.58">
        <g transform="translate(200 200)">
          {[
            "#2E7A85",
            "#AFC684",
            "#F2ACA4",
            "#2E7A85",
            "#AFC684",
            "#2E7A85",
            "#AFC684",
            "#F2ACA4",
          ].map((fill, i) => (
            <ellipse
              key={i}
              cx="0"
              cy="-62"
              rx="46"
              ry="104"
              fill={fill}
              transform={`rotate(${i * 45})`}
            />
          ))}
        </g>
      </g>

      <circle cx="200" cy="200" r="78" fill="url(#aura-halo)" />
      <circle cx="200" cy="200" r="46" fill="url(#aura-core)" />
    </svg>
  );
}
