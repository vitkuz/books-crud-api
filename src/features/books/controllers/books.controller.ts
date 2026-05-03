import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { booksService } from '../../../shared/services/books.service';
import {
  Book,
  BookResponse,
  CreateBookResult,
  UpdateBookResult,
} from '../../../shared/types/book.types';
import {
  createBookUseCase,
  listBooksUseCase,
  updateBookUseCase,
} from '../../../shared/usecases';
import { toBookResponse } from '../../../shared/usecases/to-book-response.usecase';
import {
  batchBooksSchema,
  bookFiltersQuerySchema,
  bookIdParamSchema,
  createBookSchema,
  updateBookSchema,
} from '../books.schema';
import { CreateBookPayload, UpdateBookPayload } from '../books.types';

const badRequest = (res: Response, err: ZodError): Response =>
  res.status(400).json({ error: 'ValidationError', issues: err.issues });

const authorNotFound = (res: Response): Response =>
  res.status(400).json({
    error: 'InvalidAuthor',
    message: 'authorId does not reference an existing author',
  });

const invalidCategoryIds = (res: Response, missingIds: string[]): Response =>
  res.status(400).json({
    error: 'InvalidCategoryIds',
    message: `One or more categoryIds do not reference existing categories: ${missingIds.join(', ')}`,
  });

export const postBook = async (req: Request, res: Response): Promise<Response> => {
  const parsed: ReturnType<typeof createBookSchema.safeParse> = createBookSchema.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error);
  const payload: CreateBookPayload = parsed.data;
  const result: CreateBookResult = await createBookUseCase(payload);
  if (!result.ok && result.error === 'AUTHOR_NOT_FOUND') return authorNotFound(res);
  if (!result.ok && result.error === 'INVALID_CATEGORY_IDS') {
    return invalidCategoryIds(res, result.missingIds);
  }
  if (!result.ok) return res.status(500).json({ error: 'InternalServerError' });
  const body: BookResponse = await toBookResponse(result.book);
  return res.status(201).json(body);
};

export const getBooks = async (req: Request, res: Response): Promise<Response> => {
  const parsed: ReturnType<typeof bookFiltersQuerySchema.safeParse> = bookFiltersQuerySchema.safeParse(req.query);
  if (!parsed.success) return badRequest(res, parsed.error);
  const books: Book[] = await listBooksUseCase(parsed.data);
  const body: BookResponse[] = await Promise.all(books.map(toBookResponse));
  return res.status(200).json(body);
};

export const getBooksCount = async (_req: Request, res: Response): Promise<Response> => {
  const count = await booksService.count();
  return res.status(200).json({ count });
};

export const postBooksBatch = async (req: Request, res: Response): Promise<Response> => {
  const parsed: ReturnType<typeof batchBooksSchema.safeParse> = batchBooksSchema.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error);
  const books: Book[] = await booksService.findManyByIds(parsed.data.ids);
  const body: BookResponse[] = await Promise.all(books.map(toBookResponse));
  return res.status(200).json(body);
};

export const getBookById = async (req: Request, res: Response): Promise<Response> => {
  const parsed: ReturnType<typeof bookIdParamSchema.safeParse> = bookIdParamSchema.safeParse(req.params);
  if (!parsed.success) return badRequest(res, parsed.error);
  const book: Book | undefined = await booksService.findById(parsed.data.id);
  if (!book) return res.status(404).json({ error: 'NotFound' });
  const body: BookResponse = await toBookResponse(book);
  return res.status(200).json(body);
};

export const putBook = async (req: Request, res: Response): Promise<Response> => {
  const paramsParsed: ReturnType<typeof bookIdParamSchema.safeParse> = bookIdParamSchema.safeParse(req.params);
  if (!paramsParsed.success) return badRequest(res, paramsParsed.error);
  const bodyParsed: ReturnType<typeof updateBookSchema.safeParse> = updateBookSchema.safeParse(req.body);
  if (!bodyParsed.success) return badRequest(res, bodyParsed.error);
  const payload: UpdateBookPayload = bodyParsed.data;
  const result: UpdateBookResult = await updateBookUseCase(paramsParsed.data.id, payload);
  if (!result.ok && result.error === 'BOOK_NOT_FOUND') {
    return res.status(404).json({ error: 'NotFound' });
  }
  if (!result.ok && result.error === 'AUTHOR_NOT_FOUND') return authorNotFound(res);
  if (!result.ok && result.error === 'INVALID_CATEGORY_IDS') {
    return invalidCategoryIds(res, result.missingIds);
  }
  if (!result.ok) return res.status(500).json({ error: 'InternalServerError' });
  const body: BookResponse = await toBookResponse(result.book);
  return res.status(200).json(body);
};

export const deleteBookById = async (req: Request, res: Response): Promise<Response> => {
  const parsed: ReturnType<typeof bookIdParamSchema.safeParse> = bookIdParamSchema.safeParse(req.params);
  if (!parsed.success) return badRequest(res, parsed.error);
  const removed = await booksService.delete(parsed.data.id);
  if (!removed) return res.status(404).json({ error: 'NotFound' });
  return res.status(204).send();
};
