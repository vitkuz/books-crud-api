export type Metadata = {
  createdAt: string;
  updatedAt: string;
};

export type UserResponse = {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
  updatedAt: string;
  metadata: Metadata;
};

export type Author = {
  id: string;
  name: string;
  portraitKey?: string;
  createdAt: string;
  updatedAt: string;
  metadata: Metadata;
};

export type Category = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
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
  createdAt: string;
  updatedAt: string;
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
  createdAt: string;
  updatedAt: string;
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

export type AuthLoginResponse = {
  user: UserResponse;
  token: string;
};

export type InitResponse = {
  user: UserResponse;
  password: string;
  token: string;
};
