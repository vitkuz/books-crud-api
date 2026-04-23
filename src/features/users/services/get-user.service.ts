import logger from '../../../shared/utils/logger';
import { findUserById } from '../users.store';
import { User } from '../users.types';

export const getUser = (id: string): User | undefined => {
  logger.debug('get-user.service start', { id });
  const user: User | undefined = findUserById(id);
  if (!user) {
    logger.debug('get-user.service not-found', { id });
    return undefined;
  }
  logger.debug('get-user.service success', { id });
  return user;
};
