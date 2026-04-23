import { v4 as uuidv4 } from 'uuid';
import { Session } from './auth.types';

const sessions: Map<string, Session> = new Map<string, Session>();

export const createSession = (userId: string): string => {
  const token: string = uuidv4();
  sessions.set(token, { userId, createdAt: new Date().toISOString() });
  return token;
};

export const findSession = (token: string): Session | undefined => sessions.get(token);

export const removeSession = (token: string): boolean => sessions.delete(token);
