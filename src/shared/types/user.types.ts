import { Metadata } from './metadata.types';

export type User = {
  id: string;
  email: string;
  passwordHash: string;
  name?: string;
  metadata: Metadata;
};

export type UserResponse = {
  id: string;
  email: string;
  name?: string;
  metadata: Metadata;
};

export type UserPatch = Partial<Omit<User, 'id' | 'metadata'>>;

export type CreateUserResult =
  | { ok: true; user: User }
  | { ok: false; error: 'EMAIL_TAKEN' }
  | { ok: false; error: 'INTERNAL' };

export type UpdateUserResult =
  | { ok: true; user: User }
  | { ok: false; error: 'USER_NOT_FOUND' }
  | { ok: false; error: 'EMAIL_TAKEN' }
  | { ok: false; error: 'INTERNAL' };
