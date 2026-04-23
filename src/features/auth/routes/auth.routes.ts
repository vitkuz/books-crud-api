import { Router } from 'express';
import * as authController from '../controllers';

const authRouter: Router = Router();

authRouter.post('/register', authController.postRegister);
authRouter.post('/login', authController.postLogin);
authRouter.post('/logout', authController.postLogout);
authRouter.get('/me', authController.getMe);

export default authRouter;
