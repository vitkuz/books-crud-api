import { Button } from '@/shared/ui/Button';
import { S3Image } from '@/shared/ui/S3Image';
import { useOpenModalLink } from '@/app/modals/modalUrlSync';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useAuthors } from '../queries/authors.queries';
import { Author } from '@/shared/types/api.types';

export const AuthorsListPage = (): JSX.Element => {
  const { state } = useAuth();
  const openModal = useOpenModalLink();
  const authorsQuery = useAuthors();
  const isAuthed: boolean = state.status === 'authed';

  return (
    <>
      <div className="page__heading">
        <div>
          <h1 className="page__title">Authors</h1>
          <div className="page__sub">People behind the books.</div>
        </div>
        {isAuthed && (
          <Button variant="primary" onClick={(): void => openModal('authors.form')}>
            New author
          </Button>
        )}
      </div>

      {authorsQuery.isLoading && <div className="empty">Loading…</div>}
      {authorsQuery.isError && <div className="empty">Failed to load authors.</div>}

      {authorsQuery.data && authorsQuery.data.length === 0 && (
        <div className="empty">
          No authors yet. {isAuthed ? 'Click "New author" to add one.' : ''}
        </div>
      )}

      {authorsQuery.data && authorsQuery.data.length > 0 && (
        <table className="list">
          <thead>
            <tr>
              {isAuthed && <th style={{ width: 56 }}></th>}
              <th>Name</th>
              <th>Created</th>
              {isAuthed && <th></th>}
            </tr>
          </thead>
          <tbody>
            {authorsQuery.data.map((a: Author) => (
              <tr key={a.id}>
                {isAuthed && (
                  <td style={{ width: 56 }}>
                    <S3Image s3Key={a.portraitKey} alt="" width={40} height={40} />
                  </td>
                )}
                <td>{a.name}</td>
                <td className="mono" style={{ color: 'var(--color-muted)' }}>
                  {new Date(a.metadata.createdAt).toLocaleDateString()}
                </td>
                {isAuthed && (
                  <td>
                    <div className="list__actions">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(): void => openModal('authors.form', { id: a.id })}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(): void => openModal('authors.delete', { id: a.id })}
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
