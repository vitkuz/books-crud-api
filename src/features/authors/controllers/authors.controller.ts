import { Request, Response } from 'express';
import { ZodError } from 'zod';
import * as authorsService from '../services';
import {
  authorIdParamSchema,
  createAuthorSchema,
  updateAuthorSchema,
} from '../authors.schema';
import {
  Author,
  CreateAuthorPayload,
  DeleteAuthorResult,
  UpdateAuthorPayload,
} from '../authors.types';

const badRequest = (res: Response, err: ZodError): Response =>
  res.status(400).json({ error: 'ValidationError', issues: err.issues });

export const postAuthor = (req: Request, res: Response): Response => {
  const parsed: ReturnType<typeof createAuthorSchema.safeParse> = createAuthorSchema.safeParse(
    req.body,
  );
  if (!parsed.success) return badRequest(res, parsed.error);
  const payload: CreateAuthorPayload = parsed.data;
  const author: Author = authorsService.createAuthor(payload);
  return res.status(201).json(author);
};

export const getAuthors = (_req: Request, res: Response): Response => {
  const authors: Author[] = authorsService.listAuthors();
  return res.status(200).json(authors);
};

export const getAuthorById = (req: Request, res: Response): Response => {
  const parsed: ReturnType<typeof authorIdParamSchema.safeParse> = authorIdParamSchema.safeParse(
    req.params,
  );
  if (!parsed.success) return badRequest(res, parsed.error);
  const author: Author | undefined = authorsService.getAuthor(parsed.data.id);
  if (!author) return res.status(404).json({ error: 'NotFound' });
  return res.status(200).json(author);
};

export const putAuthor = (req: Request, res: Response): Response => {
  const paramsParsed: ReturnType<typeof authorIdParamSchema.safeParse> =
    authorIdParamSchema.safeParse(req.params);
  if (!paramsParsed.success) return badRequest(res, paramsParsed.error);
  const bodyParsed: ReturnType<typeof updateAuthorSchema.safeParse> = updateAuthorSchema.safeParse(
    req.body,
  );
  if (!bodyParsed.success) return badRequest(res, bodyParsed.error);
  const payload: UpdateAuthorPayload = bodyParsed.data;
  const updated: Author | undefined = authorsService.updateAuthor(paramsParsed.data.id, payload);
  if (!updated) return res.status(404).json({ error: 'NotFound' });
  return res.status(200).json(updated);
};

export const deleteAuthorById = (req: Request, res: Response): Response => {
  const parsed: ReturnType<typeof authorIdParamSchema.safeParse> = authorIdParamSchema.safeParse(
    req.params,
  );
  if (!parsed.success) return badRequest(res, parsed.error);
  const result: DeleteAuthorResult = authorsService.deleteAuthor(parsed.data.id);
  if (!result.ok && result.error === 'AUTHOR_NOT_FOUND') {
    return res.status(404).json({ error: 'NotFound' });
  }
  if (!result.ok && result.error === 'AUTHOR_HAS_BOOKS') {
    return res.status(409).json({
      error: 'Conflict',
      message: 'Author has books referencing them. Delete or reassign those books first.',
    });
  }
  return res.status(204).send();
};
