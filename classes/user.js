/**
 * Represents a chat user.
 * Since there can be hundreds of thousands of users loaded, a class is used to simplify the prototype, and potentially save some memory and/or processing power with V8.
 */
module.exports = class User extends require("./template.js") {
	static mapCacheExpiration = 300_000;
	static redisCacheExpiration = 3_600_000;
	static mapExpirationInterval = setInterval(() => User.data.clear(), User.mapCacheExpiration);

	static pendingNewUsers = new Set();
	static data = new Map();
	static bots = new Map();

	static permissions = {
		regular: 0b0000_0001,
		ambassador: 0b0000_0010,
		channelOwner: 0b0000_0100,
		administrator: 0b1000_0000
	};

	/** @type {WeakMap<User, Map<string, *>>} */
	static dataCache = new WeakMap();

	constructor (data) {
		super();

		/**
		 * Unique numeric ID.
		 * @type {number}
		 */
		this.ID = data.ID;

		/**
		 * Unique Discord identifier.
		 * Only verified users (non-null Discord ID value) can use the bot on Discord.
		 * @type {number}
		 */
		this.Discord_ID = data.Discord_ID;

		/**
		 * Unique Twitch identifier.
		 * @type {number}
		 */
		this.Twitch_ID = data.Twitch_ID;

		/**
		 * Unique name.
		 * @type {string}
		 */
		this.Name = data.Name;

		/**
		 * Date of first sighting.
		 * @type {sb.Date}
		 */
		this.Started_Using = (data.Started_Using instanceof sb.Date)
			? data.Started_Using
			: new sb.Date(data.Started_Using);

		/**
		 * Extra data given to each user.
		 * @type {Object}
		 */
		if (!data.Data) {
			this.Data = {};
		}
		else if (typeof data.Data === "string") {
			try {
				this.Data = JSON.parse(data.Data);
			}
			catch (e) {
				console.warn("User.Data parse error", { error: e, user: this, data });
				this.Data = {};
			}
		}
		else if (typeof data.Data === "object") {
			this.Data = { ...data.Data };
		}
		else {
			console.warn("User.Data invalid type", { user: this, data });
			this.Data = {};
		}
	}

	getCacheKey () {
		return `sb-user-${this.Name}`;
	}

	/**
	 * Pushes a property change to the database.
	 * @param {string} property
	 * @param {*} value
	 * @returns {Promise<void>}
	 */
	async saveProperty (property, value) {
		const row = await sb.Query.getRow("chat_data", "User_Alias");
		await row.load(this.ID);

		await super.saveRowProperty(row, property, value, this);

		await User.invalidateUserCache(this);
		await User.populateCaches(this);
	}

	/**
	 * Fetches a user data propertyName from the database.
	 * @param {string} propertyName
	 * @param {Object} options
	 * @param {boolean} [options.forceCacheReload] if the property is cached, setting this to true will force its reload
	 * @returns {Promise<undefined|null|*>}
	 * - Returns `undefined` if propertyName doesn't exist
	 * - Returns `null` or any respective primitive/objec/function value as determined by the saved value
	 */
	async getDataProperty (propertyName, options = {}) {
		const cache = User.dataCache.get(this);
		if (cache && cache.has(propertyName) && !options.forceCacheReload) {
			return cache.get(propertyName);
		}

		const data = await sb.Query.getRecordset(rs => rs
			.select("Property", "Value")
			.select("Custom_Data_Property.Type AS Type", "Custom_Data_Property.Cached AS Cached")
			.from("chat_data", "User_Alias_Data")
			.leftJoin({
				toTable: "Custom_Data_Property",
				on: "Custom_Data_Property.Name = User_Alias_Data.Property"
			})
			.where("User_Alias = %n", this.ID)
			.where("Property = %s", propertyName)
			.limit(1)
			.single()
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
			if (!User.dataCache.has(this)) {
				User.dataCache.set(this, new Map());
			}

			const userCache = User.dataCache.get(this);
			userCache.set(propertyName, variable.value);
		}

		return variable.value;
	}

	/**
	 * Saves a user data property into the database.
	 * @param {string} propertyName
	 * @param {*} value
	 * @param {Object} options
	 * @returns {Promise<void>}
	 */
	async setDataProperty (propertyName, value, options = {}) {
		const propertyData = await sb.Query.getRecordset(rs => rs
			.select("Type", "Cached")
			.from("chat_data", "Custom_Data_Property")
			.where("Name = %s", propertyName)
			.limit(1)
			.single()
		);

		if (!propertyData.Type) {
			throw new sb.Error({
				message: "Data property has no type associated with it",
				args: { options, propertyName, propertyData }
			});
		}

		const row = await sb.Query.getRow("chat_data", "User_Alias_Data");
		await row.load({
			User_Alias: this.ID,
			Property: propertyName
		}, true);

		if (!row.loaded) {
			row.setValues({
				User_Alias: this.ID,
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
			if (!User.dataCache.has(this)) {
				User.dataCache.set(this, new Map());
			}

			const userCache = User.dataCache.get(this);
			userCache.set(propertyName, value);
		}

		await row.save({ skipLoad: true });
	}

	async serialize () {
		throw new sb.Error({
			message: "Module User cannot be serialized"
		});
	}

	/** @override */
	static async initialize () {
		User.bots = new Map();
		User.data = new Map();
		User.pendingNewUsers = new Set();

		User.insertBatch = await sb.Query.getBatch(
			"chat_data",
			"User_Alias",
			["Name", "Discord_ID", "Twitch_ID"]
		);

		User.insertCron = new sb.Cron({
			Name: "log-user-cron",
			Expression: sb.Config.get("LOG_USER_CRON"),
			Code: async () => {
				await User.insertBatch.insert({ ignore: true });
				User.pendingNewUsers.clear();
			}
		});
		User.insertCron.start();

		await User.loadData();
		return User;
	}

	static async loadData () {
		/** @type {Map<string, User>} */
		User.data = User.data || new Map();

		const botDataExist = await sb.Query.isTablePresent("bot_data", "Bot");
		if (botDataExist) {
			const botData = await sb.Query.getRecordset(rs => rs
				.select("Prefix", "Last_Verified", "Author", "Language")
				.select("User_Alias.ID AS ID", "User_Alias.Name AS Name")
				.from("bot_data", "Bot")
				.join({
					toDatabase: "chat_data",
					toTable: "User_Alias",
					on: "Bot.Bot_Alias = User_Alias.ID"
				})
			);

			for (const bot of botData) {
				User.bots.set(bot.ID, bot);
			}
		}
	}

	static async reloadData () {
		User.bots.clear();
		User.data.clear();
		await User.loadData();
	}

	/**
	 * Searches for a user, based on their ID, or Name.
	 * Returns immediately if identifier is already a User.
	 * @param {User|number|string} identifier
	 * @param {boolean} strict If false and searching for user via string, and it is not found, creates a new User.
	 * @param {Object} [options]
	 * @returns {User|void}
	 * @throws {sb.Error} If the type of identifier is unrecognized
	 */
	static async get (identifier, strict = true, options = {}) {
		if (identifier instanceof User) {
			return identifier;
		}
		else if (typeof identifier === "number") {
			const mapCacheUser = User.getByProperty("ID", identifier);
			if (mapCacheUser) {
				return mapCacheUser;
			}

			const name = await sb.Query.getRecordset(rs => rs
				.select("Name")
				.from("chat_data", "User_Alias")
				.where("ID = %n", identifier)
				.single()
				.flat("Name")
			);
			if (!name) {
				return null;
			}

			return User.get(name, strict, options);
		}
		else if (typeof identifier === "string") {
			const username = User.normalizeUsername(identifier);

			// 1. attempt to fetch the user from low-cache (User.data)
			const mapCacheUser = User.data.get(username);
			if (mapCacheUser) {
				return mapCacheUser;
			}

			// 2. attempt to fetch the user from medium-cache (sb.Cache)
			if (sb.Cache && sb.Cache.active) {
				const redisCacheUser = await User.createFromCache({ name: username });
				if (redisCacheUser) {
					if (!User.data.has(username)) {
						User.data.set(username, redisCacheUser);
					}

					return redisCacheUser;
				}
			}

			// 3. attempt to get the user out of the database
			const dbUserData = await sb.Query.getRecordset(rs => rs
				.select("*")
				.from("chat_data", "User_Alias")
				.where("Name = %s", username)
				.single()
			);

			if (dbUserData) {
				const user = new User(dbUserData);
				await User.populateCaches(user);

				return user;
			}
			else {
				// 4. Create the user, if strict mode is off
				if (!strict && !User.pendingNewUsers.has(username)) {
					User.pendingNewUsers.add(username);
					User.insertBatch.add({
						Name: username,
						Discord_ID: options.Discord_ID ?? null,
						Twitch_ID: options.Twitch_ID ?? null
					});

					// Returns null, which should usually abort working with user's message.
					// We lose a couple of messages from a brand new user, but this is an acceptable measure
					// in order to reduce the amount of user-insert db connections.
					return null;
				}

				// No cache hits, user does not exist - return null
				return null;
			}
		}
		else {
			throw new sb.Error({
				message: "Invalid user identifier type",
				args: { id: identifier, type: typeof identifier }
			});
		}
	}

	/**
	 * Fetches a batch of users together.
	 * Takes existing records from cache, the rest is pulled from dataase.
	 * Does not support creating new records like `get()` does.
	 * @param {Array<User|string|number>} identifiers
	 * @returns {Promise<User[]>}
	 */
	static async getMultiple (identifiers) {
		const result = [];
		const toFetch = [];
		let userMapValues;

		for (const identifier of identifiers) {
			if (identifier instanceof User) {
				result.push(identifier);
			}
			else if (typeof identifier === "number") {
				if (!userMapValues) {
					userMapValues = [...User.data.values()];
				}

				const mapCacheUser = userMapValues.find(i => i.ID === identifier);
				if (mapCacheUser) {
					result.push(mapCacheUser);
				}
				else {
					toFetch.push(identifier);
				}
			}
			else if (typeof identifier === "string") {
				const username = User.normalizeUsername(identifier);
				const mapCacheUser = User.data.get(username);
				if (mapCacheUser) {
					result.push(mapCacheUser);
					continue;
				}

				if (sb.Cache && sb.Cache.active) {
					const redisCacheUser = await User.createFromCache({ name: username });
					if (redisCacheUser) {
						User.data.set(username, redisCacheUser);
						result.push(redisCacheUser);
						continue;
					}
				}

				toFetch.push(username);
			}
			else {
				throw new sb.Error({
					message: "Invalid user identifier type",
					args: { id: identifier, type: typeof identifier }
				});
			}
		}

		if (toFetch.length > 0) {
			const [strings, numbers] = sb.Utils.splitByCondition(toFetch, i => typeof i === "string");
			const fetched = await sb.Query.getRecordset(rs => {
				rs.select("*").from("chat_data", "User_Alias");
				if (strings.length > 0 && numbers.length > 0) {
					rs.where("Name IN %s+ OR ID IN %n+", strings, numbers);
				}
				else if (strings.length > 0) {
					rs.where("Name IN %s+", strings);
				}
				else if (numbers.length > 0) {
					rs.where("ID IN %n+", numbers);
				}
			});

			const cachePromises = [];
			for (const rawUserData of fetched) {
				const userData = new User(rawUserData);
				result.push(userData);
				cachePromises.push(User.populateCaches(userData));
			}

			await Promise.all(cachePromises);
		}

		return result;
	}

	/**
	 * Synchronously fetches a user based on their numeric ID.
	 * No other types of ID are supported.
	 * @deprecated
	 * @param {string} property
	 * @param {number} identifier
	 * @returns {User|void}
	 */
	static getByProperty (property, identifier) {
		const iterator = User.data.values();
		let user = undefined;
		let value = iterator.next().value;

		while (!user && value) {
			if (value[property] === identifier) {
				user = value;
			}
			value = iterator.next().value;
		}

		return user;
	}

	/**
	 * Normalizes non-standard strings into standard usernames.
	 * Turns input string into lowercase.
	 * Removes leading `@`, leading `#`, and trailing `:` symbols.
	 * Replaces all consecutive whitespace with a single `_` symbol.
	 * @param {string} username
	 * @returns {string}
	 */
	static normalizeUsername (username) {
		return username
			.toLowerCase()
			.replace(/^@/, "")
			.replace(/^#/, "")
			.replace(/:$/g, "")
			.replace(/\s+/g, "_");
	}

	/**
	 * Adds a new user to the database.
	 * @param {string} name
	 * @returns {Promise<User>}
	 */
	static async add (name) {
		const preparedName = User.normalizeUsername(name);
		const exists = await sb.Query.getRecordset(rs => rs
			.select("Name")
			.from("chat_data", "User_Alias")
			.where("Name = %s", preparedName)
			.limit(1)
			.single()
		);

		if (exists) {
			return await User.get(exists.Name);
		}

		const row = await sb.Query.getRow("chat_data", "User_Alias");
		row.values.Name = preparedName;
		await row.save();

		const user = new User(row.valuesObject);
		await User.populateCaches(user);

		return user;
	}

	static async populateCaches (user) {
		if (!User.data.has(user.Name)) {
			User.data.set(user.Name, user);
		}

		if (sb.Cache && sb.Cache.active) {
			await sb.Cache.setByPrefix(user.getCacheKey(), user, {
				expiry: User.redisCacheExpiration
			});
		}
	}

	static async createFromCache (options) {
		if (!sb.Cache) {
			throw new sb.Error({
				message: "Cache module is unavailable"
			});
		}

		const key = User.createCacheKey(options);
		const cacheData = await sb.Cache.getByPrefix(key);
		if (!cacheData) {
			return null;
		}

		return new User(cacheData);
	}

	static async invalidateUserCache (identifier) {
		if (identifier instanceof User) {
			User.data.delete(identifier.Name);
			await sb.Cache.delete(identifier);
		}
		else if (typeof identifier === "string") {
			User.data.delete(identifier);

			const cacheKey = User.createCacheKey({ name: identifier });
			await sb.Cache.delete(cacheKey);
		}
		else {
			throw new sb.Error({
				message: "Invalid user identifier provided",
				args: { identifier }
			});
		}
	}

	static createCacheKey (options = {}) {
		const name = options.name ?? options.Name;
		if (typeof name !== "string") {
			throw new sb.Error({
				message: "User name for Cache must be a string",
				args: options
			});
		}

		return `sb-user-${name}`;
	}

	/**
	 * Cleans up.
	 */
	static destroy () {
		User.insertCron.destroy();
		User.data.clear();
	}
};

/**
 * @typedef {"admin"|"owner"|"ambassador"} UserPermissionLevel
 */
