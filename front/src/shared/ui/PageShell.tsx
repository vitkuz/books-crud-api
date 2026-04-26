import { ReactNode } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Button } from './Button';
import './PageShell.css';

type PageShellProps = {
  children: ReactNode;
};

export const PageShell = ({ children }: PageShellProps): JSX.Element => {
  const { state, logout } = useAuth();

  return (
    <div className="shell">
      <header className="shell__header">
        <div className="shell__inner">
          <Link to="/books" className="shell__brand">
            Books
          </Link>
          <nav className="shell__nav">
            <NavLink to="/books" className={({ isActive }) => `shell__link ${isActive ? 'is-active' : ''}`}>
              Books
            </NavLink>
            <NavLink to="/authors" className={({ isActive }) => `shell__link ${isActive ? 'is-active' : ''}`}>
              Authors
            </NavLink>
            <NavLink to="/categories" className={({ isActive }) => `shell__link ${isActive ? 'is-active' : ''}`}>
              Categories
            </NavLink>
          </nav>
          <div className="shell__user">
            {state.status === 'authed' ? (
              <>
                <span className="shell__user-name">{state.user.name ?? state.user.email}</span>
                <Button size="sm" variant="ghost" onClick={(): void => { void logout(); }}>
                  Sign out
                </Button>
              </>
            ) : state.status === 'guest' ? (
              <>
                <Link to="/register" className="shell__link">Register</Link>
                <Link to="/login">
                  <Button size="sm" variant="primary">Sign in</Button>
                </Link>
              </>
            ) : null}
          </div>
        </div>
      </header>
      <main className="shell__main">
        <div className="shell__inner shell__inner--main">{children}</div>
      </main>
    </div>
  );
};
