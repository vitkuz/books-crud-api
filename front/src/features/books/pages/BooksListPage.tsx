import { Link } from 'react-router-dom';
import { Button } from '@/shared/ui/Button';
import { S3Image } from '@/shared/ui/S3Image';
import { useOpenModalLink } from '@/app/modals/modalUrlSync';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useBooks } from '../queries/books.queries';
import { BookResponse } from '@/shared/types/api.types';

export const BooksListPage = (): JSX.Element => {
  const { state } = useAuth();
  const openModal = useOpenModalLink();
  const booksQuery = useBooks();

  const isAuthed: boolean = state.status === 'authed';

  return (
    <>
      <div className="page__heading">
        <div>
          <h1 className="page__title">Books</h1>
          <div className="page__sub">Browse and manage the library.</div>
        </div>
        {isAuthed && (
          <Button variant="primary" onClick={(): void => openModal('books.form')}>
            New book
          </Button>
        )}
      </div>

      {booksQuery.isLoading && <div className="empty">Loading…</div>}
      {booksQuery.isError && (
        <div className="empty">Failed to load books. Try refreshing.</div>
      )}

      {booksQuery.data && booksQuery.data.length === 0 && (
        <div className="empty">
          No books yet. {isAuthed ? 'Click "New book" to add one.' : 'Sign in to add one.'}
        </div>
      )}

      {booksQuery.data && booksQuery.data.length > 0 && (
        <table className="list">
          <thead>
            <tr>
              {isAuthed && <th style={{ width: 56 }}></th>}
              <th>Title</th>
              <th>Author</th>
              <th>Year</th>
              <th>Categories</th>
              {isAuthed && <th></th>}
            </tr>
          </thead>
          <tbody>
            {booksQuery.data.map((b: BookResponse) => (
              <tr key={b.id}>
                {isAuthed && (
                  <td style={{ width: 56 }}>
                    <S3Image s3Key={b.coverKey} alt="" width={40} height={56} />
                  </td>
                )}
                <td>
                  <Link to={`/books/${b.id}`}>{b.title}</Link>
                </td>
                <td>{b.author.name}</td>
                <td>{b.year}</td>
                <td>
                  {b.categories.map((c) => (
                    <span key={c.id} className="tag">
                      {c.name}
                    </span>
                  ))}
                </td>
                {isAuthed && (
                  <td>
                    <div className="list__actions">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(): void => openModal('books.form', { id: b.id })}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(): void => openModal('books.delete', { id: b.id })}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
};
