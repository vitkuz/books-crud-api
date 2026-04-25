import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { usersService } from '../../../shared/services/users.service';
import {
  CreateUserResult,
  UpdateUserResult,
  User,
  UserResponse,
} from '../../../shared/types/user.types';
import { toUserResponse } from '../../../shared/utils/user-mapper';
import {
  createUserSchema,
  updateUserSchema,
  userIdParamSchema,
} from '../users.schema';
import { CreateUserPayload, UpdateUserPayload } from '../users.types';

const badRequest = (res: Response, err: ZodError): Response =>
  res.status(400).json({ error: 'ValidationError', issues: err.issues });

const emailTaken = (res: Response): Response =>
  res.status(409).json({ error: 'Conflict', message: 'email already registered' });

export const postUser = async (req: Request, res: Response): Promise<Response> => {
  const parsed: ReturnType<typeof createUserSchema.safeParse> = createUserSchema.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error);
  const payload: CreateUserPayload = parsed.data;
  const result: CreateUserResult = await usersService.create(payload);
  if (!result.ok && result.error === 'EMAIL_TAKEN') return emailTaken(res);
  if (!result.ok) return res.status(500).json({ error: 'InternalServerError' });
  const body: UserResponse = toUserResponse(result.user);
  return res.status(201).json(body);
};

export const getUsers = async (_req: Request, res: Response): Promise<Response> => {
  const users: User[] = await usersService.findAll();
  const body: UserResponse[] = users.map(toUserResponse);
  return res.status(200).json(body);
};

export const getUserById = async (req: Request, res: Response): Promise<Response> => {
  const parsed: ReturnType<typeof userIdParamSchema.safeParse> = userIdParamSchema.safeParse(req.params);
  if (!parsed.success) return badRequest(res, parsed.error);
  const user: User | undefined = await usersService.findById(parsed.data.id);
  if (!user) return res.status(404).json({ error: 'NotFound' });
  return res.status(200).json(toUserResponse(user));
};

export const putUser = async (req: Request, res: Response): Promise<Response> => {
  const paramsParsed: ReturnType<typeof userIdParamSchema.safeParse> = userIdParamSchema.safeParse(req.params);
  if (!paramsParsed.success) return badRequest(res, paramsParsed.error);
  const bodyParsed: ReturnType<typeof updateUserSchema.safeParse> = updateUserSchema.safeParse(req.body);
  if (!bodyParsed.success) return badRequest(res, bodyParsed.error);
  const payload: UpdateUserPayload = bodyParsed.data;
  const result: UpdateUserResult = await usersService.update(paramsParsed.data.id, payload);
  if (!result.ok && result.error === 'USER_NOT_FOUND') return res.status(404).json({ error: 'NotFound' });
  if (!result.ok && result.error === 'EMAIL_TAKEN') return emailTaken(res);
  if (!result.ok) return res.status(500).json({ error: 'InternalServerError' });
  return res.status(200).json(toUserResponse(result.user));
};

export const deleteUserById = async (req: Request, res: Response): Promise<Response> => {
  const parsed: ReturnType<typeof userIdParamSchema.safeParse> = userIdParamSchema.safeParse(req.params);
  if (!parsed.success) return badRequest(res, parsed.error);
  const removed: boolean = await usersService.delete(parsed.data.id);
  if (!removed) return res.status(404).json({ error: 'NotFound' });
  return res.status(204).send();
};
