export type Metadata = {
  createdAt: string;
  updatedAt: string;
};

export type UserResponse = {
  id: string;
  email: string;
  name?: string;
  metadata: Metadata;
};

export type Author = {
  id: string;
  name: string;
  portraitKey?: string;
  metadata: Metadata;
};

export type Category = {
  id: string;
  name: string;
  metadata: Metadata;
};

export type Book = {
  id: string;
  title: string;
  authorId: string;
  categoryIds: string[];
  year: number;
  pdfKey?: string;
  coverKey?: string;
  metadata: Metadata;
};

export type BookResponse = {
  id: string;
  title: string;
  author: Author;
  categories: Category[];
  year: number;
  pdfKey?: string;
  coverKey?: string;
  metadata: Metadata;
};

export type PresignedUploadUrlResponse = {
  url: string;
  key: string;
  expiresInSeconds: number;
};

export type PresignedReadUrlResponse = {
  url: string;
  expiresInSeconds: number;
};

export type ImageContentType = 'image/png' | 'image/jpeg' | 'image/webp';

export type AuthLoginResponse = {
  user: UserResponse;
  token: string;
};

export type InitResponse = {
  user: UserResponse;
  password: string;
  token: string;
};
