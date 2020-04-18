module.exports = class APIError extends sb.Error {
	constructor (object) {
		super(object);

		this.statusCode = object.statusCode ?? null;
		this.reason = object.reason ?? null;
		this.apiName = object.apiName ?? null;

		this.type = "API";
	}

	static get name () { return "APIError"; }
};