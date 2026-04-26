import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import { useAuthor } from '../queries/authors.queries';
import { useDeleteAuthor } from '../mutations/authors.mutations';

export const AuthorDeleteModal = ({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}): JSX.Element => {
  const authorQuery = useAuthor(id);
  const deleteAuthor = useDeleteAuthor();

  const onConfirm = (): void => {
    deleteAuthor.mutate(id, { onSuccess: (): void => onClose() });
  };

  return (
    <Modal
      title="Delete author"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={deleteAuthor.isPending}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={deleteAuthor.isPending}>
            {deleteAuthor.isPending ? 'Deleting…' : 'Delete'}
          </Button>
        </>
      }
    >
      <p>
        Are you sure you want to delete{' '}
        <strong>{authorQuery.data?.name ?? 'this author'}</strong>?
      </p>
      <p style={{ marginTop: 12, color: 'var(--color-muted)', fontSize: 'var(--fs-sm)' }}>
        Authors that are referenced by any book cannot be deleted — the API will return 409.
      </p>
    </Modal>
  );
};
