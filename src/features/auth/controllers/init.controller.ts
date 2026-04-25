import { Request, Response } from 'express';
import { initUseCase, InitResult } from '../../../shared/usecases';

export const postInit = async (_req: Request, res: Response): Promise<Response> => {
  const result: InitResult = await initUseCase();
  if (!result.ok && result.error === 'ALREADY_INITIALIZED') {
    return res.status(409).json({
      error: 'Conflict',
      message: '/init is only available when the system has zero users',
    });
  }
  if (!result.ok) return res.status(500).json({ error: 'InternalServerError' });
  return res.status(201).json({
    user: result.user,
    password: result.password,
    token: result.token,
  });
};
