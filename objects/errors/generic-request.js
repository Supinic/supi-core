module.exports = class GenericRequestError extends sb.Error {
	constructor (object) {
		super(object);

		this.statusCode = object.statusCode ?? null;
		this.statusMessage = object.statusMessage ?? null;
		this.message = object.message ?? null;
		this.hostname = object.hostname ?? null;
		this.stack = object.stack ?? null;
	}

	static get name () { return "GenericRequestError"; }
};