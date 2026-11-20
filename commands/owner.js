function sendSafe(api, threadID, message) {
  return api.sendMessageMqtt(message, threadID)
    .catch(err => console.error("❌ owner send failed:", err.message));
}

module.exports = {
  config: {
    name: "owner",
    aliases: ["মালিক", "malik"],
    description: "বটের মালিকের তথ্য দেখায়"
  },
  run: async ({ api, event, config }) => {
    const ownerID = config.ownerID;

    if (!ownerID) {
      return sendSafe(api, event.threadID, "⚠️ config.json-এ ownerID সেট করা নেই।");
    }

    let name = "অজানা";
    try {
      const info = await api.getUserInfo(ownerID);
      if (info && info[ownerID] && info[ownerID].name) {
        name = info[ownerID].name;
      }
    } catch (e) {
      console.error("⚠️ getUserInfo failed:", e?.message || e);
    }

    return sendSafe(
      api,
      event.threadID,
      `👑 বটের মালিক\n📛 নাম: ${name}\n🆔 UID: ${ownerID}`
    );
  }
};
