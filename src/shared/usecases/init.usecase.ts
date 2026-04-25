import { randomBytes } from 'node:crypto';
import { sessionsService } from '../services/sessions.service';
import { usersService } from '../services/users.service';
import { CreateUserResult, UserResponse } from '../types/user.types';
import logger from '../utils/logger';
import { toUserResponse } from '../utils/user-mapper';

export type InitResult =
  | { ok: true; user: UserResponse; password: string; token: string }
  | { ok: false; error: 'ALREADY_INITIALIZED' }
  | { ok: false; error: 'INTERNAL' };

const generateEmail = (): string => {
  const suffix = randomBytes(3).toString('hex');
  return `admin-${suffix}@local`;
};

const generatePassword = (): string => randomBytes(12).toString('base64url');

export const initUseCase = async (): Promise<InitResult> => {
  logger.debug('init.usecase start');

  const count = await usersService.count();
  if (count > 0) {
    logger.debug('init.usecase already-initialized', { count });
    return { ok: false, error: 'ALREADY_INITIALIZED' };
  }

  const email = generateEmail();
  const password = generatePassword();

  const created: CreateUserResult = await usersService.create({
    email,
    password,
    name: 'Bootstrap Admin',
  });
  if (!created.ok) {
    logger.debug('init.usecase user-create-failed', { error: created.error });
    return { ok: false, error: 'INTERNAL' };
  }

  try {
    const token = await sessionsService.create(created.user.id);
    logger.debug('init.usecase success', { id: created.user.id });
    return {
      ok: true,
      user: toUserResponse(created.user),
      password,
      token,
    };
  } catch (err) {
    logger.debug('init.usecase session-create-failed', {
      id: created.user.id,
      error: err instanceof Error ? err.message : String(err),
    });
    await usersService.delete(created.user.id).catch((rollbackErr: unknown): void => {
      logger.debug('init.usecase rollback-failed', {
        id: created.user.id,
        error: rollbackErr instanceof Error ? rollbackErr.message : String(rollbackErr),
      });
    });
    return { ok: false, error: 'INTERNAL' };
  }
};
