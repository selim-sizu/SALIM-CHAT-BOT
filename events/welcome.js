const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    eventType: "event",
    name: "welcomeEvent"
  },
  run: async ({ api, event, config }) => {
    if (event.logMessageType !== "log:subscribe") return;

    const addedUsers = event.logMessageData.addedParticipants;
    for (const user of addedUsers) {
      const name = user.fullName || "নতুন সদস্য";
      const videoUrl = config.welcomeVideoURL;

      if (videoUrl) {
        api.sendMessageMqtt(
          {
            body: `🎉 ${name}, গ্রুপে স্বাগতম!`,
            attachment: fs.createReadStream(path.join(__dirname, "..", "welcome.mp4"))
          },
          event.threadID
        );
      } else {
        api.sendMessageMqtt(`🎉 ${name}, গ্রুপে স্বাগতম!`, event.threadID);
      }
    }
  }
};
