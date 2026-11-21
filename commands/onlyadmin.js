const fs = require("fs-extra");
const path = require("path");

const CONFIG_PATH = path.join(__dirname, "..", "config.json");

function sendSafe(api, threadID, message, messageID) {
  return api.sendMessageMqtt(message, threadID, messageID)
    .catch(err => console.error("❌ onlyadmin send failed:", err.message));
}

module.exports = {
  config: {
    name: "onlyadmin",
    aliases: ["adminonly", "lockbot"],
    version: "1.0.0",
    credits: "Selim sizu",
    description: "Admin only mode toggle",
    category: "Admin",
    usages: "onlyadmin [on/off]",
    cooldowns: 0
  },

  run: async ({ api, event, args, config }) => {
    const { threadID, messageID, senderID } = event;

    // শুধু মালিক বা অ্যাডমিনরা এই কমান্ড চালাতে পারবে
    const isAdmin = senderID === config.ownerID || (config.adminIDs || []).includes(senderID);
    if (!isAdmin) {
      return sendSafe(api, threadID, "❌ এই কমান্ড শুধু বটের অ্যাডমিনরা ব্যবহার করতে পারবে।", messageID);
    }

    const action = (args[0] || "").toLowerCase();
    const currentStatus = !!config.adminOnly;

    if (action !== "on" && action !== "off") {
      return sendSafe(api, threadID, "⚠️ 𝗨𝘀𝗮𝗴𝗲: 𝗼𝗻𝗹𝘆𝗮𝗱𝗺𝗶𝗻 𝗼𝗻/𝗼𝗳𝗳", messageID);
    }

    const requestedStatus = action === "on";

    if (currentStatus === requestedStatus) {
      return sendSafe(
        api,
        threadID,
        requestedStatus
          ? "𝗔𝗱𝗺𝗶𝗻 𝗢𝗻𝗹𝘆 𝗠𝗼𝗱𝗲\n\n✓ 𝗔𝗹𝗿𝗲𝗮𝗱𝘆 𝗔𝗰𝘁𝗶𝘃𝗲\n𝗔𝗱𝗺𝗶𝗻 𝗺𝗼𝗱𝗲 𝗮𝗴𝗲𝗶 𝗢𝗡 𝗮𝗰𝗵𝗲."
          : "𝗔𝗱𝗺𝗶𝗻 𝗢𝗻𝗹𝘆 𝗠𝗼𝗱𝗲\n\n× 𝗔𝗹𝗿𝗲𝗮𝗱𝘆 𝗗𝗶𝘀𝗮𝗯𝗹𝗲𝗱\n𝗔𝗱𝗺𝗶𝗻 𝗺𝗼𝗱𝗲 𝗮𝗴𝗲𝗶 𝗢𝗙𝗙 𝗮𝗰𝗵𝗲.",
        messageID
      );
    }

    // config.json আপডেট
    config.adminOnly = requestedStatus;

    try {
      const rawConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
      rawConfig.adminOnly = requestedStatus;
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(rawConfig, null, 2));
    } catch (e) {
      console.error("❌ config save failed:", e.message);
      return sendSafe(api, threadID, "❌ config.json আপডেট করা যায়নি।", messageID);
    }

    return sendSafe(
      api,
      threadID,
      requestedStatus
        ? "🔰𝗔𝗱𝗺𝗶𝗻 𝗢𝗻𝗹𝘆 𝗠𝗼𝗱𝗲\n\n● 𝗦𝘁𝗮𝘁𝘂𝘀: 𝗔𝗖𝗧𝗜𝗩𝗘\n✓ 𝗔𝗰𝗰𝗲𝘀𝘀: 𝗦𝗵𝘂𝗱𝗵𝘂 𝗮𝗱𝗺𝗶𝗻 𝗱𝗲𝗿 𝗷𝗼𝗻𝗻𝗼✅"
        : "🔰𝗔𝗱𝗺𝗶𝗻 𝗢𝗻𝗹𝘆 𝗠𝗼𝗱𝗲\n\n● 𝗦𝘁𝗮𝘁𝘂𝘀: 𝗗𝗜𝗦𝗔𝗕𝗟𝗘𝗗\n✓ 𝗔𝗰𝗰𝗲𝘀𝘀: 𝗦𝗵𝗼𝗯𝗮𝗿 𝗷𝗼𝗻𝗻𝗼 𝗼𝗽𝗲𝗻✅",
      messageID
    );
  }
};
