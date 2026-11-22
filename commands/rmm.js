const fs = require("fs-extra");
const path = require("path");

const DB_PATH = path.join(__dirname, "..", "custom_messages.json");

function sendSafe(api, threadID, message, messageID) {
  return api.sendMessageMqtt(message, threadID, messageID)
    .catch(err => console.error("❌ rmm send failed:", err.message));
}

module.exports = {
  config: {
    name: "rmm",
    aliases: ["removereply"],
    version: "1.0.0",
    credits: "Selim sizu",
    description: "Remove custom message reply",
    category: "admin",
    cooldowns: 3
  },

  run: async ({ api, event, args, config }) => {
    const { threadID, messageID, senderID } = event;
    const admins = config.adminIDs || [];

    if (senderID !== config.ownerID && !admins.includes(senderID)) {
      return sendSafe(api, threadID, "❌ এই কমান্ড শুধু অ্যাডমিনরা ব্যবহার করতে পারবে।", messageID);
    }

    const trigger = args.join(" ").trim().toLowerCase();
    if (!trigger) {
      return sendSafe(api, threadID, "⚠️ ব্যবহার:\n/rmm hi", messageID);
    }

    if (!fs.existsSync(DB_PATH)) {
      return sendSafe(api, threadID, "❌ কোনো কাস্টম মেসেজ সেভ করা নেই।", messageID);
    }

    let db = {};
    try { db = JSON.parse(fs.readFileSync(DB_PATH, "utf8")); } catch (_) {}

    if (!db[trigger]) {
      return sendSafe(api, threadID, `❌ "${trigger}" নামে কোনো কাস্টম মেসেজ নেই।`, messageID);
    }

    delete db[trigger];
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));

    return sendSafe(api, threadID, `✅ 𝐌𝐞𝐬𝐬𝐚𝐠𝐞 𝐑𝐞𝐦𝐨𝐯𝐞𝐝 ✓\n\n🎯 "${trigger}" সফলভাবে ডিলিট করা হয়েছে।`, messageID);
  }
};
