import { Router } from 'express';
import { requireAuth } from '../../../shared/middleware/require-auth';
import * as authorsController from '../controllers';

const authorsRouter: Router = Router();

authorsRouter.get('/', authorsController.getAuthors);
authorsRouter.post('/', requireAuth, authorsController.postAuthor);
authorsRouter.post('/batch', requireAuth, authorsController.postAuthorsBatch);
authorsRouter.get('/:id', authorsController.getAuthorById);
authorsRouter.put('/:id', requireAuth, authorsController.putAuthor);
authorsRouter.delete('/:id', requireAuth, authorsController.deleteAuthorById);

export default authorsRouter;
