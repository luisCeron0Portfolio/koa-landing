// @ts-check
import { defineConfig } from 'eslint/config';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import astroPlugin from 'eslint-plugin-astro';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';

export default defineConfig(
  { ignores: ['dist/', '.astro/', '.vercel/', 'node_modules/', 'playwright-report/', 'test-results/'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...astroPlugin.configs.recommended,
  eslintConfigPrettier,
  {
    // Mezcla de código server (Node) y cliente (React island) en el mismo
    // proyecto pequeño — declarar ambos globals evita falsos positivos de
    // no-undef sin tener que separar configs por carpeta.
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
);
