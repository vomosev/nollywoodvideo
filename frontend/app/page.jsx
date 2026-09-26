'use client';

import { useCallback, useEffect, useState } from 'react';
import PageShell from '../components/layout/PageShell';
import HeroFeature from '../components/movies/HeroFeature';
import MovieGrid from '../components/movies/MovieGrid';
import { getFeatured, getMovies, getWatchlist, addToWatchlist, removeFromWatchlist } from '../lib/api';
import { useAuth } from '../lib/AuthContext';

const VALUE_POINTS = [
  {
    title: 'Licensed, straight from the studio',
    body: 'Every title on NollywoodVideo is distributed under a direct agreement with its producer, so filmmakers are paid for each stream.'
  },
  {
    title: 'Curated by people who watch',
    body: 'Our programmers screen each release from Surulere to Enugu and write the notes you read on every title page.'
  },
  {
    title: 'Watch on anything',
    body: 'Adaptive playback works on phones, tablets, laptops and living-room browsers — pick up where you left off, no extra app required.'
  }
];

export default function HomePage() {
  const { status } = useAuth();

  const [featured, setFeatured] = useState(null);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [featuredError, setFeaturedError] = useState(null);

  const [newReleases, setNewReleases] = useState([]);
  const [newLoading, setNewLoading] = useState(true);
  const [newError, setNewError] = useState(null);

  const [trending, setTrending] = useState([]);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [trendingError, setTrendingError] = useState(null);

  const [watchlistIds, setWatchlistIds] = useState([]);
  const [reloadKey, setReloadKey] = useState(0);

  const retry = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setFeaturedLoading(true);
    setFeaturedError(null);
    setNewLoading(true);
    setNewError(null);
    setTrendingLoading(true);
    setTrendingError(null);

    getFeatured({ signal: controller.signal })
      .then((data) => {
        if (!active) return;
        const items = Array.isArray(data) ? data : data && Array.isArray(data.items) ? data.items : [];
        setFeatured(items.length > 0 ? items[0] : null);
      })
      .catch((err) => {
        if (!active || controller.signal.aborted) return;
        setFeatured(null);
        setFeaturedError(err && err.message ? err.message : 'Service unavailable');
      })
      .finally(() => {
        if (active) setFeaturedLoading(false);
      });

    getMovies({ sort: 'newest', limit: 8 }, { signal: controller.signal })
      .then((data) => {
        if (!active) return;
        const items = data && Array.isArray(data.items) ? data.items : Array.isArray(data) ? data : [];
        setNewReleases(items);
      })
      .catch((err) => {
        if (!active || controller.signal.aborted) return;
        setNewReleases([]);
        setNewError(err && err.message ? err.message : 'Service unavailable');
      })
      .finally(() => {
        if (active) setNewLoading(false);
      });

    getMovies({ sort: 'rating', limit: 8 }, { signal: controller.signal })
      .then((data) => {
        if (!active) return;
        const items = data && Array.isArray(data.items) ? data.items : Array.isArray(data) ? data : [];
        setTrending(items);
      })
      .catch((err) => {
        if (!active || controller.signal.aborted) return;
        setTrending([]);
        setTrendingError(err && err.message ? err.message : 'Service unavailable');
      })
      .finally(() => {
        if (active) setTrendingLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [reloadKey]);

  useEffect(() => {
    if (status !== 'authenticated') {
      setWatchlistIds([]);
      return undefined;
    }
    const controller = new AbortController();
    let active = true;

    getWatchlist({ signal: controller.signal })
      .then((data) => {
        if (!active) return;
        const items = Array.isArray(data) ? data : data && Array.isArray(data.items) ? data.items : [];
        setWatchlistIds(items.map((m) => Number(m.id)).filter((id) => !Number.isNaN(id)));
      })
      .catch(() => {
        if (active) setWatchlistIds([]);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [status, reloadKey]);

  const handleToggleWatchlist = useCallback(
    async (movie, shouldAdd) => {
      if (!movie || status !== 'authenticated') return;
      const movieId = Number(movie.id);
      if (Number.isNaN(movieId)) return;

      const previous = watchlistIds;
      setWatchlistIds((ids) => (shouldAdd ? [...ids, movieId] : ids.filter((id) => id !== movieId)));

      try {
        if (shouldAdd) {
          await addToWatchlist(movieId);
        } else {
          await removeFromWatchlist(movieId);
        }
      } catch (err) {
        setWatchlistIds(previous);
      }
    },
    [status, watchlistIds]
  );

  const isInWatchlist = (movie) => watchlistIds.includes(Number(movie && movie.id));

  return (
    <PageShell>
      <section className="home-hero-section">
        <HeroFeature movie={featured} loading={featuredLoading} />
        {!featuredLoading && featuredError ? (
          <p className="notice notice--warning text-wrap-safe">
            We could not load the featured title right now. The rest of the catalogue is still below.
          </p>
        ) : null}
      </section>

      <section className="home-section" aria-labelledby="new-this-week">
        <h2 id="new-this-week">New this week</h2>
        <p>Fresh cinema and straight-to-stream premieres added to the catalogue in the last seven days.</p>
        <MovieGrid
          movies={newReleases}
          loading={newLoading}
          error={newError}
          onRetry={retry}
          emptyTitle="Nothing new just yet"
          emptyDescription="Our programmers are finishing the next batch of licensing paperwork. Check back on Friday."
          isInWatchlist={isInWatchlist}
          onToggleWatchlist={handleToggleWatchlist}
        />
      </section>

      <section className="home-section" aria-labelledby="trending-now">
        <h2 id="trending-now">Trending on NollywoodVideo</h2>
        <p>The highest rated titles this month, ranked by viewer reviews across the platform.</p>
        <MovieGrid
          movies={trending}
          loading={trendingLoading}
          error={trendingError}
          onRetry={retry}
          emptyTitle="No ratings yet"
          emptyDescription="Be the first to review a film and help other viewers find their next watch."
          isInWatchlist={isInWatchlist}
          onToggleWatchlist={handleToggleWatchlist}
        />
      </section>

      <section className="home-section value-strip" aria-labelledby="why-nollywoodvideo">
        <h2 id="why-nollywoodvideo">Why NollywoodVideo</h2>
        <ul className="value-strip__list">
          {VALUE_POINTS.map((point) => (
            <li key={point.title} className="value-strip__item">
              <h3 className="text-wrap-safe">{point.title}</h3>
              <p className="text-wrap-safe">{point.body}</p>
            </li>
          ))}
        </ul>
      </section>
    </PageShell>
  );
}