import { sessionsService } from '../services/sessions.service';
import { usersService } from '../services/users.service';
import { User } from '../types/user.types';
import logger from '../utils/logger';
import { verifyPassword } from '../utils/password';
import { toUserResponse } from '../utils/user-mapper';
import { AuthSuccess } from './auth.types';

export type LoginInput = {
  email: string;
  password: string;
};

export type LoginResult =
  | AuthSuccess
  | { ok: false; error: 'INVALID_CREDENTIALS' }
  | { ok: false; error: 'INTERNAL' };

export const loginUseCase = async (input: LoginInput): Promise<LoginResult> => {
  logger.debug('login.usecase start', { email: input.email });

  const user: User | undefined = await usersService.findByEmail(input.email);
  if (!user || !verifyPassword(input.password, user.passwordHash)) {
    logger.debug('login.usecase invalid-credentials', { email: input.email });
    return { ok: false, error: 'INVALID_CREDENTIALS' };
  }

  try {
    const token: string = await sessionsService.create(user.id);
    logger.debug('login.usecase success', { id: user.id });
    return { ok: true, user: toUserResponse(user), token };
  } catch (err) {
    logger.debug('login.usecase session-create-failed', {
      id: user.id,
      error: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, error: 'INTERNAL' };
  }
};
