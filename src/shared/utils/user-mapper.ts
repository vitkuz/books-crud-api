import { User, UserResponse } from '../../features/users/users.types';

export const toUserResponse = (user: User): UserResponse => ({
  id: user.id,
  email: user.email,
  name: user.name,
  metadata: user.metadata,
});
