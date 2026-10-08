import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Vite loads the React application and enables the local development server.
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
  },
});
