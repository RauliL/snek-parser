import { nodeResolve } from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import typescript from 'rollup-plugin-typescript2';

export default {
  input: './src/index.ts',
  output: [
    {
      file: 'dist/snek-parser.js',
      format: 'cjs',
    },
    {
      file: 'dist/snek-parser.mjs',
      format: 'es',
    },
    {
      file: 'dist/snek-parser.iife.js',
      format: 'iife',
      name: 'SnekParser',
    },
  ],
  plugins: [nodeResolve(), typescript(), terser()],
};
