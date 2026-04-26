import { createContext, useContext } from 'react';
import { ModalName } from './registry';

export type ModalState =
  | { isOpen: false }
  | { isOpen: true; name: ModalName; props: Record<string, string | undefined> };

export type ModalContextValue = {
  state: ModalState;
  open: (name: ModalName, props?: Record<string, string | undefined>) => void;
  close: () => void;
};

export const ModalContext = createContext<ModalContextValue | null>(null);

export const useModal = (): ModalContextValue => {
  const ctx: ModalContextValue | null = useContext(ModalContext);
  if (ctx === null) throw new Error('useModal must be used inside ModalProvider');
  return ctx;
};
