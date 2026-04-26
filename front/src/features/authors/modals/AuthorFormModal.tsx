import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/shared/ui/Button';
import { FileUploadField } from '@/shared/ui/FileUploadField';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { useAuthor } from '../queries/authors.queries';
import { useCreateAuthor, useUpdateAuthor } from '../mutations/authors.mutations';
import { authorSchema, AuthorFormValues } from '../forms/author.schema';

const IMAGE_MIMES = ['image/png', 'image/jpeg', 'image/webp'] as const;

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
    defaultValues: { name: '', portraitKey: undefined },
  });

  useEffect((): void => {
    if (isEdit && authorQuery.data) {
      form.reset({
        name: authorQuery.data.name,
        portraitKey: authorQuery.data.portraitKey,
      });
    }
  }, [authorQuery.data, isEdit, form]);

  const submitting: boolean = createAuthor.isPending || updateAuthor.isPending;

  const onSubmit = form.handleSubmit((values: AuthorFormValues): void => {
    if (isEdit && id !== undefined) {
      updateAuthor.mutate(
        { id, input: values },
        { onSuccess: (): void => onClose() },
      );
    } else {
      createAuthor.mutate(values, { onSuccess: (): void => onClose() });
    }
  });

  const portraitKey: string | undefined = form.watch('portraitKey');

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
          <div
            style={{
              paddingTop: 16,
              borderTop: '1px solid var(--color-border)',
            }}
          >
            <FileUploadField
              label="Portrait"
              accept="image/png,image/jpeg,image/webp"
              allowedMimes={IMAGE_MIMES}
              currentKey={portraitKey}
              mode="image"
              onUploaded={(key): void => {
                form.setValue('portraitKey', key, { shouldDirty: true });
              }}
            />
          </div>
        </form>
      )}
    </Modal>
  );
};
