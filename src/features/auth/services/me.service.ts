import logger from '../../../shared/utils/logger';
import { toUserResponse } from '../../../shared/utils/user-mapper';
import { findUserById } from '../../users/users.store';
import { User } from '../../users/users.types';
import { MeResult } from '../auth.types';

export const me = (userId: string): MeResult => {
  logger.debug('me.service start', { userId });
  const user: User | undefined = findUserById(userId);
  if (!user) {
    logger.debug('me.service user-missing', { userId });
    return { ok: false, error: 'UNAUTHORIZED' };
  }
  logger.debug('me.service success', { userId });
  return { ok: true, user: toUserResponse(user) };
};
