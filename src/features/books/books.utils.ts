import { findAuthorById } from '../authors/authors.store';
import { Author } from '../authors/authors.types';
import { findCategoryById } from '../categories/categories.store';
import { Category } from '../categories/categories.types';
import { Book, BookResponse } from './books.types';

export const toBookResponse = (book: Book): BookResponse => {
  const author: Author | undefined = findAuthorById(book.authorId);
  if (!author) {
    throw new Error(
      `Data inconsistency: book ${book.id} references missing author ${book.authorId}`,
    );
  }
  const categories: Category[] = book.categoryIds.map((categoryId: string): Category => {
    const category: Category | undefined = findCategoryById(categoryId);
    if (!category) {
      throw new Error(
        `Data inconsistency: book ${book.id} references missing category ${categoryId}`,
      );
    }
    return category;
  });
  return {
    id: book.id,
    title: book.title,
    author,
    categories,
    year: book.year,
    createdAt: book.createdAt,
    updatedAt: book.updatedAt,
  };
};

export const dedupeCategoryIds = (ids: string[]): string[] => Array.from(new Set(ids));

export const findMissingCategoryIds = (ids: string[]): string[] =>
  ids.filter((id: string): boolean => !findCategoryById(id));
