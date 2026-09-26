'use client';

import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { SkeletonBlock } from '../ui/Spinner';
import PosterArt from './PosterArt';

function truncate(text, max) {
  if (!text || typeof text !== 'string') return '';
  const clean = text.trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

export default function HeroFeature({ movie, loading = false }) {
  if (loading) {
    return (
      <section className="hero hero--loading" aria-busy="true" aria-label="Loading featured title">
        <div className="hero__content stack">
          <SkeletonBlock height="1rem" width="9rem" />
          <SkeletonBlock height="2.5rem" width="80%" />
          <SkeletonBlock height="1rem" width="100%" />
          <SkeletonBlock height="1rem" width="92%" />
          <SkeletonBlock height="1rem" width="60%" />
          <div className="cluster">
            <SkeletonBlock height="44px" width="10rem" />
            <SkeletonBlock height="44px" width="11rem" />
          </div>
        </div>
        <div className="hero__art">
          <SkeletonBlock aspectRatio="2 / 3" width="100%" />
        </div>
      </section>
    );
  }

  if (!movie) {
    return (
      <section className="hero hero--empty" aria-label="Featured title">
        <div className="hero__content stack">
          <p className="eyebrow">Now streaming</p>
          <h1 className="text-wrap-safe">Nollywood, licensed and ready to play</h1>
          <p className="hero__lede">
            We are finalising this week&rsquo;s featured title. In the meantime, explore the full
            catalogue of Lagos dramas, Nsukka comedies and epic historicals streaming on
            NollywoodVideo.
          </p>
          <div className="cluster">
            <Button as="a" href="/browse" variant="primary" size="lg">
              Browse the catalogue
            </Button>
          </div>
        </div>
      </section>
    );
  }

  const genres = Array.isArray(movie.genres)
    ? movie.genres
    : typeof movie.genres === 'string' && movie.genres.length
      ? movie.genres.split(',').map((g) => g.trim()).filter(Boolean)
      : [];

  const href = `/movies/${movie.slug || movie.id}`;
  const metaBits = [
    movie.release_year,
    movie.runtime_minutes ? `${movie.runtime_minutes} min` : null,
    movie.language,
    movie.rating_label,
  ].filter(Boolean);

  return (
    <section className="hero" aria-label={`Featured title: ${movie.title}`}>
      <div className="hero__content stack">
        <p className="eyebrow">Now streaming</p>
        <h1 className="text-wrap-safe">{movie.title}</h1>

        {metaBits.length > 0 && (
          <p className="hero__meta">{metaBits.join(' • ')}</p>
        )}

        {genres.length > 0 && (
          <div className="cluster" aria-label="Genres">
            {genres.map((genre) => (
              <Badge key={genre} tone="accent">
                {genre}
              </Badge>
            ))}
          </div>
        )}

        <p className="hero__lede text-wrap-safe">
          {truncate(movie.synopsis, 320) ||
            'A brand new Nollywood release, licensed for streaming on NollywoodVideo.'}
        </p>

        <div className="cluster">
          <Button as="a" href={href} variant="primary" size="lg">
            Watch now
          </Button>
          <Button as="a" href={`${href}#watchlist`} variant="secondary" size="lg">
            Add to watchlist
          </Button>
        </div>
      </div>

      <div className="hero__art">
        <PosterArt title={movie.title} hue={movie.poster_hue} size="lg" />
      </div>
    </section>
  );
}