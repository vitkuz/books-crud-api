import { findAllBooks } from '../books.store';

export const countBooks = (): number => findAllBooks().length;
