import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import './practice-table.css';

// The root element is the single place where the React application is mounted.
// StrictMode runs development checks twice so state and effect mistakes are easy
// to catch during local development.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
