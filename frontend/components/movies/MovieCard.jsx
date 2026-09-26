'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import PosterArt from './PosterArt';
import { useAuth } from '../../lib/AuthContext';
import { addToWatchlist, removeFromWatchlist } from '../../lib/api';

function formatRuntime(minutes) {
  const mins = Number(minutes);
  if (!mins || Number.isNaN(mins)) return null;
  const hours = Math.floor(mins / 60);
  const rest = mins % 60;
  if (hours === 0) return `${rest}m`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
}

function formatRating(value) {
  const num = Number(value);
  if (!num || Number.isNaN(num)) return null;
  return num.toFixed(1);
}

function normaliseGenres(movie) {
  if (Array.isArray(movie.genres)) {
    return movie.genres
      .map((g) => (typeof g === 'string' ? g : g && g.name))
      .filter(Boolean);
  }
  if (typeof movie.genres === 'string' && movie.genres.trim()) {
    return movie.genres.split(',').map((g) => g.trim()).filter(Boolean);
  }
  if (typeof movie.genre_names === 'string' && movie.genre_names.trim()) {
    return movie.genre_names.split(',').map((g) => g.trim()).filter(Boolean);
  }
  return [];
}

export default function MovieCard({ movie, inWatchlist = false, onToggleWatchlist }) {
  const router = useRouter();
  const { status } = useAuth();
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(Boolean(inWatchlist));
  const [actionError, setActionError] = useState('');

  if (!movie) return null;

  const href = `/movies/${movie.slug || movie.id}`;
  const genres = normaliseGenres(movie).slice(0, 3);
  const runtime = formatRuntime(movie.runtime_minutes);
  const rating = formatRating(movie.avg_rating);
  const reviewCount = Number(movie.review_count) || 0;

  const meta = [movie.release_year, runtime, movie.language].filter(Boolean);

  async function handleToggle() {
    setActionError('');

    if (status !== 'authenticated') {
      router.push(`/login?next=${encodeURIComponent(href)}`);
      return;
    }

    const next = !saved;
    setBusy(true);
    setSaved(next);

    try {
      if (next) {
        await addToWatchlist(movie.id);
      } else {
        await removeFromWatchlist(movie.id);
      }
      if (typeof onToggleWatchlist === 'function') {
        onToggleWatchlist(movie, next);
      }
    } catch (err) {
      setSaved(!next);
      setActionError(
        err && err.message ? err.message : 'Could not update your watchlist.'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card interactive padding="sm">
      <Link href={href} className="movie-card__link" aria-label={`Open ${movie.title}`}>
        <div className="card__media">
          <PosterArt title={movie.title} hue={movie.poster_hue} size="md" />
        </div>
      </Link>

      <div className="card__body stack">
        <h3 className="movie-card__title text-wrap-safe">
          <Link href={href}>{movie.title}</Link>
        </h3>

        {meta.length > 0 ? (
          <p className="movie-card__meta">{meta.join(' • ')}</p>
        ) : null}

        <div className="cluster movie-card__tags">
          {genres.map((name) => (
            <Badge key={name} tone="neutral">
              {name}
            </Badge>
          ))}
          {rating ? (
            <Badge tone="accent">
              {rating}/5 · {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}
            </Badge>
          ) : (
            <Badge tone="neutral">No reviews yet</Badge>
          )}
        </div>

        {actionError ? (
          <p className="form-error text-wrap-safe" role="alert">
            {actionError}
          </p>
        ) : null}
      </div>

      <div className="card__footer">
        <Button
          variant={saved ? 'secondary' : 'primary'}
          size="sm"
          fullWidth
          loading={busy}
          onClick={handleToggle}
        >
          {saved ? 'Remove from watchlist' : 'Add to watchlist'}
        </Button>
      </div>
    </Card>
  );
}