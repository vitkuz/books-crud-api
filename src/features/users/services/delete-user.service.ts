import logger from '../../../shared/utils/logger';
import { removeUser } from '../users.store';

export const deleteUser = (id: string): boolean => {
  logger.debug('delete-user.service start', { id });
  const removed: boolean = removeUser(id);
  if (!removed) {
    logger.debug('delete-user.service not-found', { id });
    return false;
  }
  logger.debug('delete-user.service success', { id });
  return true;
};
