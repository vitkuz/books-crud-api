import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Input } from '@/shared/ui/Input';
import { toastRequestError } from '@/shared/lib/http/toastErrors';
import { useAuth } from '../hooks/useAuth';
import { registerSchema, RegisterFormValues } from '../forms/register.schema';

export const RegisterPage = (): JSX.Element => {
  const { state, register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState<boolean>(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', name: '' },
  });

  useEffect((): void => {
    if (state.status === 'authed') navigate('/books', { replace: true });
  }, [state.status, navigate]);

  const onSubmit = form.handleSubmit(async (values: RegisterFormValues): Promise<void> => {
    setSubmitting(true);
    try {
      await registerUser(
        values.email,
        values.password,
        values.name === '' ? undefined : values.name,
      );
    } catch (err: unknown) {
      toastRequestError(err, 'Could not register.');
      setSubmitting(false);
    }
  });

  return (
    <div className="auth-page">
      <Card>
        <h1 style={{ marginBottom: 8 }}>Create account</h1>
        <p style={{ color: 'var(--color-muted)', marginBottom: 24 }}>
          Pick an email and password to get started.
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
            autoComplete="new-password"
            hint="At least 8 characters"
            error={form.formState.errors.password?.message}
            {...form.register('password')}
          />
          <Input
            label="Display name"
            type="text"
            autoComplete="name"
            hint="Optional"
            error={form.formState.errors.name?.message}
            {...form.register('name')}
          />
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create account'}
          </Button>
        </form>
        <p style={{ marginTop: 16, fontSize: 'var(--fs-sm)', color: 'var(--color-muted)' }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </Card>
    </div>
  );
};
