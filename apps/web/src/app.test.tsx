import { ACCESS_BLOCKED } from '@notamotors/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BLOCKED, fakeMe, mockApi, renderApp, STORE } from './test/render-app';

afterEach(() => {
  vi.unstubAllGlobals();
});

function fill(label: string, value: string) {
  fireEvent.input(screen.getByLabelText(label), { target: { value } });
}

describe('route protection (decided by the server)', () => {
  it('without a session, /app goes to the login screen', async () => {
    mockApi({ 'GET /auth/me': { status: 401, body: { message: 'Faça login para continuar' } } });
    const router = renderApp('/app');
    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeTruthy();
    expect(router.state.location.pathname).toBe('/login');
  });

  it('with an active trial, /app shows the store and the days left', async () => {
    mockApi({
      'GET /auth/me': { status: 200, body: fakeMe({ trialDaysLeft: 9 }) },
      'GET /stores/current': { status: 200, body: STORE },
    });
    renderApp('/app');
    expect(await screen.findByText('Teste grátis: 9 dias restantes')).toBeTruthy();
    expect(screen.getByText('Auto Teste')).toBeTruthy();
    expect(await screen.findByText(/Para emitir nota fiscal/)).toBeTruthy();
  });

  it('uses the singular for one day left', async () => {
    mockApi({
      'GET /auth/me': { status: 200, body: fakeMe({ trialDaysLeft: 1 }) },
      'GET /stores/current': { status: 200, body: STORE },
    });
    renderApp('/app');
    expect(await screen.findByText('Teste grátis: 1 dia restante')).toBeTruthy();
  });

  it('with an expired trial, /app goes to checkout with the reason', async () => {
    mockApi({ 'GET /auth/me': { status: 200, body: fakeMe(BLOCKED) } });
    const router = renderApp('/app');
    expect(await screen.findByText(/Seu teste grátis terminou/)).toBeTruthy();
    expect(router.state.location.pathname).toBe('/checkout');
    expect(screen.getByText(/continuam guardados/)).toBeTruthy();
  });

  it('a 402 from any dashboard call re-checks access and moves to checkout', async () => {
    let blocked = false;
    mockApi({
      'GET /auth/me': () => ({ status: 200, body: fakeMe(blocked ? BLOCKED : {}) }),
      'GET /stores/current': () => {
        // O teste vence entre o /auth/me e a próxima chamada.
        blocked = true;
        return {
          status: 402,
          body: { code: ACCESS_BLOCKED, reason: 'trial_expired', message: 'bloqueado' },
        };
      },
    });
    const router = renderApp('/app');
    await waitFor(() => expect(router.state.location.pathname).toBe('/checkout'));
  });

  it('a logged-in user opening /login goes to /app', async () => {
    mockApi({
      'GET /auth/me': { status: 200, body: fakeMe() },
      'GET /stores/current': { status: 200, body: STORE },
    });
    const router = renderApp('/login');
    await waitFor(() => expect(router.state.location.pathname).toBe('/app'));
  });

  it('the root goes to login while there is no landing page', async () => {
    mockApi({ 'GET /auth/me': { status: 401, body: { message: 'x' } } });
    const router = renderApp('/');
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
  });
});

describe('signup', () => {
  it('validates in Portuguese before calling the API', async () => {
    const calls = mockApi({ 'GET /auth/me': { status: 401, body: { message: 'x' } } });
    renderApp('/cadastro');
    await screen.findByRole('heading', { name: 'Crie sua conta' });

    fill('E-mail', 'nao-e-email');
    fill('Senha', '123');
    fireEvent.click(screen.getByRole('button', { name: 'Começar teste grátis' }));

    expect(await screen.findByText('E-mail inválido')).toBeTruthy();
    expect(screen.getByText('A senha precisa ter pelo menos 8 caracteres')).toBeTruthy();
    expect(screen.getByText('Informe seu nome')).toBeTruthy();
    expect(calls.some((c) => c.key === 'POST /auth/signup')).toBe(false);
  });

  it('creates the account and enters the app', async () => {
    let loggedIn = false;
    const calls = mockApi({
      'GET /auth/me': () =>
        loggedIn ? { status: 200, body: fakeMe() } : { status: 401, body: { message: 'x' } },
      'POST /auth/signup': () => {
        loggedIn = true;
        return { status: 201, body: { userId: 'u1', storeId: 's1', trialEndsAt: 'x' } };
      },
      'GET /stores/current': { status: 200, body: STORE },
    });
    const router = renderApp('/cadastro');
    await screen.findByRole('heading', { name: 'Crie sua conta' });

    fill('Seu nome', 'Maria Teste');
    fill('E-mail', ' Maria@Exemplo.TEST ');
    fill('Senha', 'senha-forte-123');
    fill('Nome da loja', 'Auto Teste');
    fireEvent.click(screen.getByRole('button', { name: 'Começar teste grátis' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/app'));
    expect(calls.find((c) => c.key === 'POST /auth/signup')?.body).toEqual({
      name: 'Maria Teste',
      email: 'maria@exemplo.test',
      password: 'senha-forte-123',
      storeName: 'Auto Teste',
    });
  });

  it('shows the repeated e-mail error on the e-mail field', async () => {
    mockApi({
      'GET /auth/me': { status: 401, body: { message: 'x' } },
      'POST /auth/signup': { status: 409, body: { message: 'Este e-mail já está cadastrado' } },
    });
    renderApp('/cadastro');
    await screen.findByRole('heading', { name: 'Crie sua conta' });

    fill('Seu nome', 'Maria Teste');
    fill('E-mail', 'maria@exemplo.test');
    fill('Senha', 'senha-forte-123');
    fill('Nome da loja', 'Auto Teste');
    fireEvent.click(screen.getByRole('button', { name: 'Começar teste grátis' }));

    expect(await screen.findByText('Este e-mail já está cadastrado')).toBeTruthy();
    expect(screen.getByLabelText('E-mail').getAttribute('aria-invalid')).toBe('true');
  });
});

describe('login and logout', () => {
  it('shows the generic error for wrong credentials', async () => {
    mockApi({
      'GET /auth/me': { status: 401, body: { message: 'x' } },
      'POST /auth/login': { status: 401, body: { message: 'E-mail ou senha incorretos' } },
    });
    const router = renderApp('/login');
    await screen.findByRole('heading', { name: 'Entrar' });

    fill('E-mail', 'maria@exemplo.test');
    fill('Senha', 'errada');
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('E-mail ou senha incorretos')).toBeTruthy();
    expect(router.state.location.pathname).toBe('/login');
  });

  it('logging in with an expired trial goes straight to checkout', async () => {
    mockApi({
      'GET /auth/me': { status: 401, body: { message: 'x' } },
      'POST /auth/login': { status: 200, body: fakeMe(BLOCKED) },
    });
    const router = renderApp('/login');
    await screen.findByRole('heading', { name: 'Entrar' });

    fill('E-mail', 'maria@exemplo.test');
    fill('Senha', 'senha-forte-123');
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/checkout'));
  });

  it('logout returns to the login screen', async () => {
    let loggedIn = true;
    mockApi({
      'GET /auth/me': () =>
        loggedIn ? { status: 200, body: fakeMe() } : { status: 401, body: { message: 'x' } },
      'GET /stores/current': { status: 200, body: STORE },
      'POST /auth/logout': () => {
        loggedIn = false;
        return { status: 204 };
      },
    });
    const router = renderApp('/app');
    fireEvent.click(await screen.findByRole('button', { name: 'Sair' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
  });
});
