import { authorsService, CreateAuthorInput } from '../services/authors.service';
import { Author } from '../types/author.types';
import logger from '../utils/logger';

export const createAuthorUseCase = async (input: CreateAuthorInput): Promise<Author> => {
  logger.debug('create-author.usecase start', { name: input.name });
  const author: Author = await authorsService.create(input);
  logger.debug('create-author.usecase success', { id: author.id });
  return author;
};
