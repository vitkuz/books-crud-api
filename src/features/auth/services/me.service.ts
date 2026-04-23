import logger from '../../../shared/utils/logger';
import { findUserById } from '../../users/users.store';
import { User } from '../../users/users.types';
import { findSession } from '../auth.store';
import { MeResult, Session } from '../auth.types';

export const me = (token: string): MeResult => {
  logger.debug('me.service start');
  const session: Session | undefined = findSession(token);
  if (!session) {
    logger.debug('me.service unknown-token');
    return { ok: false, error: 'UNAUTHORIZED' };
  }
  const user: User | undefined = findUserById(session.userId);
  if (!user) {
    logger.debug('me.service user-missing', { userId: session.userId });
    return { ok: false, error: 'UNAUTHORIZED' };
  }
  logger.debug('me.service success', { id: user.id });
  return { ok: true, user };
};
