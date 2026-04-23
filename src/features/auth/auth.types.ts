import { z } from 'zod';
import { User, UserResponse } from '../users/users.types';
import { loginSchema, registerSchema } from './auth.schema';

export type Session = {
  userId: string;
  createdAt: string;
};

export type RegisterPayload = z.infer<typeof registerSchema>;
export type LoginPayload = z.infer<typeof loginSchema>;

export type AuthSuccess = {
  ok: true;
  user: User;
  token: string;
};

export type RegisterResult =
  | AuthSuccess
  | { ok: false; error: 'EMAIL_TAKEN' };

export type LoginResult =
  | AuthSuccess
  | { ok: false; error: 'INVALID_CREDENTIALS' };

export type MeResult =
  | { ok: true; user: User }
  | { ok: false; error: 'UNAUTHORIZED' };

export type InitResult =
  | { ok: true; user: User; password: string; token: string }
  | { ok: false; error: 'ALREADY_INITIALIZED' };

export type AuthResponseBody = {
  user: UserResponse;
  token: string;
};
