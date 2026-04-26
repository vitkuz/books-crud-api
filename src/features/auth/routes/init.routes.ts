import { Router } from 'express';
import { asyncHandler } from '../../../shared/utils/async-handler';
import * as authController from '../controllers';

const initRouter: Router = Router();

initRouter.post('/', asyncHandler(authController.postInit));

export default initRouter;
