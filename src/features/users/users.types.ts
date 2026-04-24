import { z } from 'zod';
import { Metadata } from '../../shared/types/metadata.types';
import { createUserSchema, updateUserSchema } from './users.schema';

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

export type CreateUserPayload = z.infer<typeof createUserSchema>;
export type UpdateUserPayload = z.infer<typeof updateUserSchema>;

export type CreateUserResult =
  | { ok: true; user: User }
  | { ok: false; error: 'EMAIL_TAKEN' };

export type UpdateUserResult =
  | { ok: true; user: User }
  | { ok: false; error: 'USER_NOT_FOUND' }
  | { ok: false; error: 'EMAIL_TAKEN' };
