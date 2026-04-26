import { Router } from 'express';
import { requireAuth } from '../../../shared/middleware/require-auth';
import { asyncHandler } from '../../../shared/utils/async-handler';
import * as authController from '../controllers';

const authRouter: Router = Router();

authRouter.post('/register', asyncHandler(authController.postRegister));
authRouter.post('/login', asyncHandler(authController.postLogin));
authRouter.post('/logout', requireAuth, asyncHandler(authController.postLogout));
authRouter.get('/me', requireAuth, asyncHandler(authController.getMe));

export default authRouter;
