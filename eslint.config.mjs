import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import js from '@eslint/js';
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const tsconfigRootDir = dirname(fileURLToPath(import.meta.url));

export default tseslint.config(
  // Flat config replaces `.eslintrc`'s `ignorePatterns`. These are generated,
  // vendored or local-only, and two of them (the Next types and `.hermes/`) are
  // owned by something else entirely — `.hermes/` in particular is gitignored
  // working material that would otherwise be linted and warned at for
  // `console.log` in throwaway scripts.
  {
    ignores: [
      '.next/**',
      'out/**',
      'build/**',
      'coverage/**',
      'node_modules/**',
      'next-env.d.ts',
      'jest.config.js',
      'jest.setup.js',
      'postcss.config.js',
      'eslint.config.mjs',
      '.hermes/**',
    ],
  },

  js.configs.recommended,

  // Next's own flat configs: core-web-vitals (the framework's rules) plus the
  // TypeScript layer it ships alongside them.
  ...nextCoreWebVitals,
  ...nextTypescript,

  // Type-aware rules, replacing `plugin:@typescript-eslint/recommended` and
  // `plugin:@typescript-eslint/recommended-requiring-type-checking`. The old
  // config pointed `parserOptions.project` at `./tsconfig.json`; `projectService`
  // is the supported equivalent and is faster because it reuses one program.
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir,
      },
    },
  },

  // Jest's globals are not declared by any of the shared configs, and this
  // project deliberately has no `no-undef` for TypeScript — `tsc` owns undefined
  // names — but the config above does not know that `describe`/`it`/`expect`
  // come from Jest, so the environment is stated for the test tree only.
  {
    files: ['__tests__/**/*.ts', '__tests__/**/*.tsx', '**/*.test.ts', '**/*.test.tsx'],
    languageOptions: {
      globals: { ...globals.jest },
    },
  },

  // Project rules: the strictest of the type-aware set that has earned its
  // place, with the pedantic opt-ins left off explicitly so the choice is
  // recorded rather than implied by absence.
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/strict-boolean-expressions': 'off',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },

  // CommonJS and plain-JS tooling are not in tsconfig.json, so there is no
  // program for the type-aware pass to find. Rather than force them into a
  // project or drop them from linting entirely — ESLint 8 silently skipped
  // `.cjs`, which is why this was never visible before — their type-aware rules
  // are switched off and Node's globals are declared.
  //
  // This block must come *after* the rules above: flat config merges in order,
  // and the project rules re-enable `await-thenable` and friends for every file
  // they apply to, which would otherwise undo the disable.
  {
    files: ['**/*.cjs', '**/*.mjs', 'scripts/**'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      // `require()` is what CommonJS is; the rule exists to catch it inside
      // TypeScript and ES modules where it means a mistake was made.
      '@typescript-eslint/no-require-imports': 'off',
      // A verification script's entire job is to print a result. `no-console`
      // is a browser-app convention and does not belong in build tooling.
      'no-console': 'off',
    },
  },

  // Last, as documented: it exists to switch off formatting rules so Prettier
  // and ESLint cannot disagree about a file.
  prettier
);
