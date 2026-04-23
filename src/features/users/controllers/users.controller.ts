import { Request, Response } from 'express';
import { ZodError } from 'zod';
import * as usersService from '../services';
import {
  createUserSchema,
  updateUserSchema,
  userIdParamSchema,
} from '../users.schema';
import {
  CreateUserPayload,
  CreateUserResult,
  UpdateUserPayload,
  UpdateUserResult,
  User,
  UserResponse,
} from '../users.types';
import { toUserResponse } from '../users.utils';

const badRequest = (res: Response, err: ZodError): Response =>
  res.status(400).json({ error: 'ValidationError', issues: err.issues });

const emailTaken = (res: Response): Response =>
  res.status(409).json({ error: 'Conflict', message: 'email already registered' });

export const postUser = (req: Request, res: Response): Response => {
  const parsed: ReturnType<typeof createUserSchema.safeParse> = createUserSchema.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error);
  const payload: CreateUserPayload = parsed.data;
  const result: CreateUserResult = usersService.createUser(payload);
  if (!result.ok && result.error === 'EMAIL_TAKEN') return emailTaken(res);
  if (!result.ok) return res.status(500).json({ error: 'InternalServerError' });
  const body: UserResponse = toUserResponse(result.user);
  return res.status(201).json(body);
};

export const getUsers = (_req: Request, res: Response): Response => {
  const users: User[] = usersService.listUsers();
  const body: UserResponse[] = users.map(toUserResponse);
  return res.status(200).json(body);
};

export const getUserById = (req: Request, res: Response): Response => {
  const parsed: ReturnType<typeof userIdParamSchema.safeParse> = userIdParamSchema.safeParse(req.params);
  if (!parsed.success) return badRequest(res, parsed.error);
  const user: User | undefined = usersService.getUser(parsed.data.id);
  if (!user) return res.status(404).json({ error: 'NotFound' });
  return res.status(200).json(toUserResponse(user));
};

export const putUser = (req: Request, res: Response): Response => {
  const paramsParsed: ReturnType<typeof userIdParamSchema.safeParse> = userIdParamSchema.safeParse(req.params);
  if (!paramsParsed.success) return badRequest(res, paramsParsed.error);
  const bodyParsed: ReturnType<typeof updateUserSchema.safeParse> = updateUserSchema.safeParse(req.body);
  if (!bodyParsed.success) return badRequest(res, bodyParsed.error);
  const payload: UpdateUserPayload = bodyParsed.data;
  const result: UpdateUserResult = usersService.updateUser(paramsParsed.data.id, payload);
  if (!result.ok && result.error === 'USER_NOT_FOUND') return res.status(404).json({ error: 'NotFound' });
  if (!result.ok && result.error === 'EMAIL_TAKEN') return emailTaken(res);
  if (!result.ok) return res.status(500).json({ error: 'InternalServerError' });
  return res.status(200).json(toUserResponse(result.user));
};

export const deleteUserById = (req: Request, res: Response): Response => {
  const parsed: ReturnType<typeof userIdParamSchema.safeParse> = userIdParamSchema.safeParse(req.params);
  if (!parsed.success) return badRequest(res, parsed.error);
  const removed: boolean = usersService.deleteUser(parsed.data.id);
  if (!removed) return res.status(404).json({ error: 'NotFound' });
  return res.status(204).send();
};
