import { authorsService } from '../services/authors.service';
import { categoriesService } from '../services/categories.service';
import { Author } from '../types/author.types';
import { Book, BookResponse } from '../types/book.types';
import { Category } from '../types/category.types';

export const toBookResponse = async (book: Book): Promise<BookResponse> => {
  const author: Author | undefined = await authorsService.findById(book.authorId);
  if (!author) {
    throw new Error(
      `Data inconsistency: book ${book.id} references missing author ${book.authorId}`,
    );
  }
  const fetched: Category[] = await categoriesService.findManyByIds(book.categoryIds);
  if (fetched.length !== book.categoryIds.length) {
    const fetchedIds: Set<string> = new Set(fetched.map((c: Category): string => c.id));
    const missing: string[] = book.categoryIds.filter(
      (id: string): boolean => !fetchedIds.has(id),
    );
    throw new Error(
      `Data inconsistency: book ${book.id} references missing categories ${missing.join(', ')}`,
    );
  }
  const byId: Map<string, Category> = new Map(
    fetched.map((c: Category): [string, Category] => [c.id, c]),
  );
  const categories: Category[] = book.categoryIds.map((id: string): Category => {
    const c: Category | undefined = byId.get(id);
    if (!c) throw new Error(`unreachable: missing category ${id}`);
    return c;
  });
  return {
    id: book.id,
    title: book.title,
    author,
    categories,
    year: book.year,
    pdfKey: book.pdfKey,
    coverKey: book.coverKey,
    createdAt: book.createdAt,
    updatedAt: book.updatedAt,
    metadata: book.metadata,
  };
};
