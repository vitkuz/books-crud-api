import { Request, Response } from 'express';
import { ZodError } from 'zod';
import * as tagsService from '../services';
import {
  batchTagsSchema,
  createTagSchema,
  tagIdParamSchema,
  updateTagSchema,
} from '../tags.schema';
import { CreateTagPayload, DeleteTagResult, Tag, UpdateTagPayload } from '../tags.types';

const badRequest = (res: Response, err: ZodError): Response =>
  res.status(400).json({ error: 'ValidationError', issues: err.issues });

export const postTag = (req: Request, res: Response): Response => {
  const parsed: ReturnType<typeof createTagSchema.safeParse> = createTagSchema.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error);
  const payload: CreateTagPayload = parsed.data;
  const tag: Tag = tagsService.createTag(payload);
  return res.status(201).json(tag);
};

export const getTags = (_req: Request, res: Response): Response => {
  const tags: Tag[] = tagsService.listTags();
  return res.status(200).json(tags);
};

export const postTagsBatch = (req: Request, res: Response): Response => {
  const parsed: ReturnType<typeof batchTagsSchema.safeParse> = batchTagsSchema.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error);
  const tags: Tag[] = tagsService.batchTags(parsed.data.ids);
  return res.status(200).json(tags);
};

export const getTagById = (req: Request, res: Response): Response => {
  const parsed: ReturnType<typeof tagIdParamSchema.safeParse> = tagIdParamSchema.safeParse(
    req.params,
  );
  if (!parsed.success) return badRequest(res, parsed.error);
  const tag: Tag | undefined = tagsService.getTag(parsed.data.id);
  if (!tag) return res.status(404).json({ error: 'NotFound' });
  return res.status(200).json(tag);
};

export const putTag = (req: Request, res: Response): Response => {
  const paramsParsed: ReturnType<typeof tagIdParamSchema.safeParse> = tagIdParamSchema.safeParse(
    req.params,
  );
  if (!paramsParsed.success) return badRequest(res, paramsParsed.error);
  const bodyParsed: ReturnType<typeof updateTagSchema.safeParse> = updateTagSchema.safeParse(
    req.body,
  );
  if (!bodyParsed.success) return badRequest(res, bodyParsed.error);
  const payload: UpdateTagPayload = bodyParsed.data;
  const updated: Tag | undefined = tagsService.updateTag(paramsParsed.data.id, payload);
  if (!updated) return res.status(404).json({ error: 'NotFound' });
  return res.status(200).json(updated);
};

export const deleteTagById = (req: Request, res: Response): Response => {
  const parsed: ReturnType<typeof tagIdParamSchema.safeParse> = tagIdParamSchema.safeParse(
    req.params,
  );
  if (!parsed.success) return badRequest(res, parsed.error);
  const result: DeleteTagResult = tagsService.deleteTag(parsed.data.id);
  if (!result.ok && result.error === 'TAG_NOT_FOUND') {
    return res.status(404).json({ error: 'NotFound' });
  }
  if (!result.ok && result.error === 'TAG_HAS_BOOKS') {
    return res.status(409).json({
      error: 'Conflict',
      message: 'Tag is referenced by one or more books. Remove those references first.',
    });
  }
  return res.status(204).send();
};
