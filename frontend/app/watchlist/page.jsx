'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageShell from '../../components/layout/PageShell';
import MovieGrid from '../../components/movies/MovieGrid';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import { getWatchlist, removeFromWatchlist } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';

export default function WatchlistPage() {
  const router = useRouter();
  const { user, status } = useAuth();

  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingRemoval, setPendingRemoval] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (status === 'anonymous' || status === 'error') {
      router.replace('/login?next=/watchlist');
    }
  }, [status, router]);

  const load = useCallback(async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getWatchlist();
      if (signal && signal.aborted) return;
      const items = Array.isArray(data) ? data : data && Array.isArray(data.items) ? data.items : [];
      setMovies(items);
    } catch (err) {
      if (signal && signal.aborted) return;
      setError(err && err.message ? err.message : 'We could not load your watchlist.');
    } finally {
      if (!signal || !signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status !== 'authenticated') return undefined;
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [status, load]);

  const requestRemove = useCallback((movie) => {
    setNotice('');
    setPendingRemoval(movie);
  }, []);

  const confirmRemove = useCallback(async () => {
    if (!pendingRemoval) return;
    const target = pendingRemoval;
    const snapshot = movies;
    setRemoving(true);
    // Optimistic removal
    setMovies((current) => current.filter((m) => m.id !== target.id));
    try {
      await removeFromWatchlist(target.id);
      setNotice(`Removed “${target.title}” from your watchlist.`);
      setPendingRemoval(null);
    } catch (err) {
      // Rollback
      setMovies(snapshot);
      setNotice(
        err && err.message
          ? `Could not remove that title: ${err.message}`
          : 'Could not remove that title. Please try again.'
      );
      setPendingRemoval(null);
    } finally {
      setRemoving(false);
    }
  }, [pendingRemoval, movies]);

  if (status === 'loading') {
    return (
      <PageShell
        eyebrow="Your library"
        title="My Watchlist"
        description="Titles you have saved for later, ready whenever you are."
      >
        <div className="stack" aria-live="polite">
          <Spinner size="md" label="Checking your session" />
        </div>
      </PageShell>
    );
  }

  if (status !== 'authenticated') {
    return (
      <PageShell
        eyebrow="Your library"
        title="My Watchlist"
        description="Sign in to see the titles you have saved."
      >
        <div className="stack">
          <p>Redirecting you to the sign-in page…</p>
          <div className="cluster">
            <Button as="a" href="/login?next=/watchlist" variant="primary">
              Sign in
            </Button>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow="Your library"
      title="My Watchlist"
      description={
        user && user.name
          ? `${user.name}, here are the Nollywood titles you saved for later.`
          : 'Nollywood titles you saved for later.'
      }
      actions={
        <Button as="a" href="/browse" variant="secondary" size="md">
          Browse catalogue
        </Button>
      }
    >
      <div className="stack">
        {notice ? (
          <p className="alert alert--info text-wrap-safe" role="status">
            {notice}
          </p>
        ) : null}

        {!loading && !error ? (
          <p className="meta-line">
            {movies.length === 0
              ? 'No saved titles yet.'
              : `${movies.length} saved ${movies.length === 1 ? 'title' : 'titles'}`}
          </p>
        ) : null}

        <MovieGrid
          movies={movies}
          loading={loading}
          error={error}
          onRetry={() => load()}
          inWatchlistIds={movies.map((m) => m.id)}
          onToggleWatchlist={requestRemove}
          emptyTitle="Your watchlist is empty"
          emptyDescription="Save Nollywood films while you browse and they will show up here for easy access."
          emptyAction={
            <Button as="a" href="/browse" variant="primary">
              Find something to watch
            </Button>
          }
        />
      </div>

      <Modal
        open={Boolean(pendingRemoval)}
        title="Remove from watchlist?"
        onClose={() => {
          if (!removing) setPendingRemoval(null);
        }}
        footer={
          <div className="cluster cluster--end">
            <Button
              variant="ghost"
              onClick={() => setPendingRemoval(null)}
              disabled={removing}
            >
              Keep it
            </Button>
            <Button variant="danger" onClick={confirmRemove} loading={removing}>
              Remove
            </Button>
          </div>
        }
      >
        <p className="text-wrap-safe">
          {pendingRemoval
            ? `“${pendingRemoval.title}” will be taken off your watchlist. You can always add it back from the catalogue.`
            : ''}
        </p>
      </Modal>
    </PageShell>
  );
}