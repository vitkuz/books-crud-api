import { ReactNode, useState } from 'react';
import { ModalContext, ModalState } from '../modals/modalStore';
import { ModalName } from '../modals/registry';

type ModalProviderProps = {
  children: ReactNode;
};

export const ModalProvider = ({ children }: ModalProviderProps): JSX.Element => {
  const [state, setState] = useState<ModalState>({ isOpen: false });

  const open = (name: ModalName, props?: Record<string, string | undefined>): void => {
    setState({ isOpen: true, name, props: props ?? {} });
  };

  const close = (): void => {
    setState({ isOpen: false });
  };

  return (
    <ModalContext.Provider value={{ state, open, close }}>{children}</ModalContext.Provider>
  );
};
