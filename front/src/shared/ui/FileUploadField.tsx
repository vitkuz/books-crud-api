import { ChangeEvent, useState } from 'react';
import { Button } from './Button';
import { S3Image } from './S3Image';
import { useFileUpload } from '@/features/files/mutations/files.mutations';
import { usePresignedReadUrl } from '@/features/files/queries/files.queries';

type FileUploadFieldProps = {
  label: string;
  /** Accept attribute for the <input>, e.g. "image/png,image/jpeg,image/webp" or "application/pdf". */
  accept: string;
  /** Persisted S3 key for the current file (preview/download). */
  currentKey: string | undefined;
  /** 'image' renders an inline preview; 'pdf' renders a download link. */
  mode: 'image' | 'pdf';
  /** Allowed MIME types — guards the picker before bytes leave the browser. */
  allowedMimes: readonly string[];
  /** Fired after the upload to S3 succeeds, with the key the parent should persist. */
  onUploaded: (key: string) => void;
};

export const FileUploadField = ({
  label,
  accept,
  currentKey,
  mode,
  allowedMimes,
  onUploaded,
}: FileUploadFieldProps): JSX.Element => {
  const [picked, setPicked] = useState<File | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const upload = useFileUpload();
  const pdfReadUrl = usePresignedReadUrl(mode === 'pdf' ? currentKey : undefined);

  const onFileChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const file: File | undefined = e.target.files?.[0];
    setError(undefined);
    if (!file) {
      setPicked(undefined);
      return;
    }
    if (!allowedMimes.includes(file.type)) {
      setError(`Unsupported type: ${file.type || 'unknown'}. Allowed: ${allowedMimes.join(', ')}.`);
      setPicked(undefined);
      return;
    }
    setPicked(file);
  };

  const onClickUpload = (): void => {
    if (!picked) return;
    upload.mutate(
      { file: picked, contentType: picked.type },
      {
        onSuccess: ({ key }): void => {
          onUploaded(key);
          setPicked(undefined);
        },
      },
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span className="field__label">{label}</span>

      {mode === 'image' && currentKey !== undefined && (
        <S3Image s3Key={currentKey} alt={label} width={140} height={140} />
      )}
      {mode === 'pdf' && currentKey !== undefined && (
        <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--color-muted)' }}>
          Current file uploaded.
          {pdfReadUrl.data && (
            <>
              {' '}—{' '}
              <a href={pdfReadUrl.data.url} target="_blank" rel="noreferrer">
                Open / download
              </a>
            </>
          )}
        </div>
      )}
      {currentKey === undefined && (
        <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--color-muted)' }}>
          No file selected yet.
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <input
          type="file"
          accept={accept}
          onChange={onFileChange}
          disabled={upload.isPending}
          style={{ fontSize: 'var(--fs-sm)' }}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onClickUpload}
          disabled={!picked || upload.isPending || error !== undefined}
        >
          {upload.isPending ? 'Uploading…' : 'Upload'}
        </Button>
      </div>

      {error && <span className="field__error">{error}</span>}
    </div>
  );
};
