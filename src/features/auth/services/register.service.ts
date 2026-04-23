import logger from '../../../shared/utils/logger';
import * as usersService from '../../users/services';
import { createSession } from '../auth.store';
import { RegisterPayload, RegisterResult } from '../auth.types';

export const register = (payload: RegisterPayload): RegisterResult => {
  logger.debug('register.service start', { email: payload.email });
  const created = usersService.createUser(payload);
  if (!created.ok) {
    logger.debug('register.service email-taken', { email: payload.email });
    return { ok: false, error: 'EMAIL_TAKEN' };
  }
  const token: string = createSession(created.user.id);
  logger.debug('register.service success', { id: created.user.id });
  return { ok: true, user: created.user, token };
};
