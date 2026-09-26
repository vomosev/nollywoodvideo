export default function Spinner({ size = 'md', label = 'Loading', className = '' }) {
  const sizeClass = ['sm', 'md', 'lg'].includes(size) ? `spinner--${size}` : 'spinner--md';
  const classes = ['spinner', sizeClass, className].filter(Boolean).join(' ');

  return (
    <span className={classes} role="status" aria-live="polite">
      <span className="spinner__ring" aria-hidden="true" />
      <span className="visually-hidden">{label}</span>
    </span>
  );
}

export function SkeletonBlock({
  height,
  aspectRatio,
  width = '100%',
  radius = 'md',
  className = '',
  label = 'Loading content',
}) {
  const radiusClass = ['sm', 'md', 'lg', 'pill'].includes(radius)
    ? `skeleton--radius-${radius}`
    : 'skeleton--radius-md';
  const classes = ['skeleton', radiusClass, className].filter(Boolean).join(' ');

  const style = { width };
  if (aspectRatio) {
    style.aspectRatio = aspectRatio;
  } else {
    style.height = height || 'var(--space-8)';
  }

  return (
    <span className={classes} style={style} role="status" aria-label={label}>
      <span className="visually-hidden">{label}</span>
    </span>
  );
}

export function SkeletonText({ lines = 3, className = '' }) {
  const count = Math.max(1, Number(lines) || 1);
  const items = Array.from({ length: count }, (_, index) => index);

  return (
    <span
      className={['skeleton-text', className].filter(Boolean).join(' ')}
      role="status"
      aria-label="Loading text"
    >
      {items.map((index) => (
        <SkeletonBlock
          key={index}
          height="var(--space-4)"
          width={index === count - 1 ? '60%' : '100%'}
          radius="sm"
          label=""
        />
      ))}
      <span className="visually-hidden">Loading text</span>
    </span>
  );
}