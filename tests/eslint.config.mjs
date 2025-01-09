import tseslint from "typescript-eslint";
import baseConfig from "../eslint.config.mjs";

export default tseslint.config(
	baseConfig,
	{
		ignores: ["**/*.js"]
	},
	{
		rules: {
			"max-nested-callbacks": "off",
			"max-statements-per-line": "off",
			"@typescript-eslint/no-unsafe-assignment": "off",
			"@typescript-eslint/no-unsafe-call": "off",
			"@typescript-eslint/no-unsafe-member-access": "off"
		}
	}
);
