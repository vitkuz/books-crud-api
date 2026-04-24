import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { loginSchema, registerSchema } from '../auth.schema';
import {
  AuthResponseBody,
  AuthSuccess,
  LoginPayload,
  LoginResult,
  MeResult,
  RegisterPayload,
  RegisterResult,
} from '../auth.types';
import * as authService from '../services';

const badRequest = (res: Response, err: ZodError): Response =>
  res.status(400).json({ error: 'ValidationError', issues: err.issues });

const unauthorized = (res: Response): Response =>
  res.status(401).json({ error: 'Unauthorized' });

const toAuthBody = (result: AuthSuccess): AuthResponseBody => ({
  user: result.user,
  token: result.token,
});

export const postRegister = (req: Request, res: Response): Response => {
  const parsed: ReturnType<typeof registerSchema.safeParse> = registerSchema.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error);
  const payload: RegisterPayload = parsed.data;
  const result: RegisterResult = authService.register(payload);
  if (!result.ok && result.error === 'EMAIL_TAKEN') {
    return res.status(409).json({ error: 'Conflict', message: 'email already registered' });
  }
  if (!result.ok) return res.status(500).json({ error: 'InternalServerError' });
  return res.status(201).json(toAuthBody(result));
};

export const postLogin = (req: Request, res: Response): Response => {
  const parsed: ReturnType<typeof loginSchema.safeParse> = loginSchema.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error);
  const payload: LoginPayload = parsed.data;
  const result: LoginResult = authService.login(payload);
  if (!result.ok && result.error === 'INVALID_CREDENTIALS') {
    return res.status(401).json({ error: 'Unauthorized', message: 'invalid email or password' });
  }
  if (!result.ok) return res.status(500).json({ error: 'InternalServerError' });
  return res.status(200).json(toAuthBody(result));
};

export const postLogout = (req: Request, res: Response): Response => {
  authService.logout(req.auth!.token);
  return res.status(204).send();
};

export const getMe = (req: Request, res: Response): Response => {
  const result: MeResult = authService.me(req.auth!.userId);
  if (!result.ok) return unauthorized(res);
  return res.status(200).json(result.user);
};
