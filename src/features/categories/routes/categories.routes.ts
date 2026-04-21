import { Router } from 'express';
import * as categoriesController from '../controllers';

const categoriesRouter: Router = Router();

categoriesRouter.get('/', categoriesController.getCategories);
categoriesRouter.post('/', categoriesController.postCategory);
categoriesRouter.get('/:id', categoriesController.getCategoryById);
categoriesRouter.put('/:id', categoriesController.putCategory);
categoriesRouter.delete('/:id', categoriesController.deleteCategoryById);

export default categoriesRouter;
