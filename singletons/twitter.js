/* global sb */
const mandatoryConfigs = [
	"TWITTER_CONSUMER_KEY",
	"TWITTER_CONSUMER_SECRET",
	"TWITTER_ACCESS_TOKEN_KEY",
	"TWITTER_ACCESS_TOKEN_SECRET"
];

module.exports = (function (Module) {
	"use strict";

	return class Twitter extends Module {
		#client = null;
		#module = null;

		static singleton () {
			if (!Twitter.module) {
				const missingConfigs = mandatoryConfigs.filter(key => !sb.Config.has(key));
				if (missingConfigs.length !== 0) {
					console.debug("Missing Twitter config(s), module creation skipped", { missingConfigs });
					Twitter.module = {};
				}
				else {
					Twitter.module = new Twitter();
				}
			}
			return Twitter.module;
		}

		/**
		 * Fetches user tweets based on provided options.
		 * @param {Object} options
		 * @param {string} [options.username] The username as it appears in the @username Twitter syntax.
		 * @param {number} [options.userID] Internal Twitter user ID.
		 * @param {number} [options.count=1] If set, this is the limit of provided tweets in the reply.
		 * @param {boolean} [options.includeReplies=false] Whether or not to include tweet replies.
		 * @param {boolean} [options.includeRetweets=false] Whether or not to include native retweets.
		 * @param {boolean} [options.includeUser=false] Whether or not to include the user object in each tweet.
		 * @returns {Promise<Object>}
		 */
		async fetchTweets (options = {}) {
			if (!options.username && !options.userID) {
				throw new sb.Error({
					message: "No twitter user identifier provided (ID or name)"
				});
			}
			else if (options.username && options.userID) {
				throw new sb.Error({
					message: "Both types of twitter use identifiers provided"
				});
			}

			try {
				const data = await this.client.get("statuses/user_timeline", {
					screen_name: options.username ?? null,
					user_id: options.userID ?? null,
					count: options.count ?? 1,
					trim_user: !options.includeUser,
					exclude_replies: !options.includeReplies,
					include_rts: !options.includeRetweets
				});

				return {
					error: null,
					data
				};
			}
			catch (e) {
				return {
					error: e,
					data: null
				};
			}
		}

		get client () {
			if (!this.#client) {
				this.#client = new this.module({
					consumer_key: sb.Config.get("TWITTER_CONSUMER_KEY"),
					consumer_secret: sb.Config.get("TWITTER_CONSUMER_SECRET"),
					access_token_key: sb.Config.get("TWITTER_ACCESS_TOKEN_KEY"),
					access_token_secret: sb.Config.get("TWITTER_ACCESS_TOKEN_SECRET")
				});
			}

			return this.#client;
		}

		get module () {
			if (!this.#module) {
				this.#module = require("twitter-lite");
			}

			return this.#module;
		}

		get modulePath () { return "twitter"; }

		destroy () {
			this.#client = null;
		}
	};
});