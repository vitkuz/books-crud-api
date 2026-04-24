import { Router } from 'express';
import * as authController from '../controllers';

const initRouter: Router = Router();

initRouter.post('/', authController.postInit);

export default initRouter;
