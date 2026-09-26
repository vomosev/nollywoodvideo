'use client';

import Link from 'next/link';
import Spinner from './Spinner';

const VARIANTS = ['primary', 'secondary', 'ghost', 'danger'];
const SIZES = ['sm', 'md', 'lg'];

export default function Button({
  variant = 'primary',
  size = 'md',
  as = 'button',
  href,
  type = 'button',
  disabled = false,
  loading = false,
  fullWidth = false,
  onClick,
  className = '',
  children,
  ...rest
}) {
  const safeVariant = VARIANTS.includes(variant) ? variant : 'primary';
  const safeSize = SIZES.includes(size) ? size : 'md';

  const classes = [
    'btn',
    `btn--${safeVariant}`,
    `btn--${safeSize}`,
    fullWidth ? 'btn--block' : '',
    loading ? 'btn--loading' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      {loading ? <Spinner size="sm" label="Working" /> : null}
      <span className="btn__label">{children}</span>
    </>
  );

  const isDisabled = Boolean(disabled || loading);

  function handleClick(event) {
    if (isDisabled) {
      event.preventDefault();
      return;
    }
    if (typeof onClick === 'function') {
      onClick(event);
    }
  }

  if (as === 'a') {
    if (!href || isDisabled) {
      return (
        <span
          className={classes}
          role="link"
          aria-disabled="true"
          aria-busy={loading ? 'true' : undefined}
          {...rest}
        >
          {content}
        </span>
      );
    }

    const isExternal = /^https?:\/\//i.test(href) || href.startsWith('mailto:');

    if (isExternal) {
      return (
        <a
          className={classes}
          href={href}
          onClick={handleClick}
          aria-busy={loading ? 'true' : undefined}
          rel="noreferrer noopener"
          {...rest}
        >
          {content}
        </a>
      );
    }

    return (
      <Link
        className={classes}
        href={href}
        onClick={handleClick}
        aria-busy={loading ? 'true' : undefined}
        {...rest}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      className={classes}
      type={type}
      disabled={isDisabled}
      aria-busy={loading ? 'true' : undefined}
      onClick={handleClick}
      {...rest}
    >
      {content}
    </button>
  );
}