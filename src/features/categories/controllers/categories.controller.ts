import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { categoriesService } from '../../../shared/services/categories.service';
import { Category, DeleteCategoryResult } from '../../../shared/types/category.types';
import { deleteCategoryUseCase } from '../../../shared/usecases';
import {
  batchCategoriesSchema,
  categoryIdParamSchema,
  createCategorySchema,
  updateCategorySchema,
} from '../categories.schema';
import { CreateCategoryPayload, UpdateCategoryPayload } from '../categories.types';

const badRequest = (res: Response, err: ZodError): Response =>
  res.status(400).json({ error: 'ValidationError', issues: err.issues });

export const postCategory = async (req: Request, res: Response): Promise<Response> => {
  const parsed: ReturnType<typeof createCategorySchema.safeParse> = createCategorySchema.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error);
  const payload: CreateCategoryPayload = parsed.data;
  const category: Category = await categoriesService.create(payload);
  return res.status(201).json(category);
};

export const getCategories = async (_req: Request, res: Response): Promise<Response> => {
  const categories: Category[] = await categoriesService.findAll();
  return res.status(200).json(categories);
};

export const postCategoriesBatch = async (req: Request, res: Response): Promise<Response> => {
  const parsed: ReturnType<typeof batchCategoriesSchema.safeParse> = batchCategoriesSchema.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error);
  const categories: Category[] = await categoriesService.findManyByIds(parsed.data.ids);
  return res.status(200).json(categories);
};

export const getCategoryById = async (req: Request, res: Response): Promise<Response> => {
  const parsed: ReturnType<typeof categoryIdParamSchema.safeParse> = categoryIdParamSchema.safeParse(req.params);
  if (!parsed.success) return badRequest(res, parsed.error);
  const category: Category | undefined = await categoriesService.findById(parsed.data.id);
  if (!category) return res.status(404).json({ error: 'NotFound' });
  return res.status(200).json(category);
};

export const putCategory = async (req: Request, res: Response): Promise<Response> => {
  const paramsParsed: ReturnType<typeof categoryIdParamSchema.safeParse> = categoryIdParamSchema.safeParse(req.params);
  if (!paramsParsed.success) return badRequest(res, paramsParsed.error);
  const bodyParsed: ReturnType<typeof updateCategorySchema.safeParse> = updateCategorySchema.safeParse(req.body);
  if (!bodyParsed.success) return badRequest(res, bodyParsed.error);
  const payload: UpdateCategoryPayload = bodyParsed.data;
  const updated: Category | undefined = await categoriesService.update(paramsParsed.data.id, payload);
  if (!updated) return res.status(404).json({ error: 'NotFound' });
  return res.status(200).json(updated);
};

export const deleteCategoryById = async (req: Request, res: Response): Promise<Response> => {
  const parsed: ReturnType<typeof categoryIdParamSchema.safeParse> = categoryIdParamSchema.safeParse(req.params);
  if (!parsed.success) return badRequest(res, parsed.error);
  const result: DeleteCategoryResult = await deleteCategoryUseCase(parsed.data.id);
  if (!result.ok && result.error === 'CATEGORY_NOT_FOUND') {
    return res.status(404).json({ error: 'NotFound' });
  }
  if (!result.ok && result.error === 'CATEGORY_HAS_BOOKS') {
    return res.status(409).json({
      error: 'Conflict',
      message: 'Category is referenced by one or more books. Remove those references first.',
    });
  }
  return res.status(204).send();
};
