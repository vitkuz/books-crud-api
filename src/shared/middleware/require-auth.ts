import { NextFunction, Request, Response } from 'express';
import { findSession } from '../../features/auth/auth.store';
import { extractBearerToken } from '../../features/auth/auth.utils';
import { Session } from '../../features/auth/auth.types';
import logger from '../utils/logger';

declare module 'express-serve-static-core' {
  interface Request {
    auth?: { userId: string; token: string };
  }
}

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  logger.debug('require-auth start', { path: req.path });
  const token: string | undefined = extractBearerToken(req.header('authorization'));
  if (!token) {
    logger.debug('require-auth missing-token', { path: req.path });
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const session: Session | undefined = findSession(token);
  if (!session) {
    logger.debug('require-auth unknown-token', { path: req.path });
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  req.auth = { userId: session.userId, token };
  logger.debug('require-auth success', { userId: session.userId });
  next();
};
