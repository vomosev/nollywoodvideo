'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

import PageShell from '../../../components/layout/PageShell';
import VideoPlayer from '../../../components/movies/VideoPlayer';
import ReviewSection from '../../../components/reviews/ReviewSection';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import Table from '../../../components/ui/Table';
import EmptyState, { ErrorState } from '../../../components/ui/EmptyState';
import { SkeletonBlock } from '../../../components/ui/Spinner';
import {
  getMovie,
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
} from '../../../lib/api';
import { useAuth } from '../../../lib/AuthContext';

function formatRuntime(minutes) {
  const total = Number(minutes);
  if (!total || Number.isNaN(total)) return 'Runtime not listed';
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours} hr`;
  return `${hours} hr ${rest} min`;
}

function formatRating(value, count) {
  const avg = Number(value);
  if (!avg || Number.isNaN(avg)) return 'No ratings yet';
  const reviews = Number(count) || 0;
  return `${avg.toFixed(1)} / 5 from ${reviews} ${reviews === 1 ? 'review' : 'reviews'}`;
}

export default function MovieDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, status: authStatus } = useAuth();

  const rawId = params && params.id;
  const idOrSlug = Array.isArray(rawId) ? rawId[0] : rawId;

  const [movie, setMovie] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | notfound | error
  const [errorMessage, setErrorMessage] = useState('');
  const [reloadToken, setReloadToken] = useState(0);

  const [inWatchlist, setInWatchlist] = useState(false);
  const [watchlistBusy, setWatchlistBusy] = useState(false);
  const [watchlistNotice, setWatchlistNotice] = useState('');

  useEffect(() => {
    if (!idOrSlug) {
      setStatus('notfound');
      return undefined;
    }

    let cancelled = false;
    const controller = new AbortController();

    setStatus('loading');
    setErrorMessage('');

    getMovie(idOrSlug, { signal: controller.signal })
      .then((data) => {
        if (cancelled) return;
        const record = data && data.movie ? data.movie : data;
        if (!record || !record.id) {
          setStatus('notfound');
          return;
        }
        setMovie(record);
        setStatus('ready');
      })
      .catch((err) => {
        if (cancelled || (err && err.name === 'AbortError')) return;
        if (err && err.status === 404) {
          setStatus('notfound');
          return;
        }
        setErrorMessage(
          (err && err.message) || 'We could not load this title right now.'
        );
        setStatus('error');
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [idOrSlug, reloadToken]);

  useEffect(() => {
    if (authStatus !== 'authenticated' || !movie) {
      setInWatchlist(false);
      return undefined;
    }

    let cancelled = false;
    const controller = new AbortController();

    getWatchlist({ signal: controller.signal })
      .then((data) => {
        if (cancelled) return;
        const items = (data && data.items) || [];
        setInWatchlist(items.some((item) => Number(item.id) === Number(movie.id)));
      })
      .catch(() => {
        if (!cancelled) setInWatchlist(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [authStatus, movie]);

  const handleWatchlistToggle = useCallback(async () => {
    if (!movie) return;
    if (authStatus !== 'authenticated' || !user) {
      const target = `/movies/${movie.slug || movie.id}`;
      router.push(`/login?next=${encodeURIComponent(target)}`);
      return;
    }

    setWatchlistBusy(true);
    setWatchlistNotice('');
    const next = !inWatchlist;
    setInWatchlist(next);

    try {
      if (next) {
        await addToWatchlist(movie.id);
        setWatchlistNotice(`Saved “${movie.title}” to your watchlist.`);
      } else {
        await removeFromWatchlist(movie.id);
        setWatchlistNotice(`Removed “${movie.title}” from your watchlist.`);
      }
    } catch (err) {
      setInWatchlist(!next);
      setWatchlistNotice(
        (err && err.message) || 'We could not update your watchlist. Try again.'
      );
    } finally {
      setWatchlistBusy(false);
    }
  }, [authStatus, inWatchlist, movie, router, user]);

  const retry = useCallback(() => setReloadToken((n) => n + 1), []);

  if (status === 'loading') {
    return (
      <PageShell eyebrow="Now streaming" title="Loading title…">
        <div className="stack">
          <SkeletonBlock height="360px" />
          <SkeletonBlock height="32px" />
          <SkeletonBlock height="120px" />
          <SkeletonBlock height="200px" />
        </div>
      </PageShell>
    );
  }

  if (status === 'error') {
    return (
      <PageShell title="Something went wrong">
        <ErrorState
          title="We could not load this title"
          description={errorMessage}
          onRetry={retry}
        />
      </PageShell>
    );
  }

  if (status === 'notfound' || !movie) {
    return (
      <PageShell title="Title not found">
        <EmptyState
          title="We could not find that title"
          description="The film you are looking for may have left the catalogue or the link is incorrect."
          action={
            <div className="cluster">
              <Button as="a" href="/browse" variant="primary">
                Browse the catalogue
              </Button>
              <Button as="a" href="/" variant="secondary">
                Back home
              </Button>
            </div>
          }
        />
      </PageShell>
    );
  }

  const genres = Array.isArray(movie.genres)
    ? movie.genres
    : typeof movie.genres === 'string' && movie.genres.length
      ? movie.genres.split(',').map((g) => g.trim()).filter(Boolean)
      : [];

  const metaRows = [
    { key: 'director', label: 'Director', value: movie.director || 'Not credited' },
    {
      key: 'year',
      label: 'Release year',
      value: movie.release_year ? String(movie.release_year) : 'Unannounced',
    },
    { key: 'runtime', label: 'Runtime', value: formatRuntime(movie.runtime_minutes) },
    { key: 'language', label: 'Language', value: movie.language || 'English' },
    {
      key: 'rating-label',
      label: 'Content rating',
      value: movie.rating_label || 'Not rated',
    },
    {
      key: 'audience',
      label: 'Audience score',
      value: formatRating(movie.avg_rating, movie.review_count),
    },
  ];

  return (
    <PageShell
      eyebrow="Now streaming on NollywoodVideo"
      title={movie.title}
      description={
        movie.release_year
          ? `${movie.release_year} • ${formatRuntime(movie.runtime_minutes)} • ${movie.language || 'English'}`
          : formatRuntime(movie.runtime_minutes)
      }
      actions={
        <Button
          variant={inWatchlist ? 'secondary' : 'primary'}
          size="md"
          loading={watchlistBusy}
          onClick={handleWatchlistToggle}
        >
          {inWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
        </Button>
      }
    >
      <div className="stack">
        <VideoPlayer
          streamUrl={movie.stream_url}
          title={movie.title}
          hue={movie.poster_hue}
        />

        {watchlistNotice ? (
          <p className="notice text-wrap-safe" role="status">
            {watchlistNotice}
          </p>
        ) : null}

        {genres.length > 0 ? (
          <div className="cluster" aria-label="Genres">
            {genres.map((genre) => (
              <Badge key={genre} tone="accent">
                {genre}
              </Badge>
            ))}
          </div>
        ) : null}

        <section aria-labelledby="synopsis-heading">
          <h2 id="synopsis-heading">Synopsis</h2>
          <p className="text-wrap-safe">
            {movie.synopsis ||
              'A synopsis for this title is being prepared by our editorial team and will appear here shortly.'}
          </p>
          {movie.trailer_url ? (
            <p>
              <Link href={movie.trailer_url}>Watch the official trailer</Link>
            </p>
          ) : null}
        </section>

        <section aria-labelledby="details-heading">
          <h2 id="details-heading">Title details</h2>
          <Table
            columns={[
              { key: 'label', header: 'Detail' },
              { key: 'value', header: 'Information' },
            ]}
            rows={metaRows}
            getRowKey={(row) => row.key}
            emptyMessage="No details recorded for this title yet."
          />
        </section>

        <ReviewSection movieId={movie.id} />
      </div>
    </PageShell>
  );
}