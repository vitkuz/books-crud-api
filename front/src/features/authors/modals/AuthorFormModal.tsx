import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { useAuthor } from '../queries/authors.queries';
import { useCreateAuthor, useUpdateAuthor } from '../mutations/authors.mutations';
import { authorSchema, AuthorFormValues } from '../forms/author.schema';

export const AuthorFormModal = ({
  id,
  onClose,
}: {
  id?: string;
  onClose: () => void;
}): JSX.Element => {
  const isEdit: boolean = id !== undefined;
  const authorQuery = useAuthor(id);
  const createAuthor = useCreateAuthor();
  const updateAuthor = useUpdateAuthor();

  const form = useForm<AuthorFormValues>({
    resolver: zodResolver(authorSchema),
    defaultValues: { name: '' },
  });

  useEffect((): void => {
    if (isEdit && authorQuery.data) {
      form.reset({ name: authorQuery.data.name });
    }
  }, [authorQuery.data, isEdit, form]);

  const submitting: boolean = createAuthor.isPending || updateAuthor.isPending;

  const onSubmit = form.handleSubmit((values: AuthorFormValues): void => {
    if (isEdit && id !== undefined) {
      updateAuthor.mutate(
        { id, input: { name: values.name } },
        { onSuccess: (): void => onClose() },
      );
    } else {
      createAuthor.mutate({ name: values.name }, { onSuccess: (): void => onClose() });
    }
  });

  return (
    <Modal
      title={isEdit ? 'Edit author' : 'New author'}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={(): void => void onSubmit()} disabled={submitting}>
            {submitting ? 'Saving…' : isEdit ? 'Save' : 'Create'}
          </Button>
        </>
      }
    >
      {isEdit && authorQuery.isLoading ? (
        <div>Loading…</div>
      ) : (
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            label="Name"
            error={form.formState.errors.name?.message}
            {...form.register('name')}
          />
        </form>
      )}
    </Modal>
  );
};
