import logger from '../../../shared/utils/logger';
import { verifyPassword } from '../../../shared/utils/password';
import { toUserResponse } from '../../../shared/utils/user-mapper';
import { findUserByEmail } from '../../users/users.store';
import { User } from '../../users/users.types';
import { createSession } from '../auth.store';
import { LoginPayload, LoginResult } from '../auth.types';

export const login = (payload: LoginPayload): LoginResult => {
  logger.debug('login.service start', { email: payload.email });
  const user: User | undefined = findUserByEmail(payload.email);
  if (!user || !verifyPassword(payload.password, user.passwordHash)) {
    logger.debug('login.service invalid-credentials', { email: payload.email });
    return { ok: false, error: 'INVALID_CREDENTIALS' };
  }
  const token: string = createSession(user.id);
  logger.debug('login.service success', { id: user.id });
  return { ok: true, user: toUserResponse(user), token };
};
