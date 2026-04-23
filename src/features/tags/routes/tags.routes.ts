import { Router } from 'express';
import * as tagsController from '../controllers';

const tagsRouter: Router = Router();

tagsRouter.get('/', tagsController.getTags);
tagsRouter.post('/', tagsController.postTag);
tagsRouter.post('/batch', tagsController.postTagsBatch);
tagsRouter.get('/:id', tagsController.getTagById);
tagsRouter.put('/:id', tagsController.putTag);
tagsRouter.delete('/:id', tagsController.deleteTagById);

export default tagsRouter;
