import js from '@eslint/js';
import globals from 'globals';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import type {Linter} from 'eslint';

const config: Linter.Config[] = [
	{ignores: ['dist', 'build', '.llm/**', 'node_modules/**', 'avalon-logs-all.json']},
	{
		files: ['**/*.js'],
		languageOptions: {
			ecmaVersion: 2020,
			globals: {
				...globals.node,
				...globals.commonjs,
			},
		},
		rules: {
			...js.configs.recommended.rules,
			'no-unused-vars': ['error', {varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_'}],
			eqeqeq: ['error', 'smart'],
			'one-var': ['error', 'never'],
			'no-empty': ['error', {allowEmptyCatch: true}],
		},
	},
	{
		files: ['**/*.ts'],
		languageOptions: {
			ecmaVersion: 2020,
			globals: {
				...globals.node,
			},
			parser: tsparser,
			parserOptions: {
				ecmaVersion: 'latest',
				sourceType: 'module',
			},
		},
		plugins: {
			'@typescript-eslint': tseslint as any,
		},
		rules: {
			...tseslint.configs.recommended.rules,
			'@typescript-eslint/no-unused-vars': ['error', {varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_'}],
			'@typescript-eslint/no-explicit-any': 'off',
			eqeqeq: ['error', 'smart'],
			'one-var': ['error', 'never'],
		},
	},
];

export default config;
