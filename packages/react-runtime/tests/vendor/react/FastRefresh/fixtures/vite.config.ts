// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error unresolved import

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: { port: 3001 },
});
