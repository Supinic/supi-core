import SupiDate from "../objects/date.js";
import SupiError from "../objects/error.js";

const VALID_BOOLEAN_LIKE_VALUES = ["0", "1", "true", "false"];

export default class Config {
	#Name;
	#Value;
	#Type;
	#Editable;
	#initialized = false;

	static data = new Map();

	constructor (data) {
		this.#Name = data.Name;
		this.#Type = data.Type;
		this.#Editable = Boolean(data.Editable);

		this.value = data.Value;
		this.#initialized = true;
	}

	get name () { return this.#Name; }
	get editable () { return this.#Editable; }

	get value () { return this.#Value; }
	set value (value) {
		if (!this.#Editable && this.#initialized) {
			throw new SupiError({
				message: "Config variable is not editable"
			});
		}

		if (value === null) {
			this.#Value = null;
			return;
		}

		switch (this.#Type) {
			case "boolean":
				if (typeof value === "boolean") {
					this.#Value = value;
				}
				else if (VALID_BOOLEAN_LIKE_VALUES.includes(value)) {
					if (this.#initialized) {
						throw new SupiError({
							message: "Cannot use pseudo-boolean values during runtime",
							args: { value, type: typeof value }
						});
					}

					this.#Value = (value === "1" || value === "true");
				}
				else {
					throw new SupiError({
						message: "Unsupported Config boolean value",
						args: {
							value,
							type: typeof value,
							variable: this.Name
						}
					});
				}

				break;

			case "string":
				this.#Value = String(value);
				break;

			case "number":
				this.#Value = Number(value);
				break;

			case "date":
				this.#Value = new SupiDate(value);

				if (Number.isNaN(this.#Value.valueOf())) {
					console.warn(`Config variable ${this.#Name}: Invalid date value`);
				}

				break;

			case "regex":
				// Split to obtain flags - if none are present, none will be used
				try {
					this.#Value = new RegExp(...value.replace(/^\/|\/$/g, "")
						.split(/\/(?=[gmi])/)
						.filter(Boolean));
				}
				catch (e) {
					console.warn("Incorrect value for config regex", e);
					this.#Value = /.*/;
				}
				break;

			case "array":
			case "object":
				try {
					this.#Value = JSON.parse(value);
				}
				catch (e) {
					console.warn(`Object config variable has invalid definition`, { value, e });
					this.#Value = (this.#Type === "array") ? [] : {};
				}
				break;

			case "function":
				try {
					this.#Value = eval(value);
					if (typeof this.#Value !== "function") {
						console.warn(`Function config variable is not typeof function`, { value });
						this.#Value = () => undefined;
					}
				}
				catch (e) {
					console.warn(`Object config variable has invalid definition`, { value, e });
					this.#Value = () => undefined;
				}
				break;

			default:
				throw new SupiError({
					message: "Unrecognized config variable type", args: this.#Type
				});
		}
	}

	get stringValue () {
		switch (this.#Type) {
			case "boolean":
			case "function":
			case "number":
			case "regex":
			case "string":
				return String(this.#Value);

			case "date":
				return String(this.#Value.valueOf());

			case "array":
			case "object":
				return JSON.stringify(this.#Value);
		}

		throw new SupiError({
			message: "Unrecognized config variable type",
			args: this.#Type
		});
	}

	static async load (data, options = {}) {
		const loadedNames = new Set();

		for (const record of data) {
			const object = new Config(record);

			Config.data.set(record.Name, object);
			loadedNames.add(record.Name);
		}

		if (!options.keepNotLoaded) {
			for (const recordName of Config.data.keys()) {
				if (!loadedNames.has(recordName)) {
					Config.data.delete(recordName);
				}
			}
		}
	}

	static from (data = {}) {
		const { name, type, value } = data;

		let validType = false;
		if (value === null) {
			validType = true;
		}
		else {
			switch (type) {
				case "boolean":
				case "function":
				case "number":
				case "string": {
					validType = (typeof value === type);
					break;
				}

				case "date": {
					validType = (value instanceof Date || value instanceof SupiDate);
					break;
				}

				case "regex": {
					validType = (value instanceof RegExp);
					break;
				}

				case "array": {
					validType = (Array.isArray(value));
					break;
				}

				case "object": {
					validType = (value?.constructor?.name === "Object");
					break;
				}

				default:
					throw new SupiError({
						message: "Unrecognized variable type",
						args: { type }
					});
			}
		}

		if (!validType) {
			throw new SupiError({
				message: "Variable type mismatch",
				args: {
					name,
					type: {
						expected: type,
						typeof: typeof value,
						constructor: value?.constructor.name ?? "(N/A)"
					}
				}
			});
		}

		const variable = new Config({
			Name: name,
			Type: type,
			Value: null
		});

		variable.#Value = value;

		return variable;
	}

	static has (variable, strict = true) {
		const target = Config.get(variable, false);

		return (strict)
			? (target !== null && target !== undefined)
			: (target !== undefined);
	}

	static get (variable, strict = true) {
		const target = Config.data.get(variable);

		// Attempt to fall back to process.env - this is only going to be predictable, if the only variables set
		// to process.env are string. Since process.env cannot hold non-string values, the type will otherwise be lost.
		if (!target || !target.value) {
			const env = globalThis.process.env[variable];
			if (env) {
				return env;
			}
		}

		if (!target) {
			if (strict) {
				throw new SupiError({
					message: "Configuration variable does not exist",
					args: variable
				});
			}
			else {
				return undefined;
			}
		}

		return target.value;
	}

	static async set (variable, value, Query) {
		const target = Config.data.get(variable);
		if (!target) {
			throw new SupiError({
				message: "Configuration variable does not exist", args: variable
			});
		}
		else if (!target.editable) {
			throw new SupiError({
				message: "Configuration variable is not editable", args: variable
			});
		}

		target.value = value;

		await Query.getRecordUpdater(rs => rs
			.update("data", "Config")
			.set("Value", target.stringValue)
			.where("Name = %s", variable)
		);
	}
}
