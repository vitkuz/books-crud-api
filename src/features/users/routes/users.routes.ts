import { Router } from 'express';
import * as usersController from '../controllers';

const usersRouter: Router = Router();

usersRouter.get('/', usersController.getUsers);
usersRouter.post('/', usersController.postUser);
usersRouter.get('/:id', usersController.getUserById);
usersRouter.put('/:id', usersController.putUser);
usersRouter.delete('/:id', usersController.deleteUserById);

export default usersRouter;
