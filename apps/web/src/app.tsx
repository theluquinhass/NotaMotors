import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { RouterProvider, type createBrowserRouter } from 'react-router';

type Router = ReturnType<typeof createBrowserRouter>;

export function App({ router, queryClient }: { router: Router; queryClient: QueryClient }) {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
