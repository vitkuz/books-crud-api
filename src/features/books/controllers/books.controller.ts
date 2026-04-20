import { Request, Response } from 'express';
import { ZodError } from 'zod';
import logger from '../../../shared/utils/logger';
import * as booksService from '../services';
import {
  bookIdParamSchema,
  createBookSchema,
  updateBookSchema,
} from '../books.schema';
import { Book, CreateBookPayload, UpdateBookPayload } from '../books.types';

const badRequest = (res: Response, err: ZodError): Response =>
  res.status(400).json({ error: 'ValidationError', issues: err.issues });

export const postBook = (req: Request, res: Response): Response => {
  const parsed: ReturnType<typeof createBookSchema.safeParse> = createBookSchema.safeParse(
    req.body,
  );
  if (!parsed.success) return badRequest(res, parsed.error);
  const payload: CreateBookPayload = parsed.data;
  const book: Book = booksService.createBook(payload);
  return res.status(201).json(book);
};

export const getBooks = (_req: Request, res: Response): Response => {
  const books: Book[] = booksService.listBooks();
  return res.status(200).json(books);
};

export const getBookById = (req: Request, res: Response): Response => {
  const parsed: ReturnType<typeof bookIdParamSchema.safeParse> = bookIdParamSchema.safeParse(
    req.params,
  );
  if (!parsed.success) return badRequest(res, parsed.error);
  const book: Book | undefined = booksService.getBook(parsed.data.id);
  if (!book) return res.status(404).json({ error: 'NotFound' });
  return res.status(200).json(book);
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
  const updated: Book | undefined = booksService.updateBook(paramsParsed.data.id, payload);
  if (!updated) return res.status(404).json({ error: 'NotFound' });
  return res.status(200).json(updated);
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
