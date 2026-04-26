import { ButtonHTMLAttributes, ReactNode } from 'react';
import './Button.css';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
};

export const Button = ({
  variant = 'secondary',
  size = 'md',
  children,
  className,
  ...rest
}: ButtonProps): JSX.Element => {
  const cls: string = [
    'btn',
    `btn--${variant}`,
    `btn--${size}`,
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
};
