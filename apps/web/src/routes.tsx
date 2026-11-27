import { Navigate, type RouteObject } from 'react-router';
import { GuestOnly, RequireAccess, RequireSession } from './auth/guards';
import { CheckoutPage } from './pages/checkout-page';
import { CompanyPage } from './pages/company-page';
import { DashboardPage } from './pages/dashboard-page';
import { LoginPage } from './pages/login-page';
import { NotFoundPage } from './pages/not-found-page';
import { PartiesListPage } from './pages/parties/parties-list-page';
import { PartyFormPage } from './pages/parties/party-form-page';
import { SignupPage } from './pages/signup-page';

export const routes: RouteObject[] = [
  // Até existir a landing page (marco 2), a raiz leva ao login.
  { path: '/', element: <Navigate to="/login" replace /> },
  {
    path: '/cadastro',
    element: (
      <GuestOnly>
        <SignupPage />
      </GuestOnly>
    ),
  },
  {
    path: '/login',
    element: (
      <GuestOnly>
        <LoginPage />
      </GuestOnly>
    ),
  },
  { path: '/app', element: <RequireAccess>{(me) => <DashboardPage me={me} />}</RequireAccess> },
  {
    path: '/app/empresa',
    element: <RequireAccess>{(me) => <CompanyPage me={me} />}</RequireAccess>,
  },
  {
    path: '/app/pessoas',
    element: <RequireAccess>{(me) => <PartiesListPage me={me} />}</RequireAccess>,
  },
  {
    path: '/app/pessoas/nova',
    element: <RequireAccess>{(me) => <PartyFormPage me={me} />}</RequireAccess>,
  },
  {
    path: '/app/pessoas/:id',
    element: <RequireAccess>{(me) => <PartyFormPage me={me} />}</RequireAccess>,
  },
  {
    path: '/checkout',
    element: <RequireSession>{(me) => <CheckoutPage me={me} />}</RequireSession>,
  },
  { path: '*', element: <NotFoundPage /> },
];
