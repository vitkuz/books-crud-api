import { Link, useParams } from 'react-router-dom';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { S3Image } from '@/shared/ui/S3Image';
import { useOpenModalLink } from '@/app/modals/modalUrlSync';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { usePresignedReadUrl } from '@/features/files/queries/files.queries';
import { useBook } from '../queries/books.queries';

export const BookDetailPage = (): JSX.Element => {
  const params = useParams<{ id: string }>();
  const id: string | undefined = params.id;
  const { state } = useAuth();
  const openModal = useOpenModalLink();
  const bookQuery = useBook(id);

  const isAuthed: boolean = state.status === 'authed';

  const pdfReadUrl = usePresignedReadUrl(bookQuery.data?.pdfKey);

  if (bookQuery.isLoading) return <div className="empty">Loading…</div>;
  if (bookQuery.isError || !bookQuery.data)
    return <div className="empty">Book not found.</div>;

  const b = bookQuery.data;

  return (
    <>
      <div className="page__heading">
        <div>
          <h1 className="page__title">{b.title}</h1>
          <div className="page__sub">
            <Link to="/books">← back to books</Link>
          </div>
        </div>
        {isAuthed && id !== undefined && (
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" onClick={(): void => openModal('books.form', { id })}>
              Edit
            </Button>
            <Button variant="ghost" onClick={(): void => openModal('books.delete', { id })}>
              Delete
            </Button>
          </div>
        )}
      </div>

      <Card>
        {isAuthed && b.coverKey && (
          <div style={{ marginBottom: 16 }}>
            <S3Image s3Key={b.coverKey} alt={`Cover of ${b.title}`} width={200} height={280} />
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
          <dt style={{ color: 'var(--color-muted)' }}>Author</dt>
          <dd style={{ margin: 0 }}>{b.author.name}</dd>

          <dt style={{ color: 'var(--color-muted)' }}>Year</dt>
          <dd style={{ margin: 0 }}>{b.year}</dd>

          <dt style={{ color: 'var(--color-muted)' }}>Categories</dt>
          <dd style={{ margin: 0 }}>
            {b.categories.length === 0 ? (
              <span style={{ color: 'var(--color-muted)' }}>—</span>
            ) : (
              b.categories.map((c) => (
                <span key={c.id} className="tag">
                  {c.name}
                </span>
              ))
            )}
          </dd>

          <dt style={{ color: 'var(--color-muted)' }}>Created</dt>
          <dd style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-sm)' }}>
            {new Date(b.metadata.createdAt).toLocaleString()}
          </dd>

          <dt style={{ color: 'var(--color-muted)' }}>Updated</dt>
          <dd style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-sm)' }}>
            {new Date(b.metadata.updatedAt).toLocaleString()}
          </dd>

          {isAuthed && b.pdfKey && (
            <>
              <dt style={{ color: 'var(--color-muted)' }}>PDF</dt>
              <dd style={{ margin: 0 }}>
                {pdfReadUrl.data ? (
                  <a href={pdfReadUrl.data.url} target="_blank" rel="noreferrer">
                    Open / download
                  </a>
                ) : pdfReadUrl.isLoading ? (
                  <span style={{ color: 'var(--color-muted)' }}>Loading link…</span>
                ) : (
                  <span style={{ color: 'var(--color-muted)' }}>—</span>
                )}
              </dd>
            </>
          )}
        </dl>
      </Card>
    </>
  );
};
