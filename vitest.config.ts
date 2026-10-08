import { defineConfig } from 'vitest/config';

// Keep tests separate from the Vite application configuration. This avoids
// sharing two different Vite type versions while retaining a jsdom test runtime.
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
