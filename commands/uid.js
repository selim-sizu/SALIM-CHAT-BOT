function sendSafe(api, threadID, message) {
  return api.sendMessageMqtt(message, threadID)
    .catch(err => console.error("❌ uid send failed:", err.message));
}

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
    } else if (event.mentions && Object.keys(event.mentions).length > 0) {
      targetID = Object.keys(event.mentions)[0];
    } else if (args[0] && /^\d+$/.test(args[0])) {
      targetID = args[0];
    } else {
      targetID = event.senderID;
    }

    let name = "অজানা";
    try {
      const info = await api.getUserInfo(targetID);
      if (info && info[targetID] && info[targetID].name) {
        name = info[targetID].name;
      }
    } catch (e) {
      console.error("⚠️ getUserInfo failed:", e?.message || e);
    }

    return sendSafe(
      api,
      event.threadID,
      `👤 নাম: ${name}\n🆔 UID: ${targetID}`
    );
  }
};
