// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error unresolved import
// eslint-disable-next-line import/no-unresolved
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
  plugins: [react()],
  server: { port: 3001 },
});
