import { Link, useParams } from 'react-router-dom';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { S3Image } from '@/shared/ui/S3Image';
import { useOpenModalLink } from '@/app/modals/modalUrlSync';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { BooksByFilter } from '@/features/books/components/BooksByFilter';
import { Author } from '@/shared/types/api.types';
import { useAuthor } from '../queries/authors.queries';

export const AuthorDetailPage = (): JSX.Element => {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { state } = useAuth();
  const openModal = useOpenModalLink();
  const authorQuery = useAuthor(id);

  const isAuthed = state.status === 'authed';

  if (authorQuery.isLoading) return <div className="empty">Loading…</div>;
  if (authorQuery.isError || !authorQuery.data)
    return <div className="empty">Author not found.</div>;

  const a: Author = authorQuery.data;

  return (
    <>
      <div className="page__heading">
        <div>
          <h1 className="page__title">{a.name}</h1>
          <div className="page__sub">
            <Link to="/authors">← back to authors</Link>
          </div>
        </div>
        {isAuthed && id !== undefined && (
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" onClick={(): void => openModal('authors.form', { id })}>
              Edit
            </Button>
            <Button variant="ghost" onClick={(): void => openModal('authors.delete', { id })}>
              Delete
            </Button>
          </div>
        )}
      </div>

      <Card>
        {isAuthed && a.portraitKey && (
          <div style={{ marginBottom: 16 }}>
            <S3Image s3Key={a.portraitKey} alt={`Portrait of ${a.name}`} width={200} height={200} />
          </div>
        )}
        <dl
          style={{
            display: 'grid',
            gridTemplateColumns: '120px 1fr',
            rowGap: 12,
            margin: 0,
          }}
        >
          <dt style={{ color: 'var(--color-muted)' }}>Created</dt>
          <dd style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-sm)' }}>
            {new Date(a.createdAt).toLocaleString()}
          </dd>

          <dt style={{ color: 'var(--color-muted)' }}>Updated</dt>
          <dd style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-sm)' }}>
            {new Date(a.updatedAt).toLocaleString()}
          </dd>
        </dl>
      </Card>

      {id !== undefined && (
        <div style={{ marginTop: 16 }}>
          <BooksByFilter
            title="Books by this author"
            filters={{ authorIds: [id] }}
            emptyMessage="No books by this author yet."
          />
        </div>
      )}
    </>
  );
};
