export const IMAGE_CONTENT_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

export type ImageContentType = (typeof IMAGE_CONTENT_TYPES)[number];

export const PDF_CONTENT_TYPE = 'application/pdf';

export const imageContentTypeToExt = (contentType: ImageContentType): string => {
  switch (contentType) {
    case 'image/png':
      return 'png';
    case 'image/jpeg':
      return 'jpg';
    case 'image/webp':
      return 'webp';
  }
};
