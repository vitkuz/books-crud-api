import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/shared/ui/Button';
import { FileUploadField } from '@/shared/ui/FileUploadField';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { useAuthors } from '@/features/authors/queries/authors.queries';
import { useCategories } from '@/features/categories/queries/categories.queries';
import { ImageContentType } from '@/shared/types/api.types';
import { useBook } from '../queries/books.queries';
import { useCreateBook, useUpdateBook } from '../mutations/books.mutations';
import { useUploadBookCover, useUploadBookPdf } from '../mutations/bookUploads.mutations';
import { bookSchema, BookFormValues } from '../forms/book.schema';

export const BookFormModal = ({
  id,
  onClose,
}: {
  id?: string;
  onClose: () => void;
}): JSX.Element => {
  const isEdit: boolean = id !== undefined;
  const bookQuery = useBook(id);
  const authorsQuery = useAuthors();
  const categoriesQuery = useCategories();
  const createBook = useCreateBook();
  const updateBook = useUpdateBook();
  const uploadCover = useUploadBookCover();
  const uploadPdf = useUploadBookPdf();

  const form = useForm<BookFormValues>({
    resolver: zodResolver(bookSchema),
    defaultValues: {
      title: '',
      authorId: '',
      categoryIds: [],
      year: new Date().getFullYear(),
    },
  });

  useEffect((): void => {
    if (isEdit && bookQuery.data) {
      form.reset({
        title: bookQuery.data.title,
        authorId: bookQuery.data.author.id,
        categoryIds: bookQuery.data.categories.map((c): string => c.id),
        year: bookQuery.data.year,
      });
    }
  }, [bookQuery.data, isEdit, form]);

  const submitting: boolean = createBook.isPending || updateBook.isPending;

  const onSubmit = form.handleSubmit((values: BookFormValues): void => {
    if (isEdit && id !== undefined) {
      updateBook.mutate(
        { id, input: values },
        { onSuccess: (): void => onClose() },
      );
    } else {
      createBook.mutate(values, { onSuccess: (): void => onClose() });
    }
  });

  const isLoadingDetail: boolean = isEdit && bookQuery.isLoading;
  const isLoadingDeps: boolean =
    authorsQuery.isLoading || categoriesQuery.isLoading;

  return (
    <Modal
      title={isEdit ? 'Edit book' : 'New book'}
      onClose={onClose}
      width={560}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={(): void => void onSubmit()}
            disabled={submitting || isLoadingDetail || isLoadingDeps}
          >
            {submitting ? 'Saving…' : isEdit ? 'Save' : 'Create'}
          </Button>
        </>
      }
    >
      {isLoadingDetail || isLoadingDeps ? (
        <div>Loading…</div>
      ) : (
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            label="Title"
            error={form.formState.errors.title?.message}
            {...form.register('title')}
          />

          <label className="field">
            <span className="field__label">Author</span>
            <select className="field__select" {...form.register('authorId')}>
              <option value="">— select an author —</option>
              {(authorsQuery.data ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            {form.formState.errors.authorId && (
              <span className="field__error">{form.formState.errors.authorId.message}</span>
            )}
          </label>

          <Input
            label="Year"
            type="number"
            error={form.formState.errors.year?.message}
            {...form.register('year')}
          />

          <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend className="field__label" style={{ marginBottom: 8 }}>
              Categories
            </legend>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: 8,
              }}
            >
              {(categoriesQuery.data ?? []).map((c) => (
                <label
                  key={c.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 8px',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius)',
                    fontSize: 'var(--fs-sm)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    value={c.id}
                    {...form.register('categoryIds')}
                  />
                  {c.name}
                </label>
              ))}
            </div>
            {(categoriesQuery.data ?? []).length === 0 && (
              <p
                style={{
                  fontSize: 'var(--fs-sm)',
                  color: 'var(--color-muted)',
                  marginTop: 8,
                }}
              >
                No categories yet. Create one from the Categories page first.
              </p>
            )}
          </fieldset>

          {isEdit && id !== undefined && bookQuery.data && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                paddingTop: 16,
                borderTop: '1px solid var(--color-border)',
              }}
            >
              <FileUploadField
                label="Cover image"
                accept="image/png,image/jpeg,image/webp"
                currentKey={bookQuery.data.coverKey}
                mode="image"
                isUploading={uploadCover.isPending}
                onUpload={(file, contentType): void => {
                  uploadCover.mutate({
                    bookId: id,
                    file,
                    contentType: contentType as ImageContentType,
                  });
                }}
              />
              <FileUploadField
                label="PDF"
                accept="application/pdf"
                currentKey={bookQuery.data.pdfKey}
                mode="pdf"
                isUploading={uploadPdf.isPending}
                onUpload={(file): void => {
                  uploadPdf.mutate({ bookId: id, file });
                }}
              />
            </div>
          )}
        </form>
      )}
    </Modal>
  );
};
