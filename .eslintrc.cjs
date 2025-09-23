module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
    'prettier',
    'plugin:prettier/recommended',
    'plugin:import/recommended',
    'plugin:eslint-comments/recommended',
  ],
  ignorePatterns: [
    'node_modules',
    '!**/.*',
    '!**/.*/**/*',
    'packages/**/*',
    'examples/**/*',
  ],
  overrides: [
    {
      files: ['./*.{js,cjs,mjs}'],
      // config files are assumed to be running in node
      env: { node: true },
    },
    // node-ts environment
    {
      files: ['./*.ts', './.*/**/*.ts'],
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
            project: ['./tsconfig.node.json'],
          },
        },
      },
    },
    {
      // all TypeScript files at root
      files: ['./*.{ts,tsx}', './.*/**/*.{ts,tsx}'],
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
            argsIgnorePattern: '^_+$',
            caughtErrors: 'all',
            caughtErrorsIgnorePattern: '^_+$',
            ignoreRestSiblings: true,
            vars: 'local',
            varsIgnorePattern: '^_+$',
          },
        ],
        '@typescript-eslint/unbound-method': 'off',
        'prefer-const': 'warn',
        'prefer-spread': 'off',
      },
    },
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['import', 'unused-imports'],
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
