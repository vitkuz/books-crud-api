import { Router } from 'express';
import * as authorsController from '../controllers';

const authorsRouter: Router = Router();

authorsRouter.get('/', authorsController.getAuthors);
authorsRouter.post('/', authorsController.postAuthor);
authorsRouter.get('/:id', authorsController.getAuthorById);
authorsRouter.put('/:id', authorsController.putAuthor);
authorsRouter.delete('/:id', authorsController.deleteAuthorById);

export default authorsRouter;
