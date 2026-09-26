'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PageShell from '../../components/layout/PageShell';
import MovieFilters from '../../components/movies/MovieFilters';
import MovieGrid from '../../components/movies/MovieGrid';
import Button from '../../components/ui/Button';
import { getMovies, getWatchlist, addToWatchlist, removeFromWatchlist } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';

const LIMIT = 12;

const EMPTY_FILTERS = {
  q: '',
  genre: '',
  year: '',
  language: '',
  sort: 'newest'
};

function readFilters(searchParams) {
  return {
    q: searchParams.get('q') || '',
    genre: searchParams.get('genre') || '',
    year: searchParams.get('year') || '',
    language: searchParams.get('language') || '',
    sort: searchParams.get('sort') || 'newest'
  };
}

function buildQueryString(filters, page) {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.genre) params.set('genre', filters.genre);
  if (filters.year) params.set('year', filters.year);
  if (filters.language) params.set('language', filters.language);
  if (filters.sort && filters.sort !== 'newest') params.set('sort', filters.sort);
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

function BrowseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useAuth();

  const [filters, setFilters] = useState(() => readFilters(searchParams));
  const [page, setPage] = useState(() => {
    const raw = parseInt(searchParams.get('page') || '1', 10);
    return Number.isFinite(raw) && raw > 0 ? raw : 1;
  });

  const [movies, setMovies] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);

  const [watchlistIds, setWatchlistIds] = useState([]);
  const [watchlistBusy, setWatchlistBusy] = useState(false);

  const firstRender = useRef(true);

  // Keep the URL in sync with the current filters/page.
  useEffect(() => {
    const qs = buildQueryString(filters, page);
    const target = `/browse${qs}`;
    const current = `/browse${window.location.search}`;
    if (target !== current) {
      router.replace(target, { scroll: false });
    }
  }, [filters, page, router]);

  // Debounced, abortable catalogue fetch.
  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    const delay = firstRender.current ? 0 : 350;
    firstRender.current = false;

    setLoading(true);
    setError(null);

    const timer = setTimeout(() => {
      getMovies(
        {
          q: filters.q || undefined,
          genre: filters.genre || undefined,
          year: filters.year || undefined,
          language: filters.language || undefined,
          sort: filters.sort || 'newest',
          page,
          limit: LIMIT
        },
        { signal: controller.signal }
      )
        .then((data) => {
          if (cancelled) return;
          const items = Array.isArray(data?.items) ? data.items : [];
          setMovies(items);
          setTotal(Number(data?.total) || 0);
          setLoading(false);
        })
        .catch((err) => {
          if (cancelled || controller.signal.aborted || err?.name === 'AbortError') return;
          setMovies([]);
          setTotal(0);
          setError(err?.message || 'We could not load the catalogue right now.');
          setLoading(false);
        });
    }, delay);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [filters.q, filters.genre, filters.year, filters.language, filters.sort, page, reloadToken]);

  // Load the viewer's watchlist so card toggles reflect real state.
  useEffect(() => {
    if (status !== 'authenticated') {
      setWatchlistIds([]);
      return undefined;
    }
    const controller = new AbortController();
    let cancelled = false;

    getWatchlist({ signal: controller.signal })
      .then((data) => {
        if (cancelled) return;
        const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
        setWatchlistIds(items.map((m) => Number(m.id)));
      })
      .catch(() => {
        if (!cancelled) setWatchlistIds([]);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [status]);

  const handleFiltersChange = useCallback((next) => {
    setFilters(next);
    setPage(1);
  }, []);

  const handleClear = useCallback(() => {
    setFilters({ ...EMPTY_FILTERS });
    setPage(1);
  }, []);

  const handleRetry = useCallback(() => {
    setReloadToken((t) => t + 1);
  }, []);

  const handleToggleWatchlist = useCallback(
    async (movie) => {
      if (!movie) return;
      if (status !== 'authenticated') {
        const back = encodeURIComponent(`/browse${buildQueryString(filters, page)}`);
        router.push(`/login?next=${back}`);
        return;
      }
      const id = Number(movie.id);
      const already = watchlistIds.includes(id);
      setWatchlistBusy(true);
      setWatchlistIds((prev) => (already ? prev.filter((x) => x !== id) : [...prev, id]));
      try {
        if (already) {
          await removeFromWatchlist(id);
        } else {
          await addToWatchlist(id);
        }
      } catch (err) {
        // Roll back on failure.
        setWatchlistIds((prev) => (already ? [...prev, id] : prev.filter((x) => x !== id)));
      } finally {
        setWatchlistBusy(false);
      }
    },
    [status, watchlistIds, router, filters, page]
  );

  const totalPages = useMemo(() => {
    if (!total) return 1;
    return Math.max(1, Math.ceil(total / LIMIT));
  }, [total]);

  const rangeStart = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const rangeEnd = Math.min(page * LIMIT, total);

  const hasFilters =
    Boolean(filters.q) || Boolean(filters.genre) || Boolean(filters.year) || Boolean(filters.language);

  return (
    <PageShell
      eyebrow="Catalogue"
      title="Browse Nollywood"
      description="Every title on NollywoodVideo is licensed directly from its producers. Filter by genre, release year, language or sort by what the community rates highest."
    >
      <section className="stack" aria-labelledby="browse-filters-heading">
        <h2 id="browse-filters-heading" className="visually-hidden">
          Filter the catalogue
        </h2>
        <MovieFilters value={filters} onChange={handleFiltersChange} onClear={handleClear} />
      </section>

      <section className="stack" aria-labelledby="browse-results-heading" aria-busy={loading}>
        <div className="cluster cluster--between">
          <h2 id="browse-results-heading" className="section-title">
            {loading
              ? 'Loading titles…'
              : total === 0
                ? 'No titles found'
                : `${total} ${total === 1 ? 'title' : 'titles'}`}
          </h2>
          {!loading && total > 0 ? (
            <p className="meta-text">
              Showing {rangeStart}–{rangeEnd} of {total}
            </p>
          ) : null}
        </div>

        <MovieGrid
          movies={movies}
          loading={loading}
          error={error}
          onRetry={handleRetry}
          watchlistIds={watchlistIds}
          onToggleWatchlist={handleToggleWatchlist}
          toggleDisabled={watchlistBusy}
          emptyTitle={hasFilters ? 'No titles match those filters' : 'The catalogue is empty'}
          emptyDescription={
            hasFilters
              ? 'Try widening your search — clear a filter or two and the shelf will fill back up.'
              : 'New Nollywood releases are added every Friday. Check back shortly.'
          }
        />

        {!loading && !error && total > LIMIT ? (
          <nav className="pagination cluster cluster--between" aria-label="Catalogue pages">
            <Button
              variant="secondary"
              size="md"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <p className="meta-text" aria-live="polite">
              Page {page} of {totalPages}
            </p>
            <Button
              variant="secondary"
              size="md"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </nav>
        ) : null}
      </section>
    </PageShell>
  );
}

export default function BrowsePage() {
  return (
    <Suspense
      fallback={
        <PageShell eyebrow="Catalogue" title="Browse Nollywood">
          <MovieGrid movies={[]} loading />
        </PageShell>
      }
    >
      <BrowseContent />
    </Suspense>
  );
}