const fs = require("fs-extra");
const path = require("path");

const DB_PATH = path.join(__dirname, "..", "custom_messages.json");

function sendSafe(api, threadID, message, messageID) {
  return api.sendMessageMqtt(message, threadID, messageID)
    .catch(err => console.error("❌ nc send failed:", err.message));
}

module.exports = {
  config: {
    name: "nc",
    aliases: ["newreply", "addreply"],
    version: "1.0.0",
    credits: "Selim sizu",
    description: "Add custom message auto-reply",
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
      return sendSafe(api, threadID, "⚠️ Invalid format!\n\nUsage:\n/nc trigger, reply\n\nExample:\n/nc hi, এতো hi করিস কেনো 👅🤌", messageID);
    }

    const [trigger, ...replyParts] = input.split(",");
    const reply = replyParts.join(",").trim();
    const cleanTrigger = trigger.trim().toLowerCase();

    if (!cleanTrigger || !reply) {
      return sendSafe(api, threadID, "⚠️ Trigger or reply cannot be empty.", messageID);
    }

    await fs.ensureDir(path.dirname(DB_PATH));
    let db = {};
    if (fs.existsSync(DB_PATH)) {
      try { db = JSON.parse(fs.readFileSync(DB_PATH, "utf8")); } catch (_) {}
    }

    // 🌟 চেক করা হচ্ছে আগে থেকেই আছে কিনা
    if (db[cleanTrigger]) {
      if (db[cleanTrigger] === reply) {
        return sendSafe(api, threadID, `⚠️ 𝗔𝗹𝗿𝗲𝗮𝗱𝘆 𝗘𝘅𝗶𝘀𝘁𝘀 ✓\n\nThe reply for "${cleanTrigger}" is already the same.`, messageID);
      } else {
        // রিপ্লাই আলাদা হলে আপডেট হবে
        db[cleanTrigger] = reply;
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
        return sendSafe(api, threadID, `✅ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲 𝗨𝗽𝗱𝗮𝘁𝗲𝗱 ✓\n\n🎯 Trigger: ${cleanTrigger}\n💬 New Reply: ${reply}`, messageID);
      }
    }

    // নতুন হলে সেভ হবে
    db[cleanTrigger] = reply;
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));

    const successMsg = `╔══════════❖🌺❖══════════╗
║ ✅ 𝐌𝐞𝐬𝐬𝐚𝐠𝐞 𝐒𝐚𝐯𝐞𝐝 ✓
╠══════════❖🌺❖══════════╣
║ 🎯 𝐓𝐫𝐢𝐠𝐠𝐞𝐫 : ${cleanTrigger}
║ 💬 𝐑𝐞𝐩𝐥𝐲 : ${reply}
╚══════════❖🌺❖══════════╝`;

    return sendSafe(api, threadID, successMsg, messageID);
  }
};
