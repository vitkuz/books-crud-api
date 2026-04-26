import { ComponentType } from 'react';
import { useModal } from './modalStore';
import { modalRegistry, ModalProps } from './registry';

export const ModalRoot = (): JSX.Element | null => {
  const { state, close } = useModal();
  if (!state.isOpen) return null;

  const Component: ComponentType<ModalProps> = modalRegistry[state.name] as ComponentType<ModalProps>;
  const props: ModalProps = {
    id: state.props.id,
    onClose: close,
  };
  return <Component {...props} />;
};
