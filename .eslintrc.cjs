module.exports = {
  extends: [
    'eslint:recommended',
    'prettier',
    'plugin:prettier/recommended',
    'plugin:import/recommended',
    'plugin:eslint-comments/recommended',
  ],
  ignorePatterns: [
    'node_modules',
    'dist',
    'dev-dist',
    '!**/.*',
    '!**/.*/**/.*',
  ],
  overrides: [
    {
      files: ['./**/*.{js,cjs,mjs}'],
      // config files are assumed to be running in node
      env: { node: true },
    },
    // browser environment
    {
      excludedFiles: ['./src/**/*.test.{ts,tsx}', './src/**/*.test-d.ts'],
      files: [
        './src/**/*.{ts,tsx}',
        './examples/**/*.{ts,tsx}',
        './examples/**/*.{ts,tsx}',
      ],
      env: { browser: true },
      parserOptions: {
        ecmaVersion: 'latest',
        projectService: true,
        sourceType: 'module',
        tsconfigRootDir: __dirname,
      },
      settings: {
        'import/resolver': {
          typescript: {
            alwaysTryTypes: true,
            project: [
              './tsconfig.lib.json',
              './examples/hello-world/tsconfig.json',
            ],
          },
        },
      },
    },
    {
      excludedFiles: [
        './examples/hello-world/**/*.test.{ts,tsx}',
        './examples/hello-world/**/*.test-d.ts',
      ],
      files: ['./examples/hello-world/**/*.{ts,tsx}'],
      env: { browser: true },
      parserOptions: {
        ecmaVersion: 'latest',
        projectService: true,
        sourceType: 'module',
        tsconfigRootDir: __dirname + '/examples/hello-world',
      },
      settings: {
        'import/resolver': {
          typescript: {
            alwaysTryTypes: true,
            project: ['./examples/hello-world/tsconfig.json'],
          },
        },
      },
      // rules: {}
    },
    // test environment
    {
      files: [
        '.*/**/*.test.{ts,tsx}',
        './tests/**/*.{ts,tsx}',
        './src/**/*.test.{ts,tsx}',
        './src/*.test-d.ts',
        './**/*.test.{ts,tsx}',
      ],
      env: { node: true },
      parserOptions: {
        ecmaVersion: 'latest',
        projectService: true,
        sourceType: 'module',
        tsconfigRootDir: __dirname,
      },
      settings: {
        'import/resolver': {
          node: true,
          typescript: {
            alwaysTryTypes: true,
            project: ['./tsconfig.test.json'],
          },
        },
      },
      extends: ['plugin:vitest/legacy-all'],
      rules: {
        'vitest/max-nested-describe': ['error', { max: 3 }],
        'vitest/no-hooks': 'off',
        'vitest/prefer-expect-assertions': 'off',
      },
    },
    // node environment
    {
      files: [
        './*.ts',
        // Maybe remove this if not needed
        './.*/**/*.ts',
        './scripts/**/*.ts',
        './.devcontainer/**/*.{ts,tsx}',
      ],
      env: { node: true },
      parserOptions: {
        ecmaVersion: 'latest',
        // include tsconfig.app.json for importing types from server
        projectService: true,
        sourceType: 'module',
        tsconfigRootDir: __dirname,
      },
      settings: {
        'import/resolver': {
          node: true,
          typescript: {
            alwaysTryTypes: true,
            project: ['./tsconfig.node.json'],
          },
        },
      },
    },
    {
      // all TypeScript files
      files: ['./**/*.{ts,tsx}', './.*/**/*.{ts,tsx}'],
      extends: [
        'plugin:@typescript-eslint/strict-type-checked',
        'plugin:import/typescript',
      ],
      plugins: ['@typescript-eslint'],
      rules: {
        // TODO: profile performance impact
        // 'import/namespace': 'off',
        // 'no-restricted-imports': [
        //   'error',
        //   {
        //     name: 'src/modules/MyModule/queries',
        //     message: 'GraphQL queries should only be imported in context.ts',
        //     allow: ['src/modules/MyModule/context.ts'],
        //   },
        // ],
        '@typescript-eslint/no-deprecated': 'warn',
        '@typescript-eslint/no-extraneous-class': [
          'warn',
          {
            allowConstructorOnly: true,
            allowEmpty: false,
            allowStaticOnly: false,
            allowWithDecorator: false,
          },
        ],
        '@typescript-eslint/unified-signatures': [
          'warn',
          {
            ignoreDifferentlyNamedParameters: true,
            ignoreOverloadsWithDifferentJSDoc: false,
          },
        ],
        '@typescript-eslint/ban-ts-comment': [
          'warn',
          {
            'ts-check': false,
            'ts-expect-error': true,
            'ts-ignore': false,
            'ts-nocheck': false,
          },
        ],
        '@typescript-eslint/no-confusing-void-expression': [
          'warn',
          { ignoreArrowShorthand: true },
        ],
        '@typescript-eslint/no-empty-object-type': [
          'error',
          {
            allowInterfaces: 'always',
          },
        ],
        '@typescript-eslint/no-explicit-any': [
          'error',
          {
            ignoreRestArgs: true,
          },
        ],
        '@typescript-eslint/no-floating-promises': [
          'warn',
          { ignoreVoid: true },
        ],
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/no-unnecessary-condition': [
          'warn',
          { allowConstantLoopConditions: true },
        ],
        '@typescript-eslint/no-unnecessary-template-expression': 'warn',
        // TODO: see in the future if this can be enabled. Currently not beneficial.
        '@typescript-eslint/no-unnecessary-type-parameters': 'off',
        '@typescript-eslint/no-unused-vars': [
          'warn',
          {
            args: 'all',
            argsIgnorePattern: '^_$',
            caughtErrors: 'all',
            caughtErrorsIgnorePattern: '^_',
            ignoreRestSiblings: true,
            vars: 'local',
            varsIgnorePattern: '^_$',
          },
        ],
        '@typescript-eslint/unbound-method': 'off',
        'prefer-const': 'warn',
        'prefer-spread': 'off',
      },
    },
    {
      files: ['./**/*.tsx'],
      // all React files
      extends: [
        'plugin:react/jsx-runtime',
        'plugin:react/all',
        'plugin:react-hooks/recommended',
        'plugin:react-perf/all',
      ],
      plugins: [
        'react',
        'react-hooks',
        'react-refresh',
        'react-perf',
        // '@emotion',
      ],
      rules: {
        // '@emotion/syntax-preference': ['warn', 'string'],
        'no-restricted-imports': [
          'error',
          {
            patterns: [],
          },
        ],
        'react/jsx-first-prop-new-line': ['off', 'multiline'],
        'react-hooks/exhaustive-deps': 'warn',
        'react-hooks/rules-of-hooks': 'error',
        'react-perf/jsx-no-jsx-as-prop': 'warn',
        'react-perf/jsx-no-new-function-as-prop': 'warn',
        'react-perf/jsx-no-new-object-as-prop': 'warn',
        'react-refresh/only-export-components': [
          'warn',
          { allowConstantExport: true },
        ],
        'react/destructuring-assignment': 'off',
        'react/forbid-component-props': 'off',
        'react/jsx-one-expression-per-line': 'off',
        'react/function-component-definition': [
          'warn',
          {
            namedComponents: ['function-declaration', 'arrow-function'],
            unnamedComponents: ['arrow-function', 'function-expression'],
          },
        ],
        'react/hook-use-state': 'off',
        'react/jsx-boolean-value': 'off',
        'react/jsx-child-element-spacing': 'off',
        'react/jsx-closing-bracket-location': ['warn', 'tag-aligned'],
        'react/jsx-closing-tag-location': ['off', 'tag-aligned'],
        'react/jsx-curly-brace-presence': 'warn',
        'react/jsx-curly-newline': 'warn',
        'react/jsx-curly-spacing': 'warn',
        'react/jsx-filename-extension': [
          'error',
          { allow: 'as-needed', extensions: ['.tsx'] },
        ],
        'react/jsx-handler-names': 'off',
        'react/jsx-indent': ['warn', 2],
        'react/jsx-indent-props': ['warn', 2],
        'react/jsx-max-depth': ['warn', { max: 4 }],
        'react/jsx-max-props-per-line': [
          'off',
          { maximum: { multi: 1, single: 2 } },
        ],
        'react/jsx-newline': [
          'warn',
          { allowMultilines: false, prevent: true },
        ],
        'react/jsx-no-bind': ['error', { allowArrowFunctions: true }],
        'react/jsx-no-comment-textnodes': 'warn',
        'react/jsx-no-literals': 'off',
        'react/jsx-no-useless-fragment': 'warn',
        'react/jsx-props-no-multi-spaces': 'warn',
        'react/jsx-props-no-spreading': 'off',
        'react/jsx-sort-props': [
          'warn',
          {
            callbacksLast: false,
            ignoreCase: true,
            multiline: 'last',
            reservedFirst: true,
            shorthandFirst: true,
          },
        ],
        'react/jsx-wrap-multilines': 'warn',
        'react/no-multi-comp': ['warn', { ignoreStateless: true }],
        'react/no-unknown-property': ['error', { ignore: ['css'] }],
        'react/no-unused-prop-types': 'off',
        'react/prop-types': 'off',
        'react/react-in-jsx-scope': 'off',
        'react/require-default-props': 'off',
        'react/jsx-tag-spacing': 'warn',
      },
      settings: { react: { version: 'detect' } },
    },
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['import', 'unused-imports'],
  // root: true,
  rules: {
    'eslint-comments/no-unused-disable': 'warn',
    'import/no-named-as-default-member': 'off',
    'import/order': [
      'warn',
      {
        alphabetize: {
          caseInsensitive: true,
          order: 'asc',
        },
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index',
        ],
        'newlines-between': 'never',
        pathGroups: [
          {
            group: 'external',
            pattern: 'react',
            position: 'before',
          },
        ],
        pathGroupsExcludedImportTypes: ['react'],
      },
    ],
    'no-irregular-whitespace': 'off',
    'prettier/prettier': 'warn',
    'unused-imports/no-unused-imports': 'warn',
  },
};
