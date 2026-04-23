import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { User, UserResponse } from './users.types';

const SCRYPT_KEY_LEN = 32;
const SALT_BYTES = 16;

export const toUserResponse = (user: User): UserResponse => ({
  id: user.id,
  email: user.email,
  name: user.name,
  metadata: user.metadata,
});

export const hashPassword = (plain: string): string => {
  const salt: string = randomBytes(SALT_BYTES).toString('hex');
  const hash: string = scryptSync(plain, salt, SCRYPT_KEY_LEN).toString('hex');
  return `${salt}:${hash}`;
};

export const verifyPassword = (plain: string, stored: string): boolean => {
  const [salt, hashHex] = stored.split(':');
  if (!salt || !hashHex) return false;
  const expected: Buffer = Buffer.from(hashHex, 'hex');
  const actual: Buffer = scryptSync(plain, salt, SCRYPT_KEY_LEN);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
};
