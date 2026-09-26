import React from 'react';

/**
 * Card — presentational surface primitive.
 * All styling lives in app/globals.css (classes: card, card--interactive,
 * card--pad-sm|md|lg, card--raised, card__media, card__body, card__footer).
 */
export default function Card({
  as: Tag = 'div',
  interactive = false,
  raised = false,
  padding = 'md',
  className = '',
  children,
  ...rest
}) {
  const pad = ['sm', 'md', 'lg'].includes(padding) ? padding : 'md';

  const classes = [
    'card',
    `card--pad-${pad}`,
    interactive ? 'card--interactive' : '',
    raised ? 'card--raised' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const interactiveProps =
    interactive && Tag !== 'a' && Tag !== 'button' ? { tabIndex: 0 } : {};

  return (
    <Tag className={classes} {...interactiveProps} {...rest}>
      {children}
    </Tag>
  );
}

export function CardMedia({ className = '', children, ...rest }) {
  return (
    <div className={['card__media', className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </div>
  );
}

export function CardBody({ className = '', children, ...rest }) {
  return (
    <div className={['card__body', className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </div>
  );
}

export function CardFooter({ className = '', children, ...rest }) {
  return (
    <div className={['card__footer', className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </div>
  );
}