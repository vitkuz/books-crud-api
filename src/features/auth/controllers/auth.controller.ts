import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { sessionsService } from '../../../shared/services/sessions.service';
import { usersService } from '../../../shared/services/users.service';
import { User, UserResponse } from '../../../shared/types/user.types';
import {
  AuthSuccess,
  loginUseCase,
  LoginResult,
  registerUseCase,
  RegisterResult,
} from '../../../shared/usecases';
import { toUserResponse } from '../../../shared/utils/user-mapper';
import { loginSchema, registerSchema } from '../auth.schema';
import { AuthResponseBody, LoginPayload, RegisterPayload } from '../auth.types';

const badRequest = (res: Response, err: ZodError): Response =>
  res.status(400).json({ error: 'ValidationError', issues: err.issues });

const unauthorized = (res: Response): Response =>
  res.status(401).json({ error: 'Unauthorized' });

const toAuthBody = (result: AuthSuccess): AuthResponseBody => ({
  user: result.user,
  token: result.token,
});

export const postRegister = async (req: Request, res: Response): Promise<Response> => {
  const parsed: ReturnType<typeof registerSchema.safeParse> = registerSchema.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error);
  const payload: RegisterPayload = parsed.data;
  const result: RegisterResult = await registerUseCase(payload);
  if (!result.ok && result.error === 'EMAIL_TAKEN') {
    return res.status(409).json({ error: 'Conflict', message: 'email already registered' });
  }
  if (!result.ok) return res.status(500).json({ error: 'InternalServerError' });
  return res.status(201).json(toAuthBody(result));
};

export const postLogin = async (req: Request, res: Response): Promise<Response> => {
  const parsed: ReturnType<typeof loginSchema.safeParse> = loginSchema.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error);
  const payload: LoginPayload = parsed.data;
  const result: LoginResult = await loginUseCase(payload);
  if (!result.ok && result.error === 'INVALID_CREDENTIALS') {
    return res.status(401).json({ error: 'Unauthorized', message: 'invalid email or password' });
  }
  if (!result.ok) return res.status(500).json({ error: 'InternalServerError' });
  return res.status(200).json(toAuthBody(result));
};

export const postLogout = async (req: Request, res: Response): Promise<Response> => {
  await sessionsService.deleteByToken(req.auth!.token);
  return res.status(204).send();
};

export const getMe = async (req: Request, res: Response): Promise<Response> => {
  const user: User | undefined = await usersService.findById(req.auth!.userId);
  if (!user) return unauthorized(res);
  const body: UserResponse = toUserResponse(user);
  return res.status(200).json(body);
};
