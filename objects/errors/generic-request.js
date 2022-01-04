module.exports = class GenericRequestError extends sb.Error {
	constructor (object = {}) {
		super({
			message: object.message,
			name: "GenericRequestError",
			args: {
				...(object.args ?? {}),
				statusCode: object.statusCode ?? null,
				statusMessage: object.statusMessage ?? null,
				hostname: object.hostname ?? null
			}
		});
	}

	static get name () { return "GenericRequestError"; }
};
