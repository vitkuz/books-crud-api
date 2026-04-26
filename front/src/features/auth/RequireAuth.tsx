import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

export const RequireAuth = ({ children }: { children: ReactNode }): JSX.Element => {
  const { state } = useAuth();
  const location = useLocation();

  if (state.status === 'unknown') {
    return <div style={{ padding: 24 }}>Checking session…</div>;
  }
  if (state.status === 'guest') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <>{children}</>;
};
