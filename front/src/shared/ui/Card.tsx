import { ReactNode } from 'react';
import './Card.css';

type CardProps = {
  children: ReactNode;
  className?: string;
};

export const Card = ({ children, className }: CardProps): JSX.Element => (
  <div className={`card ${className ?? ''}`}>{children}</div>
);
