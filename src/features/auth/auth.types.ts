import { z } from 'zod';
import { UserResponse } from '../../shared/types/user.types';
import { loginSchema, registerSchema } from './auth.schema';

export type RegisterPayload = z.infer<typeof registerSchema>;
export type LoginPayload = z.infer<typeof loginSchema>;

export type AuthResponseBody = {
  user: UserResponse;
  token: string;
};
