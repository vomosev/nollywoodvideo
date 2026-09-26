'use client';

import Button from './Button';

function EmptyIllustration() {
  return (
    <svg
      className="empty-state__art"
      viewBox="0 0 120 90"
      role="img"
      aria-label="An empty film reel"
      focusable="false"
    >
      <rect
        x="6"
        y="14"
        width="108"
        height="64"
        rx="8"
        fill="currentColor"
        opacity="0.08"
      />
      <rect
        x="6"
        y="14"
        width="108"
        height="64"
        rx="8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.35"
      />
      <circle cx="36" cy="46" r="13" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.55" />
      <circle cx="36" cy="46" r="3.5" fill="currentColor" opacity="0.55" />
      <circle cx="74" cy="38" r="8" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.4" />
      <circle cx="90" cy="58" r="5" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.4" />
      <path
        d="M18 78 L48 52 L66 66 L84 54 L102 78 Z"
        fill="currentColor"
        opacity="0.12"
      />
    </svg>
  );
}

function ErrorIllustration() {
  return (
    <svg
      className="empty-state__art"
      viewBox="0 0 120 90"
      role="img"
      aria-label="A disconnected signal"
      focusable="false"
    >
      <rect
        x="6"
        y="14"
        width="108"
        height="64"
        rx="8"
        fill="currentColor"
        opacity="0.08"
      />
      <rect
        x="6"
        y="14"
        width="108"
        height="64"
        rx="8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.35"
      />
      <path
        d="M60 30 L60 52"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.7"
      />
      <circle cx="60" cy="62" r="3.5" fill="currentColor" opacity="0.7" />
      <path
        d="M24 70 Q42 44 60 70"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.3"
      />
      <path
        d="M60 70 Q78 44 96 70"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.3"
      />
    </svg>
  );
}

export default function EmptyState({
  title = 'Nothing here yet',
  description = '',
  action = null,
  actionLabel = '',
  onAction = null,
  actionHref = '',
  icon = null,
}) {
  let actionNode = action;

  if (!actionNode && actionLabel) {
    if (actionHref) {
      actionNode = (
        <Button as="a" href={actionHref} variant="primary" size="md">
          {actionLabel}
        </Button>
      );
    } else if (typeof onAction === 'function') {
      actionNode = (
        <Button variant="primary" size="md" onClick={onAction}>
          {actionLabel}
        </Button>
      );
    }
  }

  return (
    <div className="empty-state" role="status">
      {icon || <EmptyIllustration />}
      <h3 className="empty-state__title text-wrap-safe">{title}</h3>
      {description ? (
        <p className="empty-state__description text-wrap-safe">{description}</p>
      ) : null}
      {actionNode ? <div className="empty-state__actions">{actionNode}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = 'We could not load this right now',
  description = 'The NollywoodVideo service did not respond. Check your connection and try again in a moment.',
  onRetry = null,
  retryLabel = 'Try again',
  retrying = false,
}) {
  return (
    <div className="empty-state empty-state--error" role="alert">
      <ErrorIllustration />
      <h3 className="empty-state__title text-wrap-safe">{title}</h3>
      {description ? (
        <p className="empty-state__description text-wrap-safe">{description}</p>
      ) : null}
      {typeof onRetry === 'function' ? (
        <div className="empty-state__actions">
          <Button
            variant="secondary"
            size="md"
            onClick={onRetry}
            loading={retrying}
          >
            {retryLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}