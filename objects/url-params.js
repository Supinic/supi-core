/**
 * Class to handle URL params, basically an extension of Map.
 * @memberof sb
 */
module.exports = class URLParams {
	#char = "+";
	#values = [];

	constructor (joinCharacter = "+") {
		this.#char = joinCharacter;
	}

	set (key, value) {
		this.#values.push([key, value]);
		return this;
	}

	unset (keyToUnset) {
		this.#values = this.#values.filter(([key]) => key !== keyToUnset);
		return this;
	}

	clear () {
		this.#values = [];
		return this;
	}

	has (keyToCheck) {
		return this.#values.some(([key]) => key === keyToCheck);
	}

	toString () {
		const values = this.#values.map(([key, value]) => {
			const encoded = String.value(value)
				.split(" ")
				.map(i => encodeURIComponent(i))
				.join(this.#char);

			return `${key}=${encoded}`;
		});

		return values.join("&");
	}

	clone () {
		const clone = new URLParams(this.#char);
		for (const [key, value] of this.#values) {
			clone.set(key, value);
		}

		return clone;
	}

	[Symbol.toPrimitive] (hint) {
		if (hint === "number") {
			throw new Error("Cannot convert URLParams to number");
		}
		else {
			return this.toString();
		}
	}

	valueOf () {
		return this.toString();
	}

	toJSON () {
		return JSON.stringify(this.#values);
	}
};
