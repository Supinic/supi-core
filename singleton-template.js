/** @interface */
module.exports = class TemplateModule {
	/**
	 * Cleans up the module.
	 * All sub-classes must implement this method.
	 * @abstract
	 */
	destroy () {
		throw new Error("Module.destroy is not implemented!");
	}

	/**
	 * File name of the module.
	 * All sub-classes must implement this getter.
	 * @abstract
	 */
	get modulePath () {
		throw new Error("get Module.modulePath is not implemented!");
	}
};