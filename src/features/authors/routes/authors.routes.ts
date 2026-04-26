import { Router } from 'express';
import { requireAuth } from '../../../shared/middleware/require-auth';
import { asyncHandler } from '../../../shared/utils/async-handler';
import * as authorsController from '../controllers';

const authorsRouter: Router = Router();

authorsRouter.get('/', asyncHandler(authorsController.getAuthors));
authorsRouter.post('/', requireAuth, asyncHandler(authorsController.postAuthor));
authorsRouter.post('/batch', requireAuth, asyncHandler(authorsController.postAuthorsBatch));
authorsRouter.get('/:id', asyncHandler(authorsController.getAuthorById));
authorsRouter.put('/:id', requireAuth, asyncHandler(authorsController.putAuthor));
authorsRouter.post(
  '/:id/portrait/presigned-url',
  requireAuth,
  asyncHandler(authorsController.postAuthorPortraitUploadUrl),
);
authorsRouter.delete('/:id', requireAuth, asyncHandler(authorsController.deleteAuthorById));

export default authorsRouter;
