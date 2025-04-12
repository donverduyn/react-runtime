// import commonjs from '@rollup/plugin-commonjs';
// import { nodeResolve } from '@rollup/plugin-node-resolve';
// import typescript from '@rollup/plugin-typescript';

// const config = {
//   input: './index.ts',
//   plugins: [
    // tsConfigPaths({ tsConfigPath: './tsconfig.lib.json' }),
//     nodeResolve({ extensions: ['.tsx', '.ts', '.json'] }),
//     commonjs(),
//     typescript({
//       tsconfig: './tsconfig.lib.json',
//       // tsConfigPaths: true,
//     }),
//   ],
// };

// export default config;
import fs from 'fs';
import path from 'path';
import resolve from '@rollup/plugin-node-resolve';
// import typescript from '@rollup/plugin-typescript';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import typescript from 'rollup-plugin-typescript2';
import tsConfigPaths from 'rollup-plugin-tsconfig-paths';
// import ttypescript from 'ttypescript'
// import alias from '@rollup/plugin-alias';

// Helper to get tsconfig paths
// const tsconfig = JSON.parse(fs.readFileSync('./tsconfig.lib.json', 'utf8'));
// const paths = tsconfig.compilerOptions.paths || {};
// const aliases = Object.entries(paths).map(([key, value]) => ({
//   find: key.replace('/*', ''),
//   replacement: path.resolve(__dirname, value[0].replace('/*', '')),
// }));

export default {
  input: 'index.ts',
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
    // tsConfigPaths({ tsConfigPath: './tsconfig.lib.json' }),
    peerDepsExternal(),
    // alias({
    //   entries: [
    //     { find: 'hooks', replacement: path.resolve(__dirname, 'src/hooks') },
    //     { find: 'utils', replacement: path.resolve(__dirname, 'src/utils') },
    //   ],
    // }),
    // alias({
    //   entries: aliases,
    // }),
    // tsConfigPaths({ tsConfigPath: './tsconfig.lib.json' }),
    // resolve({
    //   extensions: ['.ts', '.tsx', '.js', '.jsx'],
    // }),
    // commonjs(),
    typescript({
      tsconfig: './tsconfig.lib.json',
      clean: true,
      // useTsconfigDeclarationDir: true,
      declaration: true,
      declarationDir: 'dist/types',
      exclude: [
        'node_modules',
        // Exclude test files
        /\.test.((js|jsx|ts|tsx))$/,
        // Exclude story files
        /\.stories.((js|jsx|ts|tsx|mdx))$/,
      ],
      // typescript: ttypescript
    }),
  ],
  external: ['react', 'react-dom'],
};
