module.exports = {
  config: {
    name: "uid",
    aliases: ["আইডি"],
    description: "ইউজার আইডি বের করে"
  },
  run: async ({ api, event, args }) => {
    let targetID;
    if (event.messageReply && event.messageReply.senderID) {
      targetID = event.messageReply.senderID;
    } else if (Object.keys(event.mentions || {}).length > 0) {
      targetID = Object.keys(event.mentions)[0];
    } else {
      targetID = event.senderID;
    }

    const info = await api.getUserInfo(targetID);
    const name = info[targetID]?.name || "অজানা";

    api.sendMessageMqtt(
      `👤 নাম: ${name}\n🆔 UID: ${targetID}`,
      event.threadID
    );
  }
};
