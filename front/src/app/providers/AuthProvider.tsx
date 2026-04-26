import { createContext, ReactNode, useEffect, useState } from 'react';
import { authApi } from '@/features/auth/api/auth.api';
import { HttpError } from '@/shared/lib/http/errors';
import { getStoredToken, setStoredToken } from '@/shared/lib/http/tokenStore';
import { UserResponse } from '@/shared/types/api.types';

export type AuthState =
  | { status: 'unknown' }
  | { status: 'guest' }
  | { status: 'authed'; user: UserResponse; token: string };

export type AuthContextValue = {
  state: AuthState;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  children: ReactNode;
};

export const AuthProvider = ({ children }: AuthProviderProps): JSX.Element => {
  const [state, setState] = useState<AuthState>({ status: 'unknown' });

  useEffect((): void => {
    const token: string | undefined = getStoredToken();
    if (token === undefined) {
      setState({ status: 'guest' });
      return;
    }
    authApi
      .me()
      .then((user: UserResponse): void => {
        setState({ status: 'authed', user, token });
      })
      .catch((err: unknown): void => {
        if (err instanceof HttpError && err.status === 401) {
          setStoredToken(undefined);
        }
        setState({ status: 'guest' });
      });
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    const result = await authApi.login({ email, password });
    setStoredToken(result.token);
    setState({ status: 'authed', user: result.user, token: result.token });
  };

  const register = async (email: string, password: string, name?: string): Promise<void> => {
    const result = await authApi.register({ email, password, name });
    setStoredToken(result.token);
    setState({ status: 'authed', user: result.user, token: result.token });
  };

  const logout = async (): Promise<void> => {
    try {
      await authApi.logout();
    } catch {
      // best-effort; we clear local state regardless
    }
    setStoredToken(undefined);
    setState({ status: 'guest' });
  };

  return (
    <AuthContext.Provider value={{ state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
