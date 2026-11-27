import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter } from 'react-router';
import { App } from './app';
import { createQueryClient } from './api/query-client';
import { routes } from './routes';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('Elemento #root não encontrado');

createRoot(root).render(
  <StrictMode>
    <App router={createBrowserRouter(routes)} queryClient={createQueryClient()} />
  </StrictMode>,
);
