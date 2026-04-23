import { Request, Response } from 'express';
import { ZodError } from 'zod';
import logger from '../../../shared/utils/logger';
import * as booksService from '../services';
import {
  batchBooksSchema,
  bookIdParamSchema,
  createBookSchema,
  updateBookSchema,
} from '../books.schema';
import {
  Book,
  BookResponse,
  CreateBookPayload,
  CreateBookResult,
  UpdateBookPayload,
  UpdateBookResult,
} from '../books.types';
import { toBookResponse } from '../books.utils';

const badRequest = (res: Response, err: ZodError): Response =>
  res.status(400).json({ error: 'ValidationError', issues: err.issues });

const authorNotFound = (res: Response): Response =>
  res.status(400).json({ error: 'InvalidAuthor', message: 'authorId does not reference an existing author' });

const invalidCategoryIds = (res: Response, missingIds: string[]): Response =>
  res.status(400).json({
    error: 'InvalidCategoryIds',
    message: `One or more categoryIds do not reference existing categories: ${missingIds.join(', ')}`,
  });

export const postBook = (req: Request, res: Response): Response => {
  const parsed: ReturnType<typeof createBookSchema.safeParse> = createBookSchema.safeParse(
    req.body,
  );
  if (!parsed.success) return badRequest(res, parsed.error);
  const payload: CreateBookPayload = parsed.data;
  const result: CreateBookResult = booksService.createBook(payload);
  if (!result.ok && result.error === 'AUTHOR_NOT_FOUND') return authorNotFound(res);
  if (!result.ok && result.error === 'INVALID_CATEGORY_IDS') {
    return invalidCategoryIds(res, result.missingIds);
  }
  if (!result.ok) return res.status(500).json({ error: 'InternalServerError' });
  const body: BookResponse = toBookResponse(result.book);
  return res.status(201).json(body);
};

export const getBooks = (_req: Request, res: Response): Response => {
  const books: Book[] = booksService.listBooks();
  const body: BookResponse[] = books.map(toBookResponse);
  return res.status(200).json(body);
};

export const getBooksCount = (_req: Request, res: Response): Response => {
  const count: number = booksService.countBooks();
  return res.status(200).json({ count });
};

export const postBooksBatch = (req: Request, res: Response): Response => {
  const parsed: ReturnType<typeof batchBooksSchema.safeParse> = batchBooksSchema.safeParse(
    req.body,
  );
  if (!parsed.success) return badRequest(res, parsed.error);
  const books: Book[] = booksService.batchBooks(parsed.data.ids);
  const body: BookResponse[] = books.map(toBookResponse);
  return res.status(200).json(body);
};

export const getBookById = (req: Request, res: Response): Response => {
  const parsed: ReturnType<typeof bookIdParamSchema.safeParse> = bookIdParamSchema.safeParse(
    req.params,
  );
  if (!parsed.success) return badRequest(res, parsed.error);
  const book: Book | undefined = booksService.getBook(parsed.data.id);
  if (!book) return res.status(404).json({ error: 'NotFound' });
  const body: BookResponse = toBookResponse(book);
  return res.status(200).json(body);
};

export const putBook = (req: Request, res: Response): Response => {
  const paramsParsed: ReturnType<typeof bookIdParamSchema.safeParse> = bookIdParamSchema.safeParse(
    req.params,
  );
  if (!paramsParsed.success) return badRequest(res, paramsParsed.error);
  const bodyParsed: ReturnType<typeof updateBookSchema.safeParse> = updateBookSchema.safeParse(
    req.body,
  );
  if (!bodyParsed.success) return badRequest(res, bodyParsed.error);
  const payload: UpdateBookPayload = bodyParsed.data;
  const result: UpdateBookResult = booksService.updateBook(paramsParsed.data.id, payload);
  if (!result.ok && result.error === 'BOOK_NOT_FOUND') {
    return res.status(404).json({ error: 'NotFound' });
  }
  if (!result.ok && result.error === 'AUTHOR_NOT_FOUND') {
    return authorNotFound(res);
  }
  if (!result.ok && result.error === 'INVALID_CATEGORY_IDS') {
    return invalidCategoryIds(res, result.missingIds);
  }
  if (!result.ok) return res.status(500).json({ error: 'InternalServerError' });
  const body: BookResponse = toBookResponse(result.book);
  return res.status(200).json(body);
};

export const deleteBookById = (req: Request, res: Response): Response => {
  const parsed: ReturnType<typeof bookIdParamSchema.safeParse> = bookIdParamSchema.safeParse(
    req.params,
  );
  if (!parsed.success) return badRequest(res, parsed.error);
  const removed: boolean = booksService.deleteBook(parsed.data.id);
  if (!removed) return res.status(404).json({ error: 'NotFound' });
  logger.debug('books.controller deleteBookById success', { id: parsed.data.id });
  return res.status(204).send();
};
