export function getInitials(title = '') {
  const words = String(title)
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return 'NV';
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function normaliseHue(hue, title) {
  const parsed = Number(hue);
  if (Number.isFinite(parsed)) {
    return ((Math.round(parsed) % 360) + 360) % 360;
  }
  // Deterministic fallback derived from the title so a poster never changes between renders.
  const source = String(title || 'NollywoodVideo');
  let sum = 0;
  for (let i = 0; i < source.length; i += 1) {
    sum = (sum * 31 + source.charCodeAt(i)) % 360;
  }
  return sum;
}

export default function PosterArt({ title = 'Untitled', hue, size = 'md' }) {
  const safeTitle = String(title || 'Untitled');
  const h = normaliseHue(hue, safeTitle);
  const initials = getInitials(safeTitle);
  const gradientId = `poster-grad-${h}-${initials.replace(/[^A-Z0-9]/gi, '') || 'NV'}`;
  const sizeClass =
    size === 'sm' ? 'poster--sm' : size === 'lg' ? 'poster--lg' : 'poster--md';

  return (
    <div className={`poster ${sizeClass}`} aria-hidden="false">
      <svg
        className="poster__art"
        viewBox="0 0 200 300"
        role="img"
        aria-label={`Poster artwork for ${safeTitle}`}
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={`hsl(${h} 62% 38%)`} />
            <stop offset="55%" stopColor={`hsl(${(h + 24) % 360} 58% 24%)`} />
            <stop offset="100%" stopColor={`hsl(${(h + 48) % 360} 48% 14%)`} />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="200" height="300" fill={`url(#${gradientId})`} />

        <g opacity="0.22" fill="none" stroke={`hsl(${(h + 180) % 360} 80% 88%)`} strokeWidth="1.5">
          <circle cx="158" cy="56" r="42" />
          <circle cx="158" cy="56" r="28" />
          <circle cx="34" cy="252" r="56" />
        </g>

        <g opacity="0.16" fill={`hsl(${(h + 200) % 360} 70% 92%)`}>
          <rect x="0" y="182" width="200" height="2" />
          <rect x="0" y="196" width="200" height="2" />
        </g>

        <text
          x="100"
          y="152"
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
          fontSize="76"
          fontWeight="700"
          letterSpacing="2"
          fill={`hsl(${(h + 30) % 360} 92% 94%)`}
        >
          {initials}
        </text>

        <text
          x="100"
          y="232"
          textAnchor="middle"
          fontFamily="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
          fontSize="11"
          letterSpacing="4"
          fill={`hsl(${(h + 30) % 360} 60% 88%)`}
          opacity="0.85"
        >
          NOLLYWOOD
        </text>
      </svg>
    </div>
  );
}