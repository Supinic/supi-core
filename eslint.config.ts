import tseslint from "typescript-eslint";
import eslintJs from "@eslint/js";
import unicornPlugin from "eslint-plugin-unicorn";
import globals from "globals";

export default tseslint.config(
	eslintJs.configs.recommended,
	tseslint.configs.strictTypeChecked,
	{
		ignores: ["build/", "**/*.js"]
	},
	{
		languageOptions: {
			parserOptions: {
				project: true,
				projectService: true,
				tsconfigRootDir: import.meta.dirname
			},
			globals: {
				...globals.browser,
				...globals.es2021
			},
			ecmaVersion: 12,
			sourceType: "module"
		},
		plugins: {
			unicorn: unicornPlugin
		},
		rules: {
			"@typescript-eslint/no-floating-promises": "error",
			"@typescript-eslint/restrict-template-expressions": ["error", {
				allowNumber: true
			}],
			"array-bracket-newline": ["warn", "consistent"],
			"array-bracket-spacing": ["warn", "never"],
			"array-element-newline": ["warn", "consistent"],
			"arrow-body-style": ["warn", "as-needed"],
			"arrow-spacing": ["warn", {
				after: true,
				before: true
			}],
			"brace-style": ["warn", "stroustrup", {
				allowSingleLine: true
			}],
			"comma-dangle": ["warn", "never"],
			curly: ["warn", "all"],
			"dot-location": ["warn", "property"],
			"dot-notation": "warn",
			"eol-last": ["warn", "always"],
			eqeqeq: "error",
			"function-call-argument-newline": ["warn", "consistent"],
			"implicit-arrow-linebreak": ["error", "beside"],
			indent: ["warn", "tab", {
				SwitchCase: 1
			}],
			"key-spacing": ["warn", {
				afterColon: true,
				beforeColon: false,
				mode: "strict"
			}],
			"keyword-spacing": ["warn", {
				after: true,
				before: true
			}],
			"lines-between-class-members": ["warn", "always", {
				exceptAfterSingleLine: true
			}],
			"max-nested-callbacks": ["warn", {
				max: 2
			}],
			"max-params": ["warn", {
				max: 5
			}],
			"max-statements-per-line": ["error", {
				max: 1
			}],
			"multiline-ternary": ["warn", "always-multiline"],
			"new-cap": ["warn", {
				capIsNew: false,
				newIsCap: true,
				properties: false
			}],
			"new-parens": ["error", "always"],
			"newline-per-chained-call": ["warn", {
				ignoreChainWithDepth: 3
			}],
			"no-bitwise": "error",
			"no-console": "off",
			"no-control-regex": "off",
			"no-duplicate-imports": "error",
			"no-empty-pattern": "error",
			"no-lonely-if": "warn",
			"no-mixed-operators": ["error", {
				groups: [
					["&&", "||"],
					["&", "|", "^", "~", "<<", ">>", ">>>"],
					["==", "!=", "===", "!==", ">", ">=", "<", "<="]
				]
			}],
			"no-multi-assign": "error",
			"no-multi-spaces": "warn",
			"no-multi-str": "warn",
			"no-multiple-empty-lines": ["warn", {
				max: 2,
				maxBOF: 0,
				maxEOF: 0
			}],
			"no-nested-ternary": "off",
			"no-new": "warn",
			"no-new-object": "error",
			"no-new-wrappers": "error",
			"no-proto": "error",
			"no-return-assign": "error",
			"no-return-await": "off",
			"no-self-compare": "warn",
			"no-sequences": "error",
			"no-trailing-spaces": ["warn", {
				skipBlankLines: true
			}],
			"no-underscore-dangle": "off",
			"no-unneeded-ternary": "warn",
			"no-unused-vars": "off",
			"@typescript-eslint/no-unused-vars": "warn",
			"no-useless-computed-key": "warn",
			"no-useless-constructor": "warn",
			"no-useless-rename": "error",
			"no-var": "error",
			"no-whitespace-before-property": "warn",
			"no-with": "error",
			"object-curly-newline": ["warn", {
				consistent: true
			}],
			"object-curly-spacing": ["warn", "always", {
				arraysInObjects: false,
				objectsInObjects: true
			}],
			"object-property-newline": ["warn", {
				allowAllPropertiesOnSameLine: true
			}],
			"object-shorthand": ["warn", "properties"],
			"one-var": ["warn", "never"],
			"operator-linebreak": ["warn", "before"],
			"padded-blocks": ["warn", "never"],
			"prefer-arrow-callback": "warn",
			"prefer-const": ["warn", {
				destructuring: "all"
			}],
			"prefer-exponentiation-operator": "warn",
			"prefer-numeric-literals": "warn",
			"prefer-object-spread": "warn",
			"prefer-rest-params": "error",
			"prefer-template": "warn",
			"quote-props": ["warn", "as-needed"],
			quotes: ["warn", "double", {
				allowTemplateLiterals: true
			}],
			"rest-spread-spacing": ["warn", "never"],
			semi: ["warn", "always"],
			"semi-spacing": ["warn", {
				before: false,
				after: true
			}],
			"semi-style": ["warn", "last"],
			"sort-keys": ["off", "asc"],
			"space-before-blocks": ["warn", "always"],
			"space-before-function-paren": ["warn", "always"],
			"space-in-parens": ["warn", "never"],
			"space-infix-ops": "error",
			"space-unary-ops": "warn",
			"spaced-comment": ["warn", "always"],
			"switch-colon-spacing": ["warn", {
				after: true,
				before: false
			}],
			"symbol-description": "off",
			"template-curly-spacing": ["warn", "never"],
			"template-tag-spacing": ["warn", "always"],
			"unicorn/catch-error-name": ["warn", {
				name: "e"
			}],
			"unicorn/empty-brace-spaces": "warn",
			"unicorn/new-for-builtins": "error",
			"unicorn/no-array-for-each": "error",
			"unicorn/no-array-push-push": "warn",
			"unicorn/no-console-spaces": "warn",
			"unicorn/no-lonely-if": "warn",
			"unicorn/no-instanceof-array": "error",
			"unicorn/no-nested-ternary": "warn",
			"unicorn/no-new-buffer": "error",
			"unicorn/no-unreadable-array-destructuring": "error",
			"unicorn/no-unsafe-regex": "off",
			"unicorn/number-literal-case": "warn",
			"unicorn/numeric-separators-style": ["warn", {
				onlyIfContainsSeparator: true
			}],
			"unicorn/prefer-array-find": "warn",
			"unicorn/prefer-array-flat": "warn",
			"unicorn/prefer-array-flat-map": "warn",
			"unicorn/prefer-array-index-of": "warn",
			"unicorn/prefer-array-some": "warn",
			"unicorn/prefer-regexp-test": "warn",
			"unicorn/prefer-date-now": "warn",
			"unicorn/prefer-includes": "warn",
			"unicorn/prefer-math-trunc": "warn",
			"unicorn/prefer-string-starts-ends-with": "warn",
			"unicorn/prefer-string-trim-start-end": "warn",
			"unicorn/throw-new-error": "error",
			"wrap-iife": ["warn", "inside"],
			yoda: "error"
		}
	}
);
