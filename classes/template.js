module.exports = class ClassTemplate {
	static importable = false;

	static uniqueIdentifier;

	destroy () {}

	async serialize (row, properties, options) {
		const result = Object.entries(properties).map(([key, params]) => {
			const prop = row.values[key];
			if (typeof prop === "undefined") {
				throw new sb.Error({
					message: "Undefined value detected for serialized object",
					args: { key, params, name: this.name, ID: row.values.ID }
				});
			}
			else if (prop === null) {
				return `\t${key}: ${prop}`;
			}

			let value = prop;
			if (params.type === "json") {
				value = JSON.stringify(prop);
			}
			else if (typeof prop === "string") {
				value = prop.split(/\r?\n/).map((j, ind) => (ind === 0) ? j : `\t${j}`).join("\n");
			}

			if (value !== null && params.type === "string") {
				return `\t${key}: ${JSON.stringify(value)}`;
			}
			else {
				return `\t${key}: ${value}`;
			}
		}).join(",\n");

		const string = `module.exports = {\n${result}\n};`;
		if (options.filePath) {
			const fs = require("fs").promises;
			if (!options.overwrite) {
				let exists;
				try {
					await fs.access(options.filePath);
					exists = true;
				}
				catch {
					exists = false;
				}

				if (exists) {
					throw new sb.Error({
						message: "Cannot overwrite an existing file without the options.overwrite flag set"
					});
				}
			}

			await fs.writeFile(options.filePath, string);
		}

		return { string };
	}

	async getCacheData (key) {
		if (typeof key === "string") {
			key = { type: key };
		}

		return sb.Cache.getByPrefix(this.getCacheKey(), {
			keys: { ...key }
		});
	}

	async setCacheData (key, value, options = {}) {
		if (typeof value === "undefined") {
			throw new sb.Error({
				message: "Value must be passed to cache"
			});
		}

		if (typeof key === "string") {
			key = { type: key };
		}

		return sb.Cache.setByPrefix(this.getCacheKey(), value, {
			keys: { ...key },
			...options
		});
	}

	async saveRowProperty (row, property, value, self) {
		if (!sb.Query.isRow(row)) {
			throw new sb.Error({
				message: "First argument must be an instance of Row",
				args: {
					type: row?.constructor?.name ?? typeof row
				}
			});
		}
		else if (!row.hasProperty(property)) {
			throw new sb.Error({
				message: "Row does not have provided property",
				args: {
					property,
					properties: Object.keys(row.valuesObject)
				}
			});
		}
		else if (!row.loaded) {
			throw new sb.Error({
				message: "Row must be loaded before any properties can be saved"
			});
		}

		if (typeof value !== "undefined") {
			self[property] = value;
		}
		else {
			value = self[property];
		}

		if (value?.constructor === Object) {
			value = JSON.stringify(value);
		}

		row.values[property] = value;
		await row.save();
	}

	async getGenericDataProperty (inputData = {}) {
		const {
			cacheMap,
			databaseProperty,
			databaseTable,
			instance,
			options,
			propertyName,
			object
		} = inputData;

		const cache = cacheMap.get(instance);
		if (cache && cache.has(propertyName) && !options.forceCacheReload) {
			return cache.get(propertyName);
		}

		const { transaction = null } = options;
		const data = await sb.Query.getRecordset(
			rs => rs
				.select("Property", "Value")
				.select("Custom_Data_Property.Type AS Type", "Custom_Data_Property.Cached AS Cached")
				.from("chat_data", databaseTable)
				.leftJoin({
					toTable: "Custom_Data_Property",
					on: `Custom_Data_Property.Name = ${databaseTable}.Property`
				})
				.where(`${databaseProperty} = %n`, this.ID)
				.where("Property = %s", propertyName)
				.where({ condition: Boolean(object) }, "Target %*like*", object)
				.limit(1)
				.single(),
			{ transaction }
		);

		if (!data) {
			return undefined;
		}
		else if (!data.Type) {
			throw new sb.Error({
				message: "No type is associated with this variable",
				args: { options, property: propertyName }
			});
		}

		const variable = new sb.Config({
			Name: propertyName,
			Value: data.Value,
			Type: data.Type
		});

		if (data.Cached) {
			if (!cacheMap.has(instance)) {
				cacheMap.set(instance, new Map());
			}

			const userCache = cacheMap.get(instance);
			userCache.set(propertyName, variable.value);
		}

		return variable.value;
	}

	async setGenericDataProperty (inputData = {}) {
		const {
			cacheMap,
			databaseProperty,
			databaseTable,
			propertyName,
			options,
			instance,
			object,
			value
		} = inputData;

		const { transaction = null } = options;
		const propertyData = await sb.Query.getRecordset(
			rs => rs
				.select("Type", "Cached")
				.from("chat_data", "Custom_Data_Property")
				.where("Name = %s", propertyName)
				.where({ condition: Boolean(object) }, "Target %*like*", object)
				.limit(1)
				.single(),
			{ transaction }
		);

		if (!propertyData.Type) {
			throw new sb.Error({
				message: "Data property has no type associated with it",
				args: { options, propertyName, propertyData }
			});
		}

		const row = await sb.Query.getRow("chat_data", databaseTable, { transaction });
		await row.load({
			[databaseProperty]: this.ID,
			Property: propertyName
		}, true);

		if (!row.loaded) {
			row.setValues({
				[databaseProperty]: this.ID,
				Property: propertyName
			});
		}

		if (value === null) {
			row.values.Value = null;
		}
		else {
			const variable = sb.Config.from({
				name: propertyName,
				type: propertyData.Type,
				value
			});

			row.values.Value = variable.stringValue;
		}

		if (propertyData.Cached) {
			if (!cacheMap.has(instance)) {
				cacheMap.set(instance, new Map());
			}

			const instanceCache = cacheMap.get(instance);
			instanceCache.set(propertyName, value);
		}

		await row.save({ skipLoad: true });
	}

	static data = [];

	static async initialize () {
		await this.loadData();
		return this;
	}

	static async loadData () {
		throw new sb.Error({
			message: "loadData method must be implemented in module",
			args: {
				name: this.name
			}
		});
	}

	static async reloadData () {
		this.data = [];
		await this.loadData();
	}

	static importData (definitions) {
		if (!this.importable) {
			throw new sb.Error({
				message: "This class does not support importing definitions"
			});
		}

		if (this.data && this.data.length !== 0) {
			for (const instance of this.data) {
				instance.destroy();
			}

			this.data = [];
		}

		this.data = definitions.map(definition => new this(definition));
	}

	// Overridden in derived classes
	// eslint-disable-next-line no-unused-vars
	static importSpecific (...definitions) {
		throw new sb.Error({
			message: "This method must be implemented by derived classes"
		});
	}

	static genericImportSpecific (...definitions) {
		if (!this.importable) {
			throw new sb.Error({
				message: "This class does not support importing definitions"
			});
		}

		if (definitions.length === 0) {
			return [];
		}

		const addedInstances = [];
		for (const definition of definitions) {
			const previousInstance = this.get(definition[this.uniqueIdentifier]);
			if (previousInstance) {
				const index = this.data.indexOf(previousInstance);
				this.data.splice(index, 1);
				previousInstance.destroy();
			}

			const currentInstance = new this(definition);
			this.data.push(currentInstance);
			addedInstances.push(currentInstance);
		}

		return addedInstances;
	}

	static genericInvalidateRequireCache (options) {
		const {
			names,
			extraDeletionCallback,
			requireBasePath
		} = options;

		const failed = [];
		const succeeded = [];
		for (const inputName of names) {
			let instanceName;
			try {
				const instance = this.get(inputName);
				instanceName = instance?.[this.uniqueIdentifier] ?? inputName;
			}
			catch {
				instanceName = inputName;
			}

			let path;
			try {
				path = require.resolve(`${requireBasePath}/${instanceName}`);
				delete require.cache[path];

				if (typeof extraDeletionCallback === "function") {
					const files = extraDeletionCallback(path);
					if (Array.isArray(files) && files.every(i => typeof i === "string")) {
						for (const filePath of files) {
							delete require.cache[filePath];
						}
					}
				}

				succeeded.push(instanceName);
			}
			catch {
				failed.push(instanceName);
			}
		}

		return { failed, succeeded };
	}

	/**
	 * Determines whether a child class has its own implementation of `reloadSpecific`
	 * @returns {boolean}
	 */
	static hasReloadSpecific () {
		return (this.reloadSpecific !== ClassTemplate.reloadSpecific);
	}

	static async get () {
		throw new sb.Error({
			message: "get method must be implemented in module"
		});
	}

	/**
	 * Cleans up the module.
	 */
	static destroy () {
		this.data = null;
	}
};
