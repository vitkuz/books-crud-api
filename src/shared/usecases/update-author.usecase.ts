import { authorsService, UpdateAuthorInput } from '../services/authors.service';
import { Author } from '../types/author.types';
import logger from '../utils/logger';

export const updateAuthorUseCase = async (
  id: string,
  patch: UpdateAuthorInput,
): Promise<Author | undefined> => {
  logger.debug('update-author.usecase start', { id });
  const updated: Author | undefined = await authorsService.update(id, patch);
  if (!updated) {
    logger.debug('update-author.usecase not-found', { id });
    return undefined;
  }
  logger.debug('update-author.usecase success', { id });
  return updated;
};
