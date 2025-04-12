import react from '@vitejs/plugin-react';
import { defineConfig, type PluginOption } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vite.dev/config/
export default defineConfig({
  server: { host: true },
  plugins: [
    react(),
    tsconfigPaths({
      projects: ['./tsconfig.json', './../../tsconfig.json'],
    }) as PluginOption,
  ],
});
