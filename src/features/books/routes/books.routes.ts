import { Router } from 'express';
import * as booksController from '../controllers';

const booksRouter: Router = Router();

booksRouter.get('/', booksController.getBooks);
booksRouter.post('/', booksController.postBook);
booksRouter.post('/batch', booksController.postBooksBatch);
booksRouter.get('/:id', booksController.getBookById);
booksRouter.put('/:id', booksController.putBook);
booksRouter.delete('/:id', booksController.deleteBookById);

export default booksRouter;
