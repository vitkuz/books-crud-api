import { findAuthorById } from '../authors/authors.store';
import { Author } from '../authors/authors.types';
import { Book, BookResponse } from './books.types';

export const toBookResponse = (book: Book): BookResponse => {
  const author: Author | undefined = findAuthorById(book.authorId);
  if (!author) {
    throw new Error(
      `Data inconsistency: book ${book.id} references missing author ${book.authorId}`,
    );
  }
  return {
    id: book.id,
    title: book.title,
    author,
    year: book.year,
    createdAt: book.createdAt,
    updatedAt: book.updatedAt,
  };
};
