import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useModal } from './modalStore';
import { isModalName } from './registry';

/**
 * Sync rules:
 *   ?modal=books.form&id=<uuid> → open with id (edit)
 *   ?modal=books.form           → open without id (create)
 *   no ?modal=                  → close
 *   modal closed in UI          → strip modal/id from URL
 */
export const useModalUrlSync = (): void => {
  const { state, open, close } = useModal();
  const location = useLocation();
  const navigate = useNavigate();

  // URL → modal
  useEffect((): void => {
    const sp: URLSearchParams = new URLSearchParams(location.search);
    const modal: string | null = sp.get('modal');
    if (modal === null) {
      if (state.isOpen) close();
      return;
    }
    if (!isModalName(modal)) return;

    const id: string | null = sp.get('id');
    const props: Record<string, string | undefined> = {};
    if (id !== null) props.id = id;

    const sameOpen: boolean =
      state.isOpen && state.name === modal && state.props.id === props.id;
    if (!sameOpen) {
      open(modal, props);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  // modal closed → strip ?modal= and ?id= from URL
  useEffect((): void => {
    if (!state.isOpen) {
      const sp: URLSearchParams = new URLSearchParams(location.search);
      if (sp.has('modal') || sp.has('id')) {
        sp.delete('modal');
        sp.delete('id');
        navigate(
          { pathname: location.pathname, search: sp.toString() },
          { replace: true },
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isOpen]);
};

export const useOpenModalLink = (): ((
  name: string,
  params?: Record<string, string>,
) => void) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (name: string, params?: Record<string, string>): void => {
    const sp: URLSearchParams = new URLSearchParams(location.search);
    sp.set('modal', name);
    if (params) {
      for (const [k, v] of Object.entries(params)) sp.set(k, v);
    } else {
      sp.delete('id');
    }
    navigate({ pathname: location.pathname, search: sp.toString() });
  };
};
