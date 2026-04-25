import { sessionsService } from '../services/sessions.service';
import { usersService } from '../services/users.service';
import { CreateUserResult, User } from '../types/user.types';
import logger from '../utils/logger';
import { toUserResponse } from '../utils/user-mapper';
import { AuthSuccess } from './auth.types';

export type RegisterInput = {
  email: string;
  password: string;
  name?: string;
};

export type RegisterResult =
  | AuthSuccess
  | { ok: false; error: 'EMAIL_TAKEN' }
  | { ok: false; error: 'INTERNAL' };

export const registerUseCase = async (input: RegisterInput): Promise<RegisterResult> => {
  logger.debug('register.usecase start', { email: input.email });

  const created: CreateUserResult = await usersService.create(input);
  if (!created.ok) {
    logger.debug('register.usecase user-create-failed', { error: created.error });
    return created;
  }
  const user: User = created.user;

  try {
    const token = await sessionsService.create(user.id);
    logger.debug('register.usecase success', { id: user.id });
    return { ok: true, user: toUserResponse(user), token };
  } catch (err) {
    logger.debug('register.usecase session-create-failed', {
      id: user.id,
      error: err instanceof Error ? err.message : String(err),
    });
    await usersService.delete(user.id).catch((rollbackErr: unknown): void => {
      logger.debug('register.usecase rollback-failed', {
        id: user.id,
        error: rollbackErr instanceof Error ? rollbackErr.message : String(rollbackErr),
      });
    });
    return { ok: false, error: 'INTERNAL' };
  }
};
