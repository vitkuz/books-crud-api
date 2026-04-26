import { Router } from 'express';
import { asyncHandler } from '../../../shared/utils/async-handler';
import * as categoriesController from '../controllers';

const categoriesRouter: Router = Router();

categoriesRouter.get('/', asyncHandler(categoriesController.getCategories));
categoriesRouter.post('/', asyncHandler(categoriesController.postCategory));
categoriesRouter.post('/batch', asyncHandler(categoriesController.postCategoriesBatch));
categoriesRouter.get('/:id', asyncHandler(categoriesController.getCategoryById));
categoriesRouter.put('/:id', asyncHandler(categoriesController.putCategory));
categoriesRouter.delete('/:id', asyncHandler(categoriesController.deleteCategoryById));

export default categoriesRouter;
