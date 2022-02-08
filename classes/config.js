const VALID_BOOLEAN_LIKE_VALUES = ["0", "1", "true", "false"];

/**
 * Represents configuration variables saved in the database.
 */
module.exports = class Config extends require("./template.js") {
	#Name;
	#Value;
	#Type;
	#Unit;
	#Secret;
	#Editable;

	#initialized = false;

	static data = new Map();
	static nonStrictNotifications = new Map();

	constructor (data) {
		super();

		this.#Name = data.Name;
		this.#Type = data.Type;
		this.#Unit = data.Unit;
		this.#Secret = Boolean(data.Secret);
		this.#Editable = Boolean(data.Editable);

		this.value = data.Value;
		this.#initialized = true;
	}

	async serialize () {
		if (this.#Secret) {
			throw new sb.Error({
				message: "Secret configs cannot be serialized"
			});
		}

		throw new sb.Error({
			message: "Not yet implemented"
		});
	}

	get name () { return this.#Name; }
	get editable () { return this.#Editable; }

	get value () { return this.#Value; }
	set value (value) {
		if (!this.#Editable && this.#initialized) {
			throw new sb.Error({
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
						throw new sb.Error({
							message: "Cannot use pseudo-boolean values during runtime",
							args: { value, type: typeof value }
						});
					}

					this.#Value = (value === "1" || value === "true");
				}
				else {
					throw new sb.Error({
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
				this.#Value = new sb.Date(value);

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
				throw new sb.Error({
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

		throw new sb.Error({
			message: "Unrecognized config variable type",
			args: this.#Type
		});
	}

	static async initialize () {
		Config.data = new Map();
		await Config.loadData();
		return Config;
	}

	static async loadData () {
		const data = await sb.Query.getRecordset(rs => rs
			.select("*")
			.from("data", "Config")
		);

		for (const record of data) {
			const object = new Config(record);

			// If a value exists for the name, it will be overwritten.
			// Not the cleanest and clearest solution, but it works, and minimizes downtime of each Config.
			Config.data.set(record.Name, object);
		}
	}

	static async reloadData () {
		Config.nonStrictNotifications.clear();
		await Config.loadData();
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
					validType = (value instanceof Date || value instanceof sb.Date);
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
					throw new sb.Error({
						message: "Unrecognized variable type",
						args: { type }
					});
			}
		}

		if (!validType) {
			throw new sb.Error({
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

	/**
	 * Checks if given configuration variable exists.
	 * @param {string} variable Variable name
	 * @param {boolean} strict=true If true, the config variable must also not be null in addition to existing
	 * @returns {boolean}
	 */
	static has (variable, strict = true) {
		const target = Config.get(variable, false);

		return (strict)
			? (target !== null && target !== undefined)
			: (target !== undefined);
	}

	/**
	 * Fetches the given configuration variable
	 * @param {string} variable Variable name
	 * @param {boolean} strict=true If true, the config variable must exist, otherwise an error is thrown. If false,
	 * then undefined is return should the variable not exist.
	 * @returns {*}
	 * @throws {sb.Error} If variable does not exists
	 */
	static get (variable, strict = true) {
		const target = Config.data.get(variable);

		// Attempt to fall back to process.env - this is only going to be predictable, if the only variables set
		// to process.env are string. Since process.env cannot hold non-string values, the type will otherwise be lost.
		if (!target || !target.value) {
			const env = process.env[variable];
			if (env) {
				return env;
			}
		}

		if (!target) {
			if (strict) {
				throw new sb.Error({
					message: "Configuration variable does not exist",
					args: variable
				});
			}
			else {
				if (!Config.nonStrictNotifications.has(variable)) {
					Config.nonStrictNotifications.set(variable, true);
					console.debug("Non-strict Config.get", variable);
				}

				return undefined;
			}
		}

		return target.value;
	}

	/**
	 * Sets the configuration variable
	 * @param {string} variable Variable name
	 * @param {*} value New variable value
	 * @throws {sb.Error} If variable does not exist
	 * @throws {sb.Error} If variable is not editable
	 * @throws {sb.Error} If value type is incompatible with the variable type
	 */
	static async set (variable, value) {
		const target = Config.data.get(variable);
		if (!target) {
			throw new sb.Error({
				message: "Configuration variable does not exist", args: variable
			});
		}
		else if (!target.editable) {
			throw new sb.Error({
				message: "Configuration variable is not editable", args: variable
			});
		}

		target.value = value;

		await sb.Query.getRecordUpdater(rs => rs
			.update("data", "Config")
			.set("Value", target.stringValue)
			.where("Name = %s", variable)
		);
	}
};
