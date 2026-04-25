import { Router } from 'express';
import { requireAuth } from '../../../shared/middleware/require-auth';
import * as authController from '../controllers';

const authRouter: Router = Router();

authRouter.post('/register', authController.postRegister);
authRouter.post('/login', authController.postLogin);
authRouter.post('/logout', requireAuth, authController.postLogout);
authRouter.get('/me', requireAuth, authController.getMe);

export default authRouter;
