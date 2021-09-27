module.exports = class NotImplementedError extends sb.Error {
	constructor (object = {}) {
		super({
			name: "NotImplemented",
			message: object.message ?? "Not implemented"
		});
	}

	static get name () { return "NotImplemented"; }
};
