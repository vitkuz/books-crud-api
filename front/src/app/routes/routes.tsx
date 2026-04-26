import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { ModalRoot } from '@/app/modals/ModalRoot';
import { useModalUrlSync } from '@/app/modals/modalUrlSync';
import { PageShell } from '@/shared/ui/PageShell';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { RegisterPage } from '@/features/auth/pages/RegisterPage';
import { BooksListPage } from '@/features/books/pages/BooksListPage';
import { BookDetailPage } from '@/features/books/pages/BookDetailPage';
import { AuthorsListPage } from '@/features/authors/pages/AuthorsListPage';
import { AuthorDetailPage } from '@/features/authors/pages/AuthorDetailPage';
import { CategoriesListPage } from '@/features/categories/pages/CategoriesListPage';
import { CategoryDetailPage } from '@/features/categories/pages/CategoryDetailPage';

const ShellLayout = (): JSX.Element => {
  useModalUrlSync();
  return (
    <PageShell>
      <Outlet />
      <ModalRoot />
    </PageShell>
  );
};

export const router = createBrowserRouter([
  {
    element: <ShellLayout />,
    children: [
      { path: '/', element: <Navigate to="/books" replace /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/books', element: <BooksListPage /> },
      { path: '/books/:id', element: <BookDetailPage /> },
      { path: '/authors', element: <AuthorsListPage /> },
      { path: '/authors/:id', element: <AuthorDetailPage /> },
      { path: '/categories', element: <CategoriesListPage /> },
      { path: '/categories/:id', element: <CategoryDetailPage /> },
      { path: '*', element: <div className="empty">Not found.</div> },
    ],
  },
]);
