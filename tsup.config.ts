import { defineConfig } from 'tsup';
import type { Options, OutExtensionFactory } from 'tsup';

const outExtension: OutExtensionFactory = ({ format }) => ({
  js: format === 'cjs' ? '.cjs' : format === 'esm' ? '.mjs' : '.js',
});

export default defineConfig((options: Options) => ({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  sourcemap: true,
  clean: true,
  dts: true,
  target: 'node22',
  outDir: 'dist',
  treeshake: true,
  minify: false,
  splitting: false,
  outExtension,
  watch: options.watch,
}));
