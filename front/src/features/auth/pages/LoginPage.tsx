import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Input } from '@/shared/ui/Input';
import { toastRequestError } from '@/shared/lib/http/toastErrors';
import { useAuth } from '../hooks/useAuth';
import { loginSchema, LoginFormValues } from '../forms/login.schema';

export const LoginPage = (): JSX.Element => {
  const { state, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitting, setSubmitting] = useState<boolean>(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  useEffect((): void => {
    if (state.status === 'authed') {
      const from: string = (location.state as { from?: string } | null)?.from ?? '/books';
      navigate(from, { replace: true });
    }
  }, [state.status, navigate, location.state]);

  const onSubmit = form.handleSubmit(async (values: LoginFormValues): Promise<void> => {
    setSubmitting(true);
    try {
      await login(values.email, values.password);
    } catch (err: unknown) {
      toastRequestError(err, 'Invalid email or password.');
      setSubmitting(false);
    }
  });

  return (
    <div className="auth-page">
      <Card>
        <h1 style={{ marginBottom: 8 }}>Sign in</h1>
        <p style={{ color: 'var(--color-muted)', marginBottom: 24 }}>
          Welcome back. Sign in to manage your books.
        </p>
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            error={form.formState.errors.email?.message}
            {...form.register('email')}
          />
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            error={form.formState.errors.password?.message}
            {...form.register('password')}
          />
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
        <p style={{ marginTop: 16, fontSize: 'var(--fs-sm)', color: 'var(--color-muted)' }}>
          No account? <Link to="/register">Register</Link>
        </p>
      </Card>
    </div>
  );
};
