const fs = require("fs-extra");
const path = require("path");

const DB_PATH = path.join(__dirname, "..", "custom_commands.json");

function sendSafe(api, threadID, message, messageID) {
  return api.sendMessageMqtt(message, threadID, messageID)
    .catch(err => console.error("❌ rmc send failed:", err.message));
}

module.exports = {
  config: {
    name: "rmc",
    aliases: ["removecommand"],
    version: "1.0.0",
    credits: "Selim sizu",
    description: "Remove custom command",
    category: "admin",
    cooldowns: 3
  },

  run: async ({ api, event, args, config }) => {
    const { threadID, messageID, senderID } = event;
    const admins = config.adminIDs || [];

    if (senderID !== config.ownerID && !admins.includes(senderID)) {
      return sendSafe(api, threadID, "❌ এই কমান্ড শুধু অ্যাডমিনরা ব্যবহার করতে পারবে।", messageID);
    }

    const cmdName = args.join(" ").trim().toLowerCase();
    if (!cmdName) {
      return sendSafe(api, threadID, `⚠️ ব্যবহার:\n/rmc menu`, messageID);
    }

    if (!fs.existsSync(DB_PATH)) {
      return sendSafe(api, threadID, "❌ কোনো কাস্টম কমান্ড সেভ করা নেই।", messageID);
    }

    let db = {};
    try { db = JSON.parse(fs.readFileSync(DB_PATH, "utf8")); } catch (_) {}

    if (!db[cmdName]) {
      return sendSafe(api, threadID, `❌ "${cmdName}" নামে কোনো কাস্টম কমান্ড নেই।`, messageID);
    }

    delete db[cmdName];
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));

    return sendSafe(api, threadID, `✅ 𝐂𝐨𝐦𝐦𝐚𝐧𝐝 𝐑𝐞𝐦𝐨𝐯𝐞𝐝 ✓\n\n🎯 "${cmdName}" সফলভাবে ডিলিট করা হয়েছে।`, messageID);
  }
};
