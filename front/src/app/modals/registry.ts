import { ComponentType } from 'react';
import { AuthorDeleteModal } from '@/features/authors/modals/AuthorDeleteModal';
import { AuthorFormModal } from '@/features/authors/modals/AuthorFormModal';
import { BookDeleteModal } from '@/features/books/modals/BookDeleteModal';
import { BookFormModal } from '@/features/books/modals/BookFormModal';
import { CategoryDeleteModal } from '@/features/categories/modals/CategoryDeleteModal';
import { CategoryFormModal } from '@/features/categories/modals/CategoryFormModal';

export type ModalProps = {
  id?: string;
  onClose: () => void;
};

export const modalRegistry = {
  'books.form': BookFormModal as ComponentType<ModalProps>,
  'books.delete': BookDeleteModal as ComponentType<ModalProps & { id: string }>,
  'authors.form': AuthorFormModal as ComponentType<ModalProps>,
  'authors.delete': AuthorDeleteModal as ComponentType<ModalProps & { id: string }>,
  'categories.form': CategoryFormModal as ComponentType<ModalProps>,
  'categories.delete': CategoryDeleteModal as ComponentType<ModalProps & { id: string }>,
} as const;

export type ModalName = keyof typeof modalRegistry;

export const isModalName = (x: string): x is ModalName => x in modalRegistry;
