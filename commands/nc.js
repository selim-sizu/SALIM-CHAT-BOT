const fs = require("fs-extra");
const path = require("path");

const DB_PATH = path.join(__dirname, "..", "custom_replies.json");

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
    description: "Add custom auto-reply",
    category: "admin",
    cooldowns: 3
  },

  run: async ({ api, event, args, config }) => {
    const { threadID, messageID, senderID } = event;

    // ⚠️ শুধু মালিক ও অ্যাডমিনরা পারবে
    const admins = config.adminIDs || [];
    if (senderID !== config.ownerID && !admins.includes(senderID)) {
      return sendSafe(api, threadID, "❌ এই কমান্ড শুধু অ্যাডমিনরা ব্যবহার করতে পারবে।", messageID);
    }

    // ফরম্যাট: /nc [trigger], [reply]
    const input = args.join(" ");
    if (!input.includes(",")) {
      return sendSafe(api, threadID, "⚠️ ফরম্যাট ভুল!\n\nসঠিক ব্যবহার:\n/nc trigger, reply\n\nউদাহরণ:\n/nc hi, এতো hi করিস কেনো 👅🤌", messageID);
    }

    const [trigger, ...replyParts] = input.split(",");
    const reply = replyParts.join(",").trim();
    const cleanTrigger = trigger.trim().toLowerCase();

    if (!cleanTrigger || !reply) {
      return sendSafe(api, threadID, "⚠️ ট্রিগার বা রিপ্লাই খালি রাখা যাবে না।", messageID);
    }

    // ডেটাবেস ফাইল তৈরি বা আপডেট
    await fs.ensureDir(path.dirname(DB_PATH));
    let db = {};
    if (fs.existsSync(DB_PATH)) {
      try { db = JSON.parse(fs.readFileSync(DB_PATH, "utf8")); } catch (_) {}
    }

    db[cleanTrigger] = reply;
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));

    return sendSafe(
      api,
      threadID,
      `✅ নতুন কাস্টম রিপ্লাই যোগ হয়েছে!\n\n👉 কেউ "${cleanTrigger}" লিখলে বট রিপ্লাই দেবে:\n"${reply}"`,
      messageID
    );
  }
};
