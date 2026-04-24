import logger from '../../../shared/utils/logger';
import { findUserByEmail, findUserById, replaceUser } from '../users.store';
import {
  UpdateUserPayload,
  UpdateUserResult,
  User,
  UserPatch,
} from '../users.types';
import { hashPassword } from '../../../shared/utils/password';

export const updateUser = (id: string, payload: UpdateUserPayload): UpdateUserResult => {
  logger.debug('update-user.service start', { id });
  if (!findUserById(id)) {
    logger.debug('update-user.service not-found', { id });
    return { ok: false, error: 'USER_NOT_FOUND' };
  }
  if (payload.email !== undefined) {
    const collision: User | undefined = findUserByEmail(payload.email);
    if (collision && collision.id !== id) {
      logger.debug('update-user.service email-taken', { email: payload.email });
      return { ok: false, error: 'EMAIL_TAKEN' };
    }
  }
  const patch: UserPatch = {};
  if (payload.email !== undefined) patch.email = payload.email;
  if (payload.name !== undefined) patch.name = payload.name;
  if (payload.password !== undefined) patch.passwordHash = hashPassword(payload.password);
  const updated: User | undefined = replaceUser(id, patch);
  if (!updated) {
    logger.debug('update-user.service not-found-on-replace', { id });
    return { ok: false, error: 'USER_NOT_FOUND' };
  }
  logger.debug('update-user.service success', { id });
  return { ok: true, user: updated };
};
