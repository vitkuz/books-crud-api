import { forwardRef, InputHTMLAttributes, ReactNode } from 'react';
import './Input.css';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  hint?: ReactNode;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, id, ...rest }: InputProps, ref): JSX.Element => {
    const inputId: string = id ?? rest.name ?? '';
    return (
      <label className="field" htmlFor={inputId}>
        {label && <span className="field__label">{label}</span>}
        <input
          id={inputId}
          ref={ref}
          {...rest}
          className={`field__input ${error ? 'field__input--error' : ''}`}
        />
        {error && <span className="field__error">{error}</span>}
        {hint && !error && <span className="field__hint">{hint}</span>}
      </label>
    );
  },
);

Input.displayName = 'Input';
