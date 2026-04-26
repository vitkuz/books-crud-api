import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import { useBook } from '../queries/books.queries';
import { useDeleteBook } from '../mutations/books.mutations';

export const BookDeleteModal = ({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}): JSX.Element => {
  const bookQuery = useBook(id);
  const deleteBook = useDeleteBook();

  const onConfirm = (): void => {
    deleteBook.mutate(id, { onSuccess: (): void => onClose() });
  };

  return (
    <Modal
      title="Delete book"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={deleteBook.isPending}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={deleteBook.isPending}>
            {deleteBook.isPending ? 'Deleting…' : 'Delete'}
          </Button>
        </>
      }
    >
      <p>
        Are you sure you want to delete{' '}
        <strong>{bookQuery.data?.title ?? 'this book'}</strong>?
      </p>
    </Modal>
  );
};
