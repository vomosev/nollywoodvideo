import Link from 'next/link';

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="site-footer__grid">
          <section className="site-footer__col">
            <h2 className="site-footer__heading">About NollywoodVideo</h2>
            <p className="site-footer__text">
              We license and distribute Nollywood cinema directly from Lagos, Enugu and Asaba
              studios, paying filmmakers per stream. Every title on the platform is cleared for
              worldwide viewing.
            </p>
          </section>

          <nav className="site-footer__col" aria-label="Browse the catalogue">
            <h2 className="site-footer__heading">Browse</h2>
            <ul className="site-footer__list">
              <li>
                <Link href="/browse">All titles</Link>
              </li>
              <li>
                <Link href="/browse?genre=drama">Drama</Link>
              </li>
              <li>
                <Link href="/browse?genre=comedy">Comedy</Link>
              </li>
              <li>
                <Link href="/browse?genre=epic">Epic</Link>
              </li>
              <li>
                <Link href="/watchlist">My watchlist</Link>
              </li>
            </ul>
          </nav>

          <section className="site-footer__col">
            <h2 className="site-footer__heading">Contact &amp; legal</h2>
            <ul className="site-footer__list">
              <li>
                <a href="mailto:hello@nollywoodvideo.example">hello@nollywoodvideo.example</a>
              </li>
              <li>
                <a href="mailto:licensing@nollywoodvideo.example">Filmmaker licensing</a>
              </li>
              <li>
                <Link href="/browse?sort=title">Content guidelines</Link>
              </li>
            </ul>
            <p className="site-footer__text">
              Streaming rights are managed with our distribution partners. Report a title dispute
              and we respond within two business days.
            </p>
          </section>
        </div>

        <p className="site-footer__legal">
          &copy; {year} NollywoodVideo Distribution Ltd. All film titles remain the property of
          their respective rights holders.
        </p>
      </div>
    </footer>
  );
}