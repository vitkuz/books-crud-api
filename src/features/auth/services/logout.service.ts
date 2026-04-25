import { sessionsService } from '../../../shared/services/sessions.service';
import logger from '../../../shared/utils/logger';

export const logout = async (token: string): Promise<boolean> => {
  logger.debug('logout.service start');
  await sessionsService.deleteByToken(token);
  logger.debug('logout.service success');
  return true;
};
