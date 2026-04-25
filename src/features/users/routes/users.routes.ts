import { Router } from 'express';
import { requireAuth } from '../../../shared/middleware/require-auth';
import * as usersController from '../controllers';

const usersRouter: Router = Router();

usersRouter.get('/', usersController.getUsers);
usersRouter.post('/', requireAuth, usersController.postUser);
usersRouter.get('/:id', usersController.getUserById);
usersRouter.put('/:id', requireAuth, usersController.putUser);
usersRouter.delete('/:id', requireAuth, usersController.deleteUserById);

export default usersRouter;
