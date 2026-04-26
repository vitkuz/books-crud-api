import { Link, useParams } from 'react-router-dom';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { useOpenModalLink } from '@/app/modals/modalUrlSync';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Category } from '@/shared/types/api.types';
import { useCategory } from '../queries/categories.queries';

export const CategoryDetailPage = (): JSX.Element => {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { state } = useAuth();
  const openModal = useOpenModalLink();
  const categoryQuery = useCategory(id);

  const isAuthed = state.status === 'authed';

  if (categoryQuery.isLoading) return <div className="empty">Loading…</div>;
  if (categoryQuery.isError || !categoryQuery.data)
    return <div className="empty">Category not found.</div>;

  const c: Category = categoryQuery.data;

  return (
    <>
      <div className="page__heading">
        <div>
          <h1 className="page__title">{c.name}</h1>
          <div className="page__sub">
            <Link to="/categories">← back to categories</Link>
          </div>
        </div>
        {isAuthed && id !== undefined && (
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" onClick={(): void => openModal('categories.form', { id })}>
              Edit
            </Button>
            <Button variant="ghost" onClick={(): void => openModal('categories.delete', { id })}>
              Delete
            </Button>
          </div>
        )}
      </div>

      <Card>
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
            {new Date(c.createdAt).toLocaleString()}
          </dd>

          <dt style={{ color: 'var(--color-muted)' }}>Updated</dt>
          <dd style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-sm)' }}>
            {new Date(c.updatedAt).toLocaleString()}
          </dd>
        </dl>
      </Card>
    </>
  );
};
