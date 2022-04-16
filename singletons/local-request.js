const sb = globalThis._namespace;
const mandatoryConfigs = [
	"LOCAL_IP",
	"LOCAL_PLAY_SOUNDS_PORT"
];

/**
 * This module connects the different major supi-core requiring processes together via HTTP.
 */
module.exports = class LocalRequestSingleton extends require("./template.js") {
	static singleton () {
		if (!LocalRequestSingleton.module) {
			const missingConfigs = mandatoryConfigs.filter(key => !sb.Config.has(key));
			if (missingConfigs.length !== 0) {
				console.debug("Missing LocalRequest config(s), module creation skipped", { missingConfigs });
				LocalRequestSingleton.module = {};
			}
			else {
				LocalRequestSingleton.module = new LocalRequestSingleton();
			}
		}

		return LocalRequestSingleton.module;
	}

	constructor () {
		super();
		this.url = `${sb.Config.get("LOCAL_IP")}:${sb.Config.get("LOCAL_PLAY_SOUNDS_PORT")}`;
	}

	/**
	 * Sends a request to play a playsound locally.
	 * @param name
	 * @returns {Promise<boolean>}
	 * Returns boolean, if a request was sent - true, if the sound was played; false, if there was an error.
	 */
	async playAudio (name) {
		const result = await sb.Got(`${this.url}/?audio=${name}`).text();
		return (result === "OK");
	}

	async playSpecialAudio (options = {}) {
		const params = new sb.URLParams()
			.set("specialAudio", "1")
			.set("url", options.url);

		if (options.volume) {
			params.set("volume", options.volume);
		}
		if (options.limit) {
			params.set("limit", options.limit);
		}

		const result = await sb.Got(`${this.url}/?${params.toString()}`).text();
		return (result === "true");
	}

	async checkTextToSpeech () {
		const result = await sb.Got(`${this.url}/?ttsCheck=true`);

		return (result === "true");
	}

	async playTextToSpeech (options) {
		const params = new sb.URLParams().set("tts", JSON.stringify(options.tts));

		if (options.volume) {
			params.set("volume", options.volume);
		}
		if (options.limit) {
			params.set("limit", options.limit);
		}

		const result = await sb.Got(`${this.url}/?${params.toString()}`).text();
		return (result === "true");
	}

	get modulePath () { return "local-request"; }

	destroy () {}
};
