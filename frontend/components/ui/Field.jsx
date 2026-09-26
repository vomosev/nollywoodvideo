'use client';

import { useId } from 'react';

export default function Field({
  id,
  name,
  label,
  type = 'text',
  value,
  onChange,
  onBlur,
  placeholder,
  required = false,
  disabled = false,
  error = '',
  hint = '',
  as = 'input',
  rows = 4,
  autoComplete,
  min,
  max,
  step,
  children,
  className = '',
  ...rest
}) {
  const generatedId = useId();
  const fieldId = id || `${name || 'field'}-${generatedId}`;
  const hintId = `${fieldId}-hint`;
  const errorId = `${fieldId}-error`;

  const describedBy =
    [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') ||
    undefined;

  const shared = {
    id: fieldId,
    name: name || fieldId,
    value: value === undefined || value === null ? '' : value,
    onChange,
    onBlur,
    disabled,
    required,
    'aria-invalid': error ? 'true' : undefined,
    'aria-describedby': describedBy,
    className: `field__control${error ? ' field__control--error' : ''}`,
    ...rest,
  };

  let control;

  if (as === 'textarea') {
    control = <textarea {...shared} rows={rows} placeholder={placeholder} />;
  } else if (as === 'select') {
    control = <select {...shared}>{children}</select>;
  } else {
    control = (
      <input
        {...shared}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        min={min}
        max={max}
        step={step}
      />
    );
  }

  return (
    <div className={`field${className ? ` ${className}` : ''}`}>
      {label ? (
        <label className="field__label" htmlFor={fieldId}>
          {label}
          {required ? (
            <span className="field__required" aria-hidden="true">
              {' '}
              *
            </span>
          ) : null}
        </label>
      ) : null}

      {control}

      {hint && !error ? (
        <p className="field__hint" id={hintId}>
          {hint}
        </p>
      ) : null}

      {error ? (
        <p className="field__error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}