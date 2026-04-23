import { randomBytes } from 'node:crypto';
import logger from '../../../shared/utils/logger';
import * as usersService from '../../users/services';
import { countUsers } from '../../users/users.store';
import { createSession } from '../auth.store';
import { InitResult } from '../auth.types';

const generateEmail = (): string => {
  const suffix: string = randomBytes(3).toString('hex');
  return `admin-${suffix}@local`;
};

const generatePassword = (): string => randomBytes(12).toString('base64url');

export const init = (): InitResult => {
  logger.debug('init.service start');
  if (countUsers() > 0) {
    logger.debug('init.service already-initialized');
    return { ok: false, error: 'ALREADY_INITIALIZED' };
  }
  const email: string = generateEmail();
  const password: string = generatePassword();
  const created = usersService.createUser({ email, password, name: 'Bootstrap Admin' });
  if (!created.ok) {
    // EMAIL_TAKEN here is practically unreachable — we just verified no users
    // exist — but the type says we must handle it.
    logger.error('init.service unexpected create failure', { error: created.error });
    return { ok: false, error: 'ALREADY_INITIALIZED' };
  }
  const token: string = createSession(created.user.id);
  logger.debug('init.service success', { id: created.user.id });
  return { ok: true, user: created.user, password, token };
};
