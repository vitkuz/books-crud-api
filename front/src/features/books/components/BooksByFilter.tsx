import { Link } from 'react-router-dom';
import { UseQueryResult } from '@tanstack/react-query';
import { Card } from '@/shared/ui/Card';
import { BookResponse } from '@/shared/types/api.types';
import { BooksFilter } from '../api/books.api';
import { useBooks } from '../queries/books.queries';

type BooksByFilterProps = {
  title: string;
  filters: BooksFilter;
  emptyMessage: string;
};

export const BooksByFilter = ({
  title,
  filters,
  emptyMessage,
}: BooksByFilterProps): JSX.Element => {
  const booksQuery: UseQueryResult<BookResponse[]> = useBooks(filters);

  return (
    <Card>
      <h2 style={{ margin: '0 0 12px', fontSize: 'var(--fs-md)' }}>{title}</h2>
      {booksQuery.isLoading && <div style={{ color: 'var(--color-muted)' }}>Loading…</div>}
      {booksQuery.isError && (
        <div style={{ color: 'var(--color-muted)' }}>Failed to load books.</div>
      )}
      {booksQuery.data && booksQuery.data.length === 0 && (
        <div style={{ color: 'var(--color-muted)' }}>{emptyMessage}</div>
      )}
      {booksQuery.data && booksQuery.data.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {booksQuery.data.map((b: BookResponse) => (
            <li key={b.id}>
              <Link to={`/books/${b.id}`}>{b.title}</Link>
              <span style={{ color: 'var(--color-muted)', marginLeft: 8 }}>({b.year})</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};
