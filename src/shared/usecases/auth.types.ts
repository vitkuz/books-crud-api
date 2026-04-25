import { UserResponse } from '../types/user.types';

export type AuthSuccess = {
  ok: true;
  user: UserResponse;
  token: string;
};
