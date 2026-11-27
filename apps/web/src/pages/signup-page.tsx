import { zodResolver } from '@hookform/resolvers/zod';
import {
  signupInputSchema,
  TRIAL_DAYS,
  type SignupInput,
  type SignupResponse,
} from '@notamotors/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import type { z } from 'zod';
import { api } from '../api/client';
import { ME_KEY } from '../auth/use-me';
import { AuthLayout } from '../components/auth-layout';
import { Field } from '../components/field';
import { applyServerErrors } from '../components/form-errors';

export function SignupPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof signupInputSchema>, unknown, SignupInput>({
    resolver: zodResolver(signupInputSchema),
  });

  const onSubmit = handleSubmit(async (input) => {
    try {
      await api<SignupResponse>('/auth/signup', { method: 'POST', body: input });
      // O cadastro já abre a sessão: busca a conta e entra no app.
      await queryClient.invalidateQueries({ queryKey: ME_KEY });
      await navigate('/app', { replace: true });
    } catch (error) {
      applyServerErrors(error, setError, { 409: 'email' });
    }
  });

  return (
    <AuthLayout title="Crie sua conta">
      <p className="lead">
        {TRIAL_DAYS} dias grátis, sem cartão. Você controla estoque e vendas desde o primeiro dia.
      </p>
      <form onSubmit={onSubmit} noValidate>
        <Field
          label="Seu nome"
          autoComplete="name"
          registration={register('name')}
          error={errors.name}
        />
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
          autoComplete="new-password"
          hint="Pelo menos 8 caracteres"
          registration={register('password')}
          error={errors.password}
        />
        <Field
          label="Nome da loja"
          autoComplete="organization"
          registration={register('storeName')}
          error={errors.storeName}
        />
        {errors.root ? (
          <p className="form-error" role="alert">
            {errors.root.message}
          </p>
        ) : null}
        <button type="submit" className="button primary" disabled={isSubmitting}>
          {isSubmitting ? 'Criando conta…' : 'Começar teste grátis'}
        </button>
      </form>
      <p className="switch">
        Já tem conta? <Link to="/login">Entrar</Link>
      </p>
    </AuthLayout>
  );
}
