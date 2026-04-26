import { Router } from 'express';
import { requireAuth } from '../../../shared/middleware/require-auth';
import { asyncHandler } from '../../../shared/utils/async-handler';
import * as usersController from '../controllers';

const usersRouter: Router = Router();

usersRouter.get('/', asyncHandler(usersController.getUsers));
usersRouter.post('/', requireAuth, asyncHandler(usersController.postUser));
usersRouter.get('/:id', asyncHandler(usersController.getUserById));
usersRouter.put('/:id', requireAuth, asyncHandler(usersController.putUser));
usersRouter.delete('/:id', requireAuth, asyncHandler(usersController.deleteUserById));

export default usersRouter;
