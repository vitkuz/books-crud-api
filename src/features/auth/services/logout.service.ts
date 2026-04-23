import logger from '../../../shared/utils/logger';
import { removeSession } from '../auth.store';

export const logout = (token: string): boolean => {
  logger.debug('logout.service start');
  const removed: boolean = removeSession(token);
  if (!removed) {
    logger.debug('logout.service unknown-token');
    return false;
  }
  logger.debug('logout.service success');
  return true;
};
