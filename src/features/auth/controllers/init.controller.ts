import { Request, Response } from 'express';
import { toUserResponse } from '../../users/users.utils';
import { InitResult } from '../auth.types';
import * as authService from '../services';

export const postInit = (_req: Request, res: Response): Response => {
  const result: InitResult = authService.init();
  if (!result.ok && result.error === 'ALREADY_INITIALIZED') {
    return res.status(409).json({
      error: 'Conflict',
      message: '/init is only available when the system has zero users',
    });
  }
  if (!result.ok) return res.status(500).json({ error: 'InternalServerError' });
  return res.status(201).json({
    user: toUserResponse(result.user),
    password: result.password,
    token: result.token,
  });
};
