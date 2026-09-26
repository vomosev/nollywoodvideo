'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import PageShell from '../../components/layout/PageShell';
import Card from '../../components/ui/Card';
import Field from '../../components/ui/Field';
import Button from '../../components/ui/Button';
import { useAuth } from '../../lib/AuthContext';

function isEmailLike(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, status, login } = useAuth();

  const returnTo = searchParams?.get('returnTo') || '/';

  const [values, setValues] = useState({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === 'authenticated' && user) {
      router.replace(returnTo);
    }
  }, [status, user, returnTo, router]);

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: '' }));
  }

  function validate() {
    const errors = {};
    if (!values.email.trim()) {
      errors.email = 'Enter the email address on your account.';
    } else if (!isEmailLike(values.email)) {
      errors.email = 'That does not look like a valid email address.';
    }
    if (!values.password) {
      errors.password = 'Enter your password.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');
    if (!validate()) return;

    setSubmitting(true);
    try {
      await login({ email: values.email.trim().toLowerCase(), password: values.password });
      router.replace(returnTo);
    } catch (err) {
      const status401 = err && err.status === 401;
      setFormError(
        status401
          ? 'Those details did not match an account. Check your email and password and try again.'
          : (err && err.message) || 'We could not reach NollywoodVideo just now. Please try again in a moment.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell
      eyebrow="Welcome back"
      title="Sign in to NollywoodVideo"
      description="Pick up where you left off, manage your watchlist and post reviews on the Nollywood titles you love."
    >
      <div className="auth-layout">
        <Card padding="lg">
          <form className="stack" onSubmit={handleSubmit} noValidate>
            {formError ? (
              <p className="alert alert--danger text-wrap-safe" role="alert">
                {formError}
              </p>
            ) : null}

            <Field
              id="login-email"
              name="email"
              label="Email address"
              type="email"
              value={values.email}
              onChange={handleChange}
              placeholder="ada@example.com"
              required
              error={fieldErrors.email}
              hint="Use the address you signed up with."
            />

            <Field
              id="login-password"
              name="password"
              label="Password"
              type="password"
              value={values.password}
              onChange={handleChange}
              placeholder="Your password"
              required
              error={fieldErrors.password}
            />

            <Button type="submit" variant="primary" size="lg" fullWidth loading={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="auth-alt">
            New to NollywoodVideo? <Link href="/signup">Create a free account</Link> and start building your
            watchlist today.
          </p>
        </Card>
      </div>
    </PageShell>
  );
}