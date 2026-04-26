import { Button } from '@/shared/ui/Button';
import { useOpenModalLink } from '@/app/modals/modalUrlSync';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useCategories } from '../queries/categories.queries';
import { Category } from '@/shared/types/api.types';

export const CategoriesListPage = (): JSX.Element => {
  const { state } = useAuth();
  const openModal = useOpenModalLink();
  const categoriesQuery = useCategories();
  const isAuthed: boolean = state.status === 'authed';

  return (
    <>
      <div className="page__heading">
        <div>
          <h1 className="page__title">Categories</h1>
          <div className="page__sub">Group books by genre or subject.</div>
        </div>
        {isAuthed && (
          <Button variant="primary" onClick={(): void => openModal('categories.form')}>
            New category
          </Button>
        )}
      </div>

      {categoriesQuery.isLoading && <div className="empty">Loading…</div>}
      {categoriesQuery.isError && <div className="empty">Failed to load categories.</div>}

      {categoriesQuery.data && categoriesQuery.data.length === 0 && (
        <div className="empty">
          No categories yet. {isAuthed ? 'Click "New category" to add one.' : ''}
        </div>
      )}

      {categoriesQuery.data && categoriesQuery.data.length > 0 && (
        <table className="list">
          <thead>
            <tr>
              <th>Name</th>
              <th>Created</th>
              {isAuthed && <th></th>}
            </tr>
          </thead>
          <tbody>
            {categoriesQuery.data.map((c: Category) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td className="mono" style={{ color: 'var(--color-muted)' }}>
                  {new Date(c.metadata.createdAt).toLocaleDateString()}
                </td>
                {isAuthed && (
                  <td>
                    <div className="list__actions">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(): void => openModal('categories.form', { id: c.id })}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(): void => openModal('categories.delete', { id: c.id })}
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
