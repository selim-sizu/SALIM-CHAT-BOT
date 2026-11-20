function sendSafe(api, threadID, message, messageID) {
  return api.sendMessageMqtt(message, threadID, messageID)
    .catch(err => console.error("❌ ping send failed:", err.message));
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  return [
    days ? `${days}d` : null,
    hours ? `${hours}h` : null,
    minutes ? `${minutes}m` : null,
    `${secs}s`
  ].filter(Boolean).join(" ");
}

module.exports = {
  config: {
    name: "ping",
    aliases: ["pong", "speed"],
    version: "1.0.0",
    credits: "Selim sizu",
    description: "Check bot response time and uptime",
    category: "System",
    usages: "ping",
    cooldowns: 3
  },

  run: async ({ api, event }) => {
    const started = Date.now();
    let messageLatency = 0;

    if (event.timestamp) {
      const eventTime =
        Number(event.timestamp) < 1000000000000
          ? Number(event.timestamp) * 1000
          : Number(event.timestamp);
      messageLatency = Math.max(0, Date.now() - eventTime);
    }

    const body = `🏓 𝗣𝗼𝗻𝗴!

⚡ 𝗥𝗲𝘀𝗽𝗼𝗻𝘀𝗲: ${Date.now() - started}ms
📡 𝗠𝗲𝘀𝘀𝗮𝗴𝗲 𝗟𝗮𝘁𝗲𝗻𝗰𝘆: ${messageLatency}ms
⏱️ 𝗨𝗽𝘁𝗶𝗺𝗲: ${formatUptime(process.uptime())}`;

    return sendSafe(api, event.threadID, body, event.messageID);
  }
};
