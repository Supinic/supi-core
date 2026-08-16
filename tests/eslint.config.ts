import { defineConfig, type Config } from "eslint/config";
import baseConfig from "../eslint.config.js";

const config: Config[] = defineConfig(
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

export default config;
