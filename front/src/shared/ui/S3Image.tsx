import { CSSProperties } from 'react';
import { usePresignedReadUrl } from '@/features/files/queries/files.queries';

type S3ImageProps = {
  s3Key: string | undefined;
  alt: string;
  width?: number;
  height?: number;
  rounded?: boolean;
  fallback?: JSX.Element;
};

const baseStyle = (width?: number, height?: number, rounded?: boolean): CSSProperties => ({
  width: width ?? '100%',
  height: height ?? 'auto',
  objectFit: 'cover',
  display: 'block',
  borderRadius: rounded ? 'var(--radius)' : undefined,
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface-2)',
});

export const S3Image = ({
  s3Key,
  alt,
  width,
  height,
  rounded = true,
  fallback,
}: S3ImageProps): JSX.Element | null => {
  const query = usePresignedReadUrl(s3Key);

  if (s3Key === undefined || s3Key === '') return fallback ?? null;
  if (query.isLoading) {
    return (
      <div
        aria-label={`Loading ${alt}`}
        style={{
          ...baseStyle(width, height, rounded),
          height: height ?? 80,
        }}
      />
    );
  }
  if (query.isError || !query.data) return fallback ?? null;
  return (
    <img
      src={query.data.url}
      alt={alt}
      style={baseStyle(width, height, rounded)}
    />
  );
};
