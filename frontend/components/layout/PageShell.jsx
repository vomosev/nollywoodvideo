'use client';

import SiteHeader from './SiteHeader';
import SiteFooter from './SiteFooter';

export default function PageShell({
  eyebrow,
  title,
  description,
  actions,
  wide = false,
  children,
}) {
  const hasHeading = Boolean(eyebrow || title || description || actions);

  return (
    <div className="page-shell">
      <SiteHeader />

      <main
        id="main-content"
        className={wide ? 'container container--wide page-main' : 'container page-main'}
      >
        {hasHeading ? (
          <header className="page-heading">
            <div className="page-heading__text">
              {eyebrow ? <p className="page-heading__eyebrow">{eyebrow}</p> : null}
              {title ? <h1 className="page-heading__title text-wrap-safe">{title}</h1> : null}
              {description ? (
                <p className="page-heading__description">{description}</p>
              ) : null}
            </div>
            {actions ? <div className="page-heading__actions cluster">{actions}</div> : null}
          </header>
        ) : null}

        {children}
      </main>

      <SiteFooter />
    </div>
  );
}