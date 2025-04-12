import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import tsconfigPaths from 'rollup-plugin-tsconfig-paths';

const input = 'index.ts';
const external = [
  'react',
  'react-dom',
  'effect',
  'uuid',
  'moize',
  'fast-equals',
  'micro-memoize',
  /^react\/.*/,
  /^effect\/.*/,
];

export default [
  // ESM + CJS
  {
    input,
    external,
    output: [
      {
        file: 'dist/index.cjs.js',
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: 'dist/index.esm.js',
        format: 'esm',
        sourcemap: true,
      },
    ],
    plugins: [
      peerDepsExternal(),
      tsconfigPaths({ projects: ['./tsconfig.build.json'] }),
      nodeResolve(),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.build.json',
        declaration: false,
        outputToFilesystem: true,
      }),
    ],
  },

  // Minified ESM
  {
    input,
    external,
    output: {
      file: 'dist/index.esm.min.js',
      format: 'esm',
      sourcemap: true,
    },
    plugins: [
      peerDepsExternal(),
      tsconfigPaths({ projects: ['./tsconfig.build.json'] }),
      nodeResolve(),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.build.json',
        declaration: false,
        outputToFilesystem: true,
      }),
      terser({
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
        format: {
          comments: false,
        },
      }),
    ],
  },

  // Types
  {
    input,
    external,
    output: {
      file: 'dist/index.d.ts',
      format: 'es',
    },
    plugins: [
      tsconfigPaths({ projects: ['./tsconfig.lib.json'] }),
      dts({ tsconfig: './tsconfig.lib.json' }),
    ],
  },
];
