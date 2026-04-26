import { Router } from 'express';
import { requireAuth } from '../../../shared/middleware/require-auth';
import { asyncHandler } from '../../../shared/utils/async-handler';
import * as booksController from '../controllers';

const booksRouter: Router = Router();

booksRouter.get('/', asyncHandler(booksController.getBooks));
booksRouter.post('/', requireAuth, asyncHandler(booksController.postBook));
booksRouter.post('/batch', requireAuth, asyncHandler(booksController.postBooksBatch));
booksRouter.get('/count', asyncHandler(booksController.getBooksCount));
booksRouter.get('/:id', asyncHandler(booksController.getBookById));
booksRouter.put('/:id', requireAuth, asyncHandler(booksController.putBook));
booksRouter.post(
  '/:id/cover/presigned-url',
  requireAuth,
  asyncHandler(booksController.postBookCoverUploadUrl),
);
booksRouter.post(
  '/:id/pdf/presigned-url',
  requireAuth,
  asyncHandler(booksController.postBookPdfUploadUrl),
);
booksRouter.delete('/:id', requireAuth, asyncHandler(booksController.deleteBookById));

export default booksRouter;
