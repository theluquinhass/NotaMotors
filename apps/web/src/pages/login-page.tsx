import { zodResolver } from '@hookform/resolvers/zod';
import { loginInputSchema, type LoginInput, type MeResponse } from '@notamotors/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import type { z } from 'zod';
import { api } from '../api/client';
import { ME_KEY } from '../auth/use-me';
import { AuthLayout } from '../components/auth-layout';
import { Field } from '../components/field';
import { applyServerErrors } from '../components/form-errors';

export function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof loginInputSchema>, unknown, LoginInput>({
    resolver: zodResolver(loginInputSchema),
  });

  const onSubmit = handleSubmit(async (input) => {
    try {
      const me = await api<MeResponse>('/auth/login', { method: 'POST', body: input });
      queryClient.setQueryData(ME_KEY, me);
      // Teste vencido vai direto para o checkout.
      await navigate(me.access.allowed ? '/app' : '/checkout', { replace: true });
    } catch (error) {
      applyServerErrors(error, setError);
    }
  });

  return (
    <AuthLayout title="Entrar">
      <form onSubmit={onSubmit} noValidate>
        <Field
          label="E-mail"
          type="email"
          autoComplete="email"
          registration={register('email')}
          error={errors.email}
        />
        <Field
          label="Senha"
          type="password"
          autoComplete="current-password"
          registration={register('password')}
          error={errors.password}
        />
        {errors.root ? (
          <p className="form-error" role="alert">
            {errors.root.message}
          </p>
        ) : null}
        <button type="submit" className="button primary" disabled={isSubmitting}>
          {isSubmitting ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
      <p className="switch">
        Ainda não tem conta? <Link to="/cadastro">Teste grátis</Link>
      </p>
    </AuthLayout>
  );
}
