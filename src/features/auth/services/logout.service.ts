import { sessionsService } from '../../../shared/services/sessions.service';
import logger from '../../../shared/utils/logger';

export const logout = async (token: string): Promise<void> => {
  logger.debug('logout.service start');
  try {
    await sessionsService.deleteByToken(token);
    logger.debug('logout.service success');
  } catch (err) {
    logger.debug('logout.service delete-failed', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
