const fs = require("fs-extra");
const path = require("path");

const DB_PATH = path.join(__dirname, "..", "custom_commands.json");

function sendSafe(api, threadID, message, messageID) {
  return api.sendMessageMqtt(message, threadID, messageID)
    .catch(err => console.error("❌ ncmd send failed:", err.message));
}

module.exports = {
  config: {
    name: "ncmd",
    aliases: ["newcommand", "addcommand"],
    version: "1.0.0",
    credits: "Selim sizu",
    description: "Add custom prefix command",
    category: "admin",
    cooldowns: 3
  },

  run: async ({ api, event, args, config }) => {
    const { threadID, messageID, senderID } = event;
    const admins = config.adminIDs || [];

    if (senderID !== config.ownerID && !admins.includes(senderID)) {
      return sendSafe(api, threadID, "❌ This command is for admins only.", messageID);
    }

    const input = args.join(" ");
    if (!input.includes(",")) {
      return sendSafe(api, threadID, "⚠️ Invalid format!\n\nUsage:\n/ncmd command, reply\n\nExample:\n/ncmd menu, এই নাও আমার মেনু 🎉", messageID);
    }

    const [cmdName, ...replyParts] = input.split(",");
    const reply = replyParts.join(",").trim();
    const cleanCmd = cmdName.trim().toLowerCase();

    if (!cleanCmd || !reply) {
      return sendSafe(api, threadID, "⚠️ Command or reply cannot be empty.", messageID);
    }

    await fs.ensureDir(path.dirname(DB_PATH));
    let db = {};
    if (fs.existsSync(DB_PATH)) {
      try { db = JSON.parse(fs.readFileSync(DB_PATH, "utf8")); } catch (_) {}
    }

    // 🌟 চেক করা হচ্ছে আগে থেকেই আছে কিনা
    if (db[cleanCmd]) {
      if (db[cleanCmd] === reply) {
        return sendSafe(api, threadID, `⚠️ 𝗔𝗹𝗿𝗲𝗮𝗱𝘆 𝗘𝘅𝗶𝘀𝘁𝘀 ✓\n\nThe reply for command "${config.prefix}${cleanCmd}" is already the same.`, messageID);
      } else {
        // রিপ্লাই আলাদা হলে আপডেট হবে
        db[cleanCmd] = reply;
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
        return sendSafe(api, threadID, `✅ 𝗖𝗼𝗺𝗺𝗮𝗻𝗱 𝗨𝗽𝗱𝗮𝘁𝗲𝗱 ✓\n\n🎯 Command: ${config.prefix}${cleanCmd}\n💬 New Reply: ${reply}`, messageID);
      }
    }

    // নতুন হলে সেভ হবে
    db[cleanCmd] = reply;
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));

    const successMsg = `╔══════════❖🌺❖══════════╗
║ ✅ 𝐂𝐨𝐦𝐦𝐚𝐧𝐝 𝐒𝐚𝐯𝐞𝐝 ✓
╠══════════❖🌺❖══════════╣
║ 🎯 𝐂𝐨𝐦𝐦𝐚𝐧𝐝 : ${config.prefix}${cleanCmd}
║ 💬 𝐑𝐞𝐩𝐥𝐲 : ${reply}
╚══════════❖🌺❖══════════╝`;

    return sendSafe(api, threadID, successMsg, messageID);
  }
};
