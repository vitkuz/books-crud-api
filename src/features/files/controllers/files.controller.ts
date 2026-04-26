import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { createPresignedUrlUseCase, PresignedUrlResult } from '../../../shared/usecases';
import { presignedUrlSchema } from '../files.schema';
import { PresignedUrlPayload } from '../files.types';

const badRequest = (res: Response, err: ZodError): Response =>
  res.status(400).json({ error: 'ValidationError', issues: err.issues });

export const postPresignedUrl = async (req: Request, res: Response): Promise<Response> => {
  const parsed: ReturnType<typeof presignedUrlSchema.safeParse> = presignedUrlSchema.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error);
  const payload: PresignedUrlPayload = parsed.data;
  const result: PresignedUrlResult = await createPresignedUrlUseCase(payload);
  return res.status(200).json(result);
};
