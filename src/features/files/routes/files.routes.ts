import { Router } from 'express';
import { requireAuth } from '../../../shared/middleware/require-auth';
import { asyncHandler } from '../../../shared/utils/async-handler';
import * as filesController from '../controllers';

const filesRouter: Router = Router();

filesRouter.post('/presigned-url', requireAuth, asyncHandler(filesController.postPresignedUrl));

export default filesRouter;
