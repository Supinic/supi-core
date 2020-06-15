/* global sb */
const mandatoryConfigs = [
	"LOCAL_IP",
	"LOCAL_PLAY_SOUNDS_PORT"
];

module.exports = (function (Module) {
	"use strict";

	/**
	 * @todo description
	 * @name sb.LocalRequest
	 * @type LocalRequest()
	 */
	return class LocalRequest extends Module {
		/**
		 * @inheritDoc
		 * @returns {LocalRequest}
		 */
		static async singleton () {
			if (!LocalRequest.module) {
				const missingConfigs = mandatoryConfigs.filter(key => !sb.Config.has(key));
				if (missingConfigs.length !== 0) {
					console.debug("Missing LocalRequest config(s), module creation skipped", { missingConfigs });
					LocalRequest.module = {};
				}
				else {
					LocalRequest.module = new LocalRequest();
				}
			}

			return LocalRequest.module;
		}

		constructor () {
			super();
			this.url = sb.Config.get("LOCAL_IP") + ":" + sb.Config.get("LOCAL_PLAY_SOUNDS_PORT");
		}

		/**
		 * Sends a request to play a playsound locally.
		 * @param name
		 * @returns {Promise<boolean>}
		 * Returns boolean, if a request was sent - true, if the sound was played; false, if there was an error.
		 */
		async playAudio (name) {
			const result = await sb.Got(this.url + "/?audio=" + name);
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

			const result = await sb.Got(this.url + "/?" + params.toString()).text();
			return (result === "true");
		}

		async checkTextToSpeech () {
			const result = await sb.Got(this.url + "/?ttsCheck=true");

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

			const result = await sb.Got(this.url + "/?" + params.toString()).text();
			return (result === "true");
		}

		get modulePath () { return "local-request"; }

		destroy () { }
	};
});