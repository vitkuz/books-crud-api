import { User, UserResponse } from '../types/user.types';

export const toUserResponse = (user: User): UserResponse => ({
  id: user.id,
  email: user.email,
  name: user.name,
  metadata: user.metadata,
});
