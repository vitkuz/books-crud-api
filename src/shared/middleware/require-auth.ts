import { NextFunction, Request, Response } from 'express';
import { extractBearerToken } from '../../features/auth/auth.utils';
import { sessionsService } from '../services/sessions.service';
import { Session } from '../types/session.types';
import logger from '../utils/logger';

declare module 'express-serve-static-core' {
  interface Request {
    auth?: { userId: string; token: string };
  }
}

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  logger.debug('require-auth start', { path: req.path });
  const token: string | undefined = extractBearerToken(req.header('authorization'));
  if (!token) {
    logger.debug('require-auth missing-token', { path: req.path });
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    const session: Session | undefined = await sessionsService.findByToken(token);
    if (!session) {
      logger.debug('require-auth unknown-token', { path: req.path });
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    req.auth = { userId: session.userId, token };
    logger.debug('require-auth success', { userId: session.userId });
    next();
  } catch (err) {
    next(err);
  }
};
