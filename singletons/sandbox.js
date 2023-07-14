const IVM = require("isolated-vm");
const defaultTimeout = 5000;

/**
 * Sandbox module, created with the aim of running custom user input as safely as possible.
 */
module.exports = class SandboxSingleton extends require("./template.js") {
	#isolate;

	/**
	 * @inheritDoc
	 * @returns {SandboxSingleton}
	 */
	static singleton () {
		if (!SandboxSingleton.module) {
			SandboxSingleton.module = new SandboxSingleton();
		}

		return SandboxSingleton.module;
	}

	constructor () {
		super();
		this.#isolate = new IVM.Isolate({ memoryLimit: 16 });
	}

	/**
	 * Runs given script inside of a provided secure VM
	 * @param {string} code
	 * @param {Object} sandbox = {}
	 * @param {Object} options = {}
	 * @returns {*}
	 */
	async run (code, sandbox = {}, options = {}) {
		const context = this.#isolate.createContext({ inspector: false });
		const jail = context.global;

		jail.setSync("global", jail.derefInto());

		for (const [key, value] of Object.entries(sandbox)) {
			jail.setSync(key, value);
		}

		const script = await this.#isolate.compileScript(code);
		return await script.run(context, {
			timeout: options.timeout ?? defaultTimeout
		});
	}

	get modulePath () { return "sandbox"; }
};
