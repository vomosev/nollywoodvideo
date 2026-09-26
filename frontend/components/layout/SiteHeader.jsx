'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../lib/AuthContext';
import Button from '../ui/Button';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/browse', label: 'Browse' },
  { href: '/watchlist', label: 'My Watchlist' },
];

export default function SiteHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, status, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    function onKeyDown(event) {
      if (event.key === 'Escape') setMenuOpen(false);
    }
    function onPointerDown(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [menuOpen]);

  function handleSearch(event) {
    event.preventDefault();
    const term = query.trim();
    setMenuOpen(false);
    router.push(term ? `/browse?q=${encodeURIComponent(term)}` : '/browse');
  }

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await logout();
    } catch (err) {
      // Session may already be gone on the server; fall through to redirect.
    } finally {
      setSigningOut(false);
      setMenuOpen(false);
      router.push('/');
    }
  }

  function isActive(href) {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const authenticated = status === 'authenticated' && user;

  return (
    <header className="site-header">
      <div className="container site-header__inner" ref={menuRef}>
        <Link href="/" className="brand" aria-label="NollywoodVideo home">
          <svg
            className="brand__mark"
            viewBox="0 0 32 32"
            width="32"
            height="32"
            role="img"
            aria-hidden="true"
            focusable="false"
          >
            <rect x="1" y="5" width="30" height="22" rx="5" fill="currentColor" opacity="0.16" />
            <rect
              x="1.75"
              y="5.75"
              width="28.5"
              height="20.5"
              rx="4.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path d="M13 11.5 L22 16 L13 20.5 Z" fill="currentColor" />
            <circle cx="6.5" cy="10" r="1.2" fill="currentColor" />
            <circle cx="6.5" cy="16" r="1.2" fill="currentColor" />
            <circle cx="6.5" cy="22" r="1.2" fill="currentColor" />
          </svg>
          <span className="brand__text">
            Nollywood<span className="brand__text-accent">Video</span>
          </span>
        </Link>

        <button
          type="button"
          className="site-header__toggle"
          aria-expanded={menuOpen}
          aria-controls="site-nav"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
            {menuOpen ? (
              <path
                d="M6 6 L18 18 M18 6 L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
            ) : (
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
            )}
          </svg>
          <span className="visually-hidden">{menuOpen ? 'Close menu' : 'Open menu'}</span>
        </button>

        <div
          id="site-nav"
          className={menuOpen ? 'site-header__panel is-open' : 'site-header__panel'}
        >
          <nav className="site-nav" aria-label="Primary">
            <ul className="site-nav__list">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={isActive(link.href) ? 'site-nav__link is-active' : 'site-nav__link'}
                    aria-current={isActive(link.href) ? 'page' : undefined}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <form className="site-search" role="search" onSubmit={handleSearch}>
            <label className="visually-hidden" htmlFor="site-search-input">
              Search Nollywood titles
            </label>
            <input
              id="site-search-input"
              className="site-search__input"
              type="search"
              name="q"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search titles, directors…"
              autoComplete="off"
            />
            <Button type="submit" variant="secondary" size="sm">
              Search
            </Button>
          </form>

          <div className="site-header__auth">
            {status === 'loading' ? (
              <span className="site-header__auth-hint">Checking session…</span>
            ) : authenticated ? (
              <>
                <span className="site-header__user text-wrap-safe">
                  Hi, {user.name ? user.name.split(' ')[0] : 'there'}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  loading={signingOut}
                  disabled={signingOut}
                >
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <Button as="a" href="/login" variant="ghost" size="sm">
                  Sign in
                </Button>
                <Button as="a" href="/signup" variant="primary" size="sm">
                  Create account
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}