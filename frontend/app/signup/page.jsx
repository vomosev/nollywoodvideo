'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import PageShell from '../../components/layout/PageShell';
import Card from '../../components/ui/Card';
import Field from '../../components/ui/Field';
import Button from '../../components/ui/Button';
import { useAuth } from '../../lib/AuthContext';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signup, status } = useAuth();

  const returnTo = searchParams?.get('returnTo') || '/';

  const [values, setValues] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace(returnTo);
    }
  }, [status, returnTo, router]);

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }

  function validate(current) {
    const nextErrors = {};

    if (!current.name.trim()) {
      nextErrors.name = 'Please tell us the name to show on your reviews.';
    } else if (current.name.trim().length < 2) {
      nextErrors.name = 'Your name needs at least 2 characters.';
    }

    if (!current.email.trim()) {
      nextErrors.email = 'An email address is required.';
    } else if (!EMAIL_PATTERN.test(current.email.trim())) {
      nextErrors.email = 'Enter a valid email address, e.g. ada@example.com.';
    }

    if (!current.password) {
      nextErrors.password = 'Choose a password to secure your account.';
    } else if (current.password.length < 8) {
      nextErrors.password = 'Passwords must be at least 8 characters long.';
    }

    if (!current.confirmPassword) {
      nextErrors.confirmPassword = 'Please repeat your password.';
    } else if (current.confirmPassword !== current.password) {
      nextErrors.confirmPassword = 'Both passwords must match.';
    }

    return nextErrors;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setServerError('');

    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      await signup({
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
        password: values.password,
      });
      router.replace(returnTo);
    } catch (err) {
      setServerError(
        (err && err.message) ||
          'We could not create your account right now. Please try again shortly.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell
      eyebrow="Join the community"
      title="Create your NollywoodVideo account"
      description="Build a watchlist, rate the films you love and pick up where you left off on any device."
    >
      <div className="auth-layout">
        <Card padding="lg">
          <form className="stack" onSubmit={handleSubmit} noValidate>
            <h2>Sign up — it takes a minute</h2>

            {serverError ? (
              <p className="alert alert--danger text-wrap-safe" role="alert">
                {serverError}
              </p>
            ) : null}

            <Field
              id="signup-name"
              name="name"
              label="Full name"
              type="text"
              value={values.name}
              onChange={handleChange}
              placeholder="Adaeze Okonkwo"
              required
              error={errors.name}
              hint="Shown beside any review you post."
            />

            <Field
              id="signup-email"
              name="email"
              label="Email address"
              type="email"
              value={values.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
              error={errors.email}
            />

            <Field
              id="signup-password"
              name="password"
              label="Password"
              type="password"
              value={values.password}
              onChange={handleChange}
              placeholder="At least 8 characters"
              required
              error={errors.password}
              hint="Use 8 characters or more — a short phrase works well."
            />

            <Field
              id="signup-confirm-password"
              name="confirmPassword"
              label="Confirm password"
              type="password"
              value={values.confirmPassword}
              onChange={handleChange}
              placeholder="Repeat your password"
              required
              error={errors.confirmPassword}
            />

            <Button type="submit" variant="primary" size="lg" fullWidth loading={submitting}>
              {submitting ? 'Creating account…' : 'Create account'}
            </Button>

            <p className="form-footnote">
              Already have an account? <Link href="/login">Sign in instead</Link>
            </p>
          </form>
        </Card>
      </div>
    </PageShell>
  );
}