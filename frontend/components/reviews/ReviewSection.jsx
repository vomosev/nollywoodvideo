'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { getReviews, postReview } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import Field from '../ui/Field';
import Button from '../ui/Button';
import Card from '../ui/Card';
import EmptyState, { ErrorState } from '../ui/EmptyState';
import { SkeletonBlock } from '../ui/Spinner';

function Stars({ value, label }) {
  const rounded = Math.round(Number(value) || 0);
  return (
    <span className="stars" aria-label={label || `${rounded} out of 5 stars`} role="img">
      <span aria-hidden="true">
        {'\u2605'.repeat(Math.min(5, Math.max(0, rounded)))}
        <span className="stars__empty">{'\u2605'.repeat(Math.max(0, 5 - rounded))}</span>
      </span>
    </span>
  );
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export default function ReviewSection({ movieId }) {
  const { user, status } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState({ average: null, count: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [rating, setRating] = useState('5');
  const [body, setBody] = useState('');
  const [formError, setFormError] = useState('');
  const [formNotice, setFormNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!movieId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getReviews(movieId);
      const items = Array.isArray(data) ? data : data.items || data.reviews || [];
      setReviews(items);
      setSummary({
        average:
          data && data.average != null
            ? Number(data.average)
            : data && data.avg_rating != null
            ? Number(data.avg_rating)
            : items.length
            ? items.reduce((sum, r) => sum + Number(r.rating || 0), 0) / items.length
            : null,
        count:
          data && data.count != null
            ? Number(data.count)
            : data && data.review_count != null
            ? Number(data.review_count)
            : items.length
      });
    } catch (err) {
      setError(err && err.message ? err.message : 'Could not load reviews.');
      setReviews([]);
      setSummary({ average: null, count: 0 });
    } finally {
      setLoading(false);
    }
  }, [movieId]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!active) return;
      await load();
    })();
    return () => {
      active = false;
    };
  }, [load]);

  useEffect(() => {
    if (!user) return;
    const mine = reviews.find((r) => String(r.user_id) === String(user.id));
    if (mine) {
      setRating(String(mine.rating));
      setBody(mine.body || '');
    }
  }, [reviews, user]);

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');
    setFormNotice('');

    const numeric = Number(rating);
    if (!Number.isInteger(numeric) || numeric < 1 || numeric > 5) {
      setFormError('Choose a star rating between 1 and 5.');
      return;
    }
    if (!body.trim()) {
      setFormError('Please write a few words about the film.');
      return;
    }
    if (body.trim().length > 2000) {
      setFormError('Reviews are limited to 2000 characters.');
      return;
    }

    setSubmitting(true);
    try {
      await postReview(movieId, { rating: numeric, body: body.trim() });
      setFormNotice('Thanks — your review has been published.');
      await load();
    } catch (err) {
      setFormError(err && err.message ? err.message : 'Could not save your review.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="reviews" aria-labelledby="reviews-heading">
      <h2 id="reviews-heading">Viewer reviews</h2>

      {!loading && !error && summary.count > 0 ? (
        <p className="reviews__summary">
          <Stars
            value={summary.average}
            label={`Average rating ${Number(summary.average).toFixed(1)} out of 5`}
          />{' '}
          <strong>{Number(summary.average).toFixed(1)}</strong> from {summary.count}{' '}
          {summary.count === 1 ? 'review' : 'reviews'}
        </p>
      ) : null}

      {status === 'authenticated' ? (
        <Card padding="md">
          <form className="stack" onSubmit={handleSubmit} noValidate>
            <h3>Share your verdict</h3>
            <Field
              as="select"
              id="review-rating"
              name="rating"
              label="Star rating"
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              required
            >
              <option value="5">5 — Outstanding</option>
              <option value="4">4 — Very good</option>
              <option value="3">3 — Watchable</option>
              <option value="2">2 — Disappointing</option>
              <option value="1">1 — Avoid</option>
            </Field>
            <Field
              as="textarea"
              id="review-body"
              name="body"
              label="Your review"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What stood out — the story, the performances, the cinematography?"
              hint="Up to 2000 characters. Your name will be shown with your review."
              error={formError}
              required
            />
            {formNotice ? (
              <p className="form-notice form-notice--success" role="status">
                {formNotice}
              </p>
            ) : null}
            <div className="cluster">
              <Button type="submit" variant="primary" size="md" loading={submitting}>
                {submitting ? 'Publishing…' : 'Publish review'}
              </Button>
            </div>
          </form>
        </Card>
      ) : status === 'loading' ? (
        <SkeletonBlock height="120px" />
      ) : (
        <Card padding="md">
          <p>
            <Link href={`/login?next=/movies/${encodeURIComponent(String(movieId))}`}>
              Sign in
            </Link>{' '}
            to rate this film and share your review with other Nollywood fans.
          </p>
        </Card>
      )}

      {loading ? (
        <div className="stack" aria-busy="true" aria-live="polite">
          <SkeletonBlock height="96px" />
          <SkeletonBlock height="96px" />
          <SkeletonBlock height="96px" />
        </div>
      ) : error ? (
        <ErrorState
          title="Reviews are unavailable"
          description={error}
          onRetry={load}
        />
      ) : reviews.length === 0 ? (
        <EmptyState
          title="No reviews yet"
          description="Be the first to tell the community what you thought of this title."
        />
      ) : (
        <ul className="review-list">
          {reviews.map((review) => (
            <li key={review.id} className="review">
              <Card padding="md">
                <div className="review__head cluster">
                  <span className="review__author text-wrap-safe">
                    {review.name || review.user_name || 'NollywoodVideo viewer'}
                  </span>
                  <Stars
                    value={review.rating}
                    label={`Rated ${review.rating} out of 5`}
                  />
                  <span className="review__date">{formatDate(review.created_at)}</span>
                </div>
                <p className="review__body text-wrap-safe">{review.body}</p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}