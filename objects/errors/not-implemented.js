module.exports = class NotImplementedError extends sb.Error {
	constructor (object) {
		super(object);
		this.type = "NotImplemented";
	}

	static get name () { return "NotImplemented"; }
};