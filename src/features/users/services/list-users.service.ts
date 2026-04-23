import logger from '../../../shared/utils/logger';
import { findAllUsers } from '../users.store';
import { User } from '../users.types';

export const listUsers = (): User[] => {
  logger.debug('list-users.service start');
  const users: User[] = findAllUsers();
  logger.debug('list-users.service success', { count: users.length });
  return users;
};
