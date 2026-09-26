// frontend/lib/api.js
// Runtime-only API client for the NollywoodVideo Express API.
// No fetching happens at module scope — every helper must be invoked
// from inside a React effect or an event handler.

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://nollywoodvideo-api.arx-app.com:4110';

export class ApiError extends Error {
  constructor(message, status = 0, details = null) {
    super(message || 'Request failed');
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

function joinUrl(base, path) {
  const cleanBase = String(base || '').replace(/\/+$/, '');
  const cleanPath = String(path || '').startsWith('/') ? path : `/${path || ''}`;
  return `${cleanBase}${cleanPath}`;
}

function buildQuery(params) {
  if (!params || typeof params !== 'object') return '';
  const search = new URLSearchParams();
  Object.keys(params).forEach((key) => {
    const value = params[key];
    if (value === undefined || value === null) return;
    const str = String(value).trim();
    if (str === '') return;
    search.append(key, str);
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Core request helper.
 * @param {string} path - API path beginning with '/'.
 * @param {{ method?: string, body?: any, signal?: AbortSignal, headers?: object }} options
 */
export async function request(path, options = {}) {
  const { method = 'GET', body, signal, headers = {} } = options;

  const init = {
    method,
    credentials: 'include',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      ...headers,
    },
  };

  if (signal) init.signal = signal;

  if (body !== undefined && body !== null) {
    init.headers['Content-Type'] = 'application/json';
    init.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(joinUrl(API_BASE, path), init);
  } catch (err) {
    // Preserve genuine aborts so callers can ignore them.
    if (err && (err.name === 'AbortError' || err.code === 20)) {
      throw err;
    }
    throw new ApiError(
      'Service unavailable. Please check your connection and try again.',
      0
    );
  }

  const contentType = response.headers.get('content-type') || '';
  let payload = null;

  if (response.status !== 204) {
    try {
      if (contentType.includes('application/json')) {
        payload = await response.json();
      } else {
        const text = await response.text();
        payload = text ? { message: text } : null;
      }
    } catch (err) {
      payload = null;
    }
  }

  if (!response.ok) {
    const message =
      (payload && (payload.error || payload.message)) ||
      `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, payload);
  }

  return payload;
}

/* ---------------------------------------------------------------- movies */

export function getFeatured(signal) {
  return request('/api/movies/featured', { signal });
}

export function getMovies(params = {}, signal) {
  return request(`/api/movies${buildQuery(params)}`, { signal });
}

export function getMovie(idOrSlug, signal) {
  return request(`/api/movies/${encodeURIComponent(idOrSlug)}`, { signal });
}

export function getGenres(signal) {
  return request('/api/movies/genres', { signal });
}

/* --------------------------------------------------------------- reviews */

export function getReviews(movieId, signal) {
  return request(`/api/movies/${encodeURIComponent(movieId)}/reviews`, {
    signal,
  });
}

export function postReview(movieId, { rating, body } = {}) {
  return request(`/api/movies/${encodeURIComponent(movieId)}/reviews`, {
    method: 'POST',
    body: { rating, body },
  });
}

export function deleteReview(reviewId) {
  return request(`/api/reviews/${encodeURIComponent(reviewId)}`, {
    method: 'DELETE',
  });
}

/* ------------------------------------------------------------- watchlist */

export function getWatchlist(signal) {
  return request('/api/watchlist', { signal });
}

export function addToWatchlist(movieId) {
  return request('/api/watchlist', {
    method: 'POST',
    body: { movieId },
  });
}

export function removeFromWatchlist(movieId) {
  return request(`/api/watchlist/${encodeURIComponent(movieId)}`, {
    method: 'DELETE',
  });
}

/* ------------------------------------------------------------------ auth */

export function signup(payload) {
  return request('/api/auth/signup', { method: 'POST', body: payload });
}

export function login(payload) {
  return request('/api/auth/login', { method: 'POST', body: payload });
}

export function logout() {
  return request('/api/auth/logout', { method: 'POST' });
}

export function getMe(signal) {
  return request('/api/auth/me', { signal });
}

/* ---------------------------------------------------------------- status */

export function getStatus(signal) {
  return request('/api/status', { signal });
}

const api = {
  API_BASE,
  ApiError,
  request,
  getFeatured,
  getMovies,
  getMovie,
  getGenres,
  getReviews,
  postReview,
  deleteReview,
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  signup,
  login,
  logout,
  getMe,
  getStatus,
};

export default api;