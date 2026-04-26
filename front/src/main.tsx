import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppProviders } from '@/app/providers/AppProviders';
import '@/styles/globals.css';
import '@/styles/auth.css';

const root: HTMLElement | null = document.getElementById('root');
if (root === null) throw new Error('#root element missing');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <AppProviders />
  </React.StrictMode>,
);
