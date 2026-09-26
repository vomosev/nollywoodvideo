'use client';

import { useEffect, useMemo, useState } from 'react';
import Field from '../ui/Field';
import Button from '../ui/Button';
import { getGenres } from '../../lib/api';

const LANGUAGES = ['English', 'Yoruba', 'Igbo', 'Hausa', 'Pidgin'];

const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'title', label: 'Title (A–Z)' },
  { value: 'rating', label: 'Highest rated' }
];

const EMPTY = { q: '', genre: '', year: '', language: '', sort: 'newest' };

export default function MovieFilters({ value = EMPTY, onChange }) {
  const [genres, setGenres] = useState([]);
  const [genresError, setGenresError] = useState(false);

  useEffect(() => {
    let active = true;
    setGenresError(false);

    getGenres()
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
        setGenres(list);
      })
      .catch(() => {
        if (!active) return;
        setGenres([]);
        setGenresError(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    const out = [];
    for (let y = current; y >= 1992; y -= 1) out.push(y);
    return out;
  }, []);

  const update = (key, next) => {
    if (typeof onChange !== 'function') return;
    onChange({ ...EMPTY, ...value, [key]: next });
  };

  const hasFilters = Boolean(
    (value.q && value.q.trim()) ||
      value.genre ||
      value.year ||
      value.language ||
      (value.sort && value.sort !== 'newest')
  );

  const clearAll = () => {
    if (typeof onChange !== 'function') return;
    onChange({ ...EMPTY });
  };

  return (
    <form
      className="filters cluster"
      role="search"
      aria-label="Filter the Nollywood catalogue"
      onSubmit={(event) => event.preventDefault()}
    >
      <Field
        id="filter-q"
        name="q"
        label="Search titles"
        type="search"
        value={value.q || ''}
        placeholder="e.g. Lagos, King of Boys, Amaka"
        onChange={(event) => update('q', event.target.value)}
      />

      <Field
        id="filter-genre"
        name="genre"
        label="Genre"
        as="select"
        value={value.genre || ''}
        onChange={(event) => update('genre', event.target.value)}
        hint={genresError ? 'Genre list unavailable right now.' : undefined}
      >
        <option value="">All genres</option>
        {genres.map((genre) => (
          <option key={genre.id ?? genre.slug} value={genre.slug}>
            {genre.movie_count != null ? `${genre.name} (${genre.movie_count})` : genre.name}
          </option>
        ))}
      </Field>

      <Field
        id="filter-year"
        name="year"
        label="Release year"
        as="select"
        value={value.year || ''}
        onChange={(event) => update('year', event.target.value)}
      >
        <option value="">Any year</option>
        {years.map((year) => (
          <option key={year} value={String(year)}>
            {year}
          </option>
        ))}
      </Field>

      <Field
        id="filter-language"
        name="language"
        label="Language"
        as="select"
        value={value.language || ''}
        onChange={(event) => update('language', event.target.value)}
      >
        <option value="">Any language</option>
        {LANGUAGES.map((language) => (
          <option key={language} value={language}>
            {language}
          </option>
        ))}
      </Field>

      <Field
        id="filter-sort"
        name="sort"
        label="Sort by"
        as="select"
        value={value.sort || 'newest'}
        onChange={(event) => update('sort', event.target.value)}
      >
        {SORTS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Field>

      <div className="filters__actions">
        <Button variant="ghost" size="md" onClick={clearAll} disabled={!hasFilters}>
          Clear filters
        </Button>
      </div>
    </form>
  );
}