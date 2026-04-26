import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { useCategory } from '../queries/categories.queries';
import { useCreateCategory, useUpdateCategory } from '../mutations/categories.mutations';
import { categorySchema, CategoryFormValues } from '../forms/category.schema';

export const CategoryFormModal = ({
  id,
  onClose,
}: {
  id?: string;
  onClose: () => void;
}): JSX.Element => {
  const isEdit: boolean = id !== undefined;
  const categoryQuery = useCategory(id);
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '' },
  });

  useEffect((): void => {
    if (isEdit && categoryQuery.data) {
      form.reset({ name: categoryQuery.data.name });
    }
  }, [categoryQuery.data, isEdit, form]);

  const submitting: boolean = createCategory.isPending || updateCategory.isPending;

  const onSubmit = form.handleSubmit((values: CategoryFormValues): void => {
    if (isEdit && id !== undefined) {
      updateCategory.mutate(
        { id, input: { name: values.name } },
        { onSuccess: (): void => onClose() },
      );
    } else {
      createCategory.mutate({ name: values.name }, { onSuccess: (): void => onClose() });
    }
  });

  return (
    <Modal
      title={isEdit ? 'Edit category' : 'New category'}
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
      {isEdit && categoryQuery.isLoading ? (
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
