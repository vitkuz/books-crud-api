import { z } from 'zod';
import { UserResponse } from '../users/users.types';
import { loginSchema, registerSchema } from './auth.schema';

export type RegisterPayload = z.infer<typeof registerSchema>;
export type LoginPayload = z.infer<typeof loginSchema>;

export type AuthSuccess = {
  ok: true;
  user: UserResponse;
  token: string;
};

export type RegisterResult =
  | AuthSuccess
  | { ok: false; error: 'EMAIL_TAKEN' }
  | { ok: false; error: 'INTERNAL' };

export type LoginResult =
  | AuthSuccess
  | { ok: false; error: 'INVALID_CREDENTIALS' }
  | { ok: false; error: 'INTERNAL' };

export type MeResult =
  | { ok: true; user: UserResponse }
  | { ok: false; error: 'UNAUTHORIZED' };

export type InitResult =
  | { ok: true; user: UserResponse; password: string; token: string }
  | { ok: false; error: 'ALREADY_INITIALIZED' }
  | { ok: false; error: 'INTERNAL' };

export type AuthResponseBody = {
  user: UserResponse;
  token: string;
};
