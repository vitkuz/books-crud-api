import { Router } from 'express';
import { requireAuth } from '../../../shared/middleware/require-auth';
import * as booksController from '../controllers';

const booksRouter: Router = Router();

booksRouter.get('/', booksController.getBooks);
booksRouter.post('/', requireAuth, booksController.postBook);
booksRouter.post('/batch', requireAuth, booksController.postBooksBatch);
booksRouter.get('/count', booksController.getBooksCount);
booksRouter.get('/:id', booksController.getBookById);
booksRouter.put('/:id', requireAuth, booksController.putBook);
booksRouter.delete('/:id', requireAuth, booksController.deleteBookById);

export default booksRouter;
