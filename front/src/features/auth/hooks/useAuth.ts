import { useContext } from 'react';
import { AuthContext, AuthContextValue } from '@/app/providers/AuthProvider';

export const useAuth = (): AuthContextValue => {
  const ctx: AuthContextValue | null = useContext(AuthContext);
  if (ctx === null) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
