import { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import { queryClient } from '../config/queryClient';
import { router } from '../routes/routes';
import { AuthProvider } from './AuthProvider';
import { ModalProvider } from './ModalProvider';

type AppProvidersProps = {
  children?: ReactNode;
};

export const AppProviders = ({ children }: AppProvidersProps): JSX.Element => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ModalProvider>
        <RouterProvider router={router} />
        <Toaster richColors position="top-right" />
        <ReactQueryDevtools initialIsOpen={false} />
        {children}
      </ModalProvider>
    </AuthProvider>
  </QueryClientProvider>
);
