import { findAuthorById } from '../authors/authors.store';
import { Author } from '../authors/authors.types';
import { findCategoryById } from '../categories/categories.store';
import { Category } from '../categories/categories.types';
import { findTagById } from '../tags/tags.store';
import { Tag } from '../tags/tags.types';
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
  const tags: Tag[] = book.tagIds.map((tagId: string): Tag => {
    const tag: Tag | undefined = findTagById(tagId);
    if (!tag) {
      throw new Error(`Data inconsistency: book ${book.id} references missing tag ${tagId}`);
    }
    return tag;
  });
  return {
    id: book.id,
    title: book.title,
    author,
    categories,
    tags,
    year: book.year,
    createdAt: book.createdAt,
    updatedAt: book.updatedAt,
  };
};

export const dedupeCategoryIds = (ids: string[]): string[] => Array.from(new Set(ids));

export const findMissingCategoryIds = (ids: string[]): string[] =>
  ids.filter((id: string): boolean => !findCategoryById(id));

export const dedupeTagIds = (ids: string[]): string[] => Array.from(new Set(ids));

export const findMissingTagIds = (ids: string[]): string[] =>
  ids.filter((id: string): boolean => !findTagById(id));
