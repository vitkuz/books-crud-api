import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import { useCategory } from '../queries/categories.queries';
import { useDeleteCategory } from '../mutations/categories.mutations';

export const CategoryDeleteModal = ({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}): JSX.Element => {
  const categoryQuery = useCategory(id);
  const deleteCategory = useDeleteCategory();

  const onConfirm = (): void => {
    deleteCategory.mutate(id, { onSuccess: (): void => onClose() });
  };

  return (
    <Modal
      title="Delete category"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={deleteCategory.isPending}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={deleteCategory.isPending}>
            {deleteCategory.isPending ? 'Deleting…' : 'Delete'}
          </Button>
        </>
      }
    >
      <p>
        Are you sure you want to delete{' '}
        <strong>{categoryQuery.data?.name ?? 'this category'}</strong>?
      </p>
      <p style={{ marginTop: 12, color: 'var(--color-muted)', fontSize: 'var(--fs-sm)' }}>
        Categories referenced by any book cannot be deleted.
      </p>
    </Modal>
  );
};
