/* global sb */
module.exports = (function (Module) {
	const http = require("http");
	const url = require("url");
	const mandatoryConfigs = [
		"INTERNAL_REQUEST_PORT_SITE",
		"INTERNAL_REQUEST_PORT_BOT"
	];

	return class InternalRequest extends Module {
		/**
		 * @inheritDoc
		 * @returns {InternalRequest}
		 */
		static async singleton() {
			if (!InternalRequest.module) {
				const missingConfigs = mandatoryConfigs.filter(key => !sb.Config.has(key));
				if (missingConfigs.length !== 0) {
					console.debug("Missing InternalRequest config(s), module creation skipped", { missingConfigs });
					InternalRequest.module = {};
				}
				else {
					InternalRequest.module = await new InternalRequest();
				}
			}

			return InternalRequest.module;
		}

		constructor () {
			super();

			this.data = {};
			this.pending = {};
			this.server = http.createServer((req, res) => {
				if (process.env.PROJECT_TYPE === "bot") {
					this.processBotRequest(req, res);
				}
				else {
					this.processSiteRequest(req, res);
				}
			});

			this.server.listen(sb.Config.get("INTERNAL_REQUEST_PORT_" + process.env.PROJECT_TYPE.toUpperCase()));
		}

		async processBotRequest (req, res) {
			const query = url.parse(req.url,true).query;

			if (query.type === "watch" && query.table === "Gachi") {
				const subs = this.subscriptions.filter(i => i.Event === "Gachi");
				if (subs.length === 0) {
					return;
				}

				const track = await sb.Query.getRow("data", "Gachi");
				await track.load(Number(query.ID));

				let channelUsers = new Map();
				for (const sub of subs) {
					if (!channelUsers.has(sub.Channel)) {
						channelUsers.set(sub.Channel, []);
					}

					const userData = await sb.User.get(sub.User_Alias, true);
					channelUsers.get(sub.Channel).push(userData.Name);
				}

				for (const [channelID, users] of channelUsers) {
					const channelData = sb.Channel.get(channelID);
					const link = (channelData.Links_Allowed)
						? "https://supinic.com/gachi/detail/" + track.values.ID
						: "supinic website detail ID: " + track.values.ID;

					let msg = [
						"PagChomp",
						users.map(user => "@" + user).join(", "),
						"!!",
						"New gachi has been added to the list!",
						link,
						track.values.Name + " by " + track.values.Author
					].join(" ");

					msg = await sb.Master.prepareMessage(msg, channelData);
					await channelData.send(msg);
				}
			}
			else if (query.type === "reload") {
				if (query.module === "afk") {
					await sb.AwayFromKeyboard.reloadData();
				}
				else if (query.module === "reminder") {
					await sb.Reminder.reloadData();
				}
				else if (query.module === "user") {
					if (typeof query.username !== "string") {
						throw new sb.Error({
							message: "No valid user identifier provided",
							args: query
						});
					}

					await sb.User.invalidateUserCache(query.username);
				}
				else {
					throw new sb.Error({
						message: "Unrecognized module", args: query.module
					});
				}
			}
			else if (query.type === "queue") {
				const params = new sb.URLParams().set("type", "queue");
				await this.send(params, {
					current: await sb.VideoLANConnector.currentlyPlayingData(),
					queue: sb.VideoLANConnector.videoQueue
				});
			}

			res.end("OK");
		}

		async processSiteRequest (req, res) {
			const query = url.parse(req.url,true).query;
			if (query.type === "queue") {
				const data = [];

				req.on("data", chunk => data.push(chunk));
				req.on("end", () => {
					if (this.pending.queue instanceof sb.Promise) {
						this.pending.queue.resolve(JSON.parse(data));
					}
				});
			}

			res.end("OK");
		}

		async send (urlParams = "", data) {
			if (urlParams && !(urlParams instanceof sb.URLParams)) {
				throw new sb.Error("URL Params must be sb.URLParams if used");
			}

			const targetPort = (process.env.PROJECT_TYPE === "bot")
				? sb.Config.get("INTERNAL_REQUEST_PORT_SITE")
				: sb.Config.get("INTERNAL_REQUEST_PORT_BOT");

			const requestObject = {
				method: "POST",
				url: "http://localhost:" + targetPort + "/?" + urlParams.toString()
			};

			if (data) {
				requestObject.json = data;
			}

			sb.Got(requestObject);
		}

		addSubscription (valuesObject) {
			this.subscriptions.push(valuesObject);
		}

		removeSubscription (ID) {
			const index = this.subscriptions.findIndex(i => i.ID === ID);
			if (index !== -1) {
				this.subscriptions.splice(index, 1);
			}
		}
		get modulePath () { return "internal-request"; }

		destroy () {
			this.data = null;
		}
	};
});