function sendSafe(api, threadID, message, messageID) {
  return api.sendMessageMqtt(message, threadID, messageID)
    .catch(err => console.error("❌ prefix send failed:", err.message));
}

module.exports = {
  config: {
    name: "prefix",
    aliases: ["pref", "myprefix"],
    version: "1.0.0",
    credits: "Selim sizu",
    description: "Show bot prefix and group info",
    category: "system",
    cooldowns: 3
  },

  run: async ({ api, event, config }) => {
    const { threadID, messageID } = event;

    const prefix = config?.prefix || "/";
    const botName = config?.botName || "SALIM-CHAT-BOT";

    // 📛 গ্রুপের নাম বের করা
    let groupName = "Unknown Group";
    try {
      const info = await api.getThreadInfo(threadID);
      if (info?.threadName) groupName = info.threadName;
    } catch (e) {
      console.error("⚠️ getThreadInfo failed:", e.message);
    }

    const body = `🤖 𝗛𝗲𝗹𝗹𝗼! 𝗜'𝗺 ${botName} 👋

𝗛𝗲𝗿𝗲'𝘀 𝗺𝘆 𝗯𝗮𝘀𝗶𝗰 𝗶𝗻𝗳𝗼:

⚙️ 𝗣𝗿𝗲𝗳𝗶𝘅: ${prefix}
🤖 𝗕𝗼𝘁 𝗡𝗮𝗺𝗲: ${botName}
➤ 𝗕𝗼𝘅 𝗣𝗿𝗲𝗳𝗶𝘅: ${prefix}
➤ 𝗕𝗼𝘅 𝗡𝗮𝗺𝗲: ${groupName}
➤ 𝗔𝗱𝗺𝗶𝗻: 𝗦𝗲𝗹𝗶𝗺 𝗦𝗶𝘇𝘂 𓆩🧸𓆪

💫 𝗧𝗵𝗮𝗻𝗸𝘀 𝗳𝗼𝗿 𝘂𝘀𝗶𝗻𝗴 ${botName} ❤️`;

    return sendSafe(api, threadID, body, messageID);
  }
};
