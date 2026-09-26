'use client';

import MovieCard from './MovieCard';
import { SkeletonBlock } from '../ui/Spinner';
import EmptyState, { ErrorState } from '../ui/EmptyState';

function SkeletonCard() {
  return (
    <div className="card movie-card movie-card--skeleton" aria-hidden="true">
      <SkeletonBlock aspect="2 / 3" />
      <div className="card__body stack">
        <SkeletonBlock height="1.25rem" />
        <SkeletonBlock height="0.875rem" width="70%" />
        <SkeletonBlock height="0.875rem" width="45%" />
      </div>
    </div>
  );
}

export default function MovieGrid({
  movies = [],
  loading = false,
  error = null,
  onRetry,
  emptyTitle = 'No titles here yet',
  emptyDescription = 'Try clearing your filters or browsing the full Nollywood catalogue.',
  emptyAction = null,
  skeletonCount = 8,
  watchlistIds = [],
  onToggleWatchlist,
}) {
  if (loading) {
    return (
      <div className="grid-cards" role="status" aria-busy="true" aria-label="Loading titles">
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <SkeletonCard key={`movie-skeleton-${index}`} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="We could not load these titles"
        description={
          typeof error === 'string'
            ? error
            : error?.message || 'The catalogue service is unavailable right now.'
        }
        onRetry={onRetry}
      />
    );
  }

  const list = Array.isArray(movies) ? movies : [];

  if (list.length === 0) {
    return (
      <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
    );
  }

  const inList = new Set(
    (Array.isArray(watchlistIds) ? watchlistIds : []).map((id) => String(id))
  );

  return (
    <div className="grid-cards">
      {list.map((movie) => (
        <MovieCard
          key={movie.id ?? movie.slug}
          movie={movie}
          inWatchlist={inList.has(String(movie.id))}
          onToggleWatchlist={onToggleWatchlist}
        />
      ))}
    </div>
  );
}