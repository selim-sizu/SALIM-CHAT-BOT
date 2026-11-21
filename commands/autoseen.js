const fs = require("fs-extra");
const path = require("path");

// cache ফোল্ডারের ভেতরে স্ট্যাটাস ফাইল রাখবে
const cacheDir = path.join(__dirname, "..", "cache");
const statusPath = path.join(cacheDir, "autoseen.txt");

// ফোল্ডার না থাকলে তৈরি করবে এবং ডিফল্ট false রাখবে
if (!fs.existsSync(cacheDir)) fs.ensureDirSync(cacheDir);
if (!fs.existsSync(statusPath)) fs.writeFileSync(statusPath, "false");

module.exports = {
  config: {
    name: "autoseen",
    aliases: ["seen"],
    version: "1.0.0",
    credits: "Selim sizu",
    description: "Auto seen messages",
    category: "tools",
    cooldowns: 3
  },

  // 🌟 এই ফাংশনটি index.js থেকে প্রতিটি মেসেজে ট্রিগার হবে
  run: async ({ api, event, args, config }) => {
    const { threadID, messageID, senderID } = event;

    // শুধু মালিক বা অ্যাডমিনরা এই কমান্ড চালাতে পারবে
    const isAdmin = senderID === config.ownerID || (config.adminIDs || []).includes(senderID);
    if (!isAdmin) {
      return api.sendMessageMqtt("❌ এই কমান্ড শুধু বটের অ্যাডমিনরা ব্যবহার করতে পারবে।", threadID, messageID)
        .catch(err => console.error(err.message));
    }

    const action = (args[0] || "").toLowerCase();

    if (!["on", "off"].includes(action)) {
      return api.sendMessageMqtt(`⚠️ ব্যবহার: ${config.prefix}autoseen on/off`, threadID, messageID)
        .catch(err => console.error(err.message));
    }

    // স্ট্যাটাস সেভ করা
    fs.writeFileSync(statusPath, action === "on" ? "true" : "false");

    return api.sendMessageMqtt(`✅ Autoseen ${action} successfully.`, threadID, messageID)
      .catch(err => console.error(err.message));
  }
};
