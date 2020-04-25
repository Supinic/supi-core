module.exports = class NotImplementedError extends sb.Error {
	constructor (object) {
		super({
			message: object?.message ?? "Not implemented"
		});

		this.type = "NotImplemented";
	}

	static get name () { return "NotImplemented"; }
};