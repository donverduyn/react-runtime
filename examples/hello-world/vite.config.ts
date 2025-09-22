import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, type PluginOption } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vite.dev/config/
export default defineConfig({
  root: path.resolve(__dirname, './../../examples/hello-world'),
  server: { host: true },
  plugins: [
    react(),
    tsconfigPaths({
      projects: ['./tsconfig.json', './../../tsconfig.json'],
    }) as PluginOption,
  ],
});
