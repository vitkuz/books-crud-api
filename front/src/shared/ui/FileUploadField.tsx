import { ChangeEvent, useState } from 'react';
import { Button } from './Button';
import { S3Image } from './S3Image';
import { usePresignedReadUrl } from '@/features/files/queries/files.queries';
import { ImageContentType } from '@/shared/types/api.types';

type FileUploadFieldProps = {
  label: string;
  /** Accept attribute for the <input>, e.g. "image/png,image/jpeg,image/webp" or "application/pdf". */
  accept: string;
  /** Current persisted S3 key (for preview / download). */
  currentKey: string | undefined;
  /** 'image' renders an inline preview; 'pdf' renders a download link. */
  mode: 'image' | 'pdf';
  isUploading: boolean;
  /** For images, contentType comes from the picked file. For PDFs, the parent ignores this argument. */
  onUpload: (file: File, contentType: ImageContentType | 'application/pdf') => void;
};

const PDF_MIME = 'application/pdf';
const IMAGE_MIMES: ImageContentType[] = ['image/png', 'image/jpeg', 'image/webp'];

const isImageContentType = (value: string): value is ImageContentType =>
  (IMAGE_MIMES as string[]).includes(value);

export const FileUploadField = ({
  label,
  accept,
  currentKey,
  mode,
  isUploading,
  onUpload,
}: FileUploadFieldProps): JSX.Element => {
  const [picked, setPicked] = useState<File | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const pdfReadUrl = usePresignedReadUrl(mode === 'pdf' ? currentKey : undefined);

  const onFileChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const file: File | undefined = e.target.files?.[0];
    setError(undefined);
    if (!file) {
      setPicked(undefined);
      return;
    }
    if (mode === 'image' && !isImageContentType(file.type)) {
      setError(`Unsupported image type: ${file.type || 'unknown'}. Use PNG, JPEG, or WebP.`);
      setPicked(undefined);
      return;
    }
    if (mode === 'pdf' && file.type !== PDF_MIME) {
      setError(`Expected a PDF; got ${file.type || 'unknown'}.`);
      setPicked(undefined);
      return;
    }
    setPicked(file);
  };

  const onClickUpload = (): void => {
    if (!picked) return;
    if (mode === 'image' && isImageContentType(picked.type)) {
      onUpload(picked, picked.type);
    } else if (mode === 'pdf') {
      onUpload(picked, PDF_MIME);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span className="field__label">{label}</span>

      {mode === 'image' && currentKey !== undefined && (
        <S3Image s3Key={currentKey} alt={label} width={140} height={140} />
      )}
      {mode === 'pdf' && currentKey !== undefined && (
        <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--color-muted)' }}>
          Current file: <span className="mono">{currentKey.split('/').pop()}</span>
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
          No file uploaded yet.
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <input
          type="file"
          accept={accept}
          onChange={onFileChange}
          disabled={isUploading}
          style={{ fontSize: 'var(--fs-sm)' }}
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={onClickUpload}
          disabled={!picked || isUploading || error !== undefined}
        >
          {isUploading ? 'Uploading…' : 'Upload'}
        </Button>
      </div>

      {error && <span className="field__error">{error}</span>}
    </div>
  );
};
