const TONES = ['neutral', 'accent', 'success', 'warning', 'danger'];

export default function Badge({
  tone = 'neutral',
  as: Tag = 'span',
  className = '',
  children,
  ...rest
}) {
  const safeTone = TONES.includes(tone) ? tone : 'neutral';
  const classes = ['badge', `badge--${safeTone}`, className]
    .filter(Boolean)
    .join(' ');

  if (children === null || children === undefined || children === '') {
    return null;
  }

  return (
    <Tag className={classes} {...rest}>
      {children}
    </Tag>
  );
}